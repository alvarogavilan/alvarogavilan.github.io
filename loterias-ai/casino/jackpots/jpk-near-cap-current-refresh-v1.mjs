#!/usr/bin/env node
import fs from 'node:fs';

const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const clamp=q=>Math.max(0.0001,Math.min(0.9998,q));

export function refreshJpkNearCapCurrent(ev={},allNetwork={},generatedAt=new Date().toISOString()){
  if(ev?.model?.family!=='HIDDEN_DROP_THRESHOLD_BETA_ALPHA_1_ON_SEED_TO_CAP') throw new Error('unsupported JPK sensitivity model family');
  const observedAt=allNetwork?.observedAt||allNetwork?.generatedAt||null;
  const pots={
    JACKPOT_KING:finite(allNetwork?.currentByKey?.['blueprint:JACKPOTKING']?.amountEUR),
    REGAL:finite(allNetwork?.currentByKey?.['blueprint:JACKPOTKING_REGAL']?.amountEUR),
    ROYAL:finite(allNetwork?.currentByKey?.['blueprint:JACKPOTKING_ROYAL']?.amountEUR)
  };
  if(!observedAt||Object.values(pots).some(v=>v===null||v<=0)) throw new Error('incomplete exact Blueprint JPK live state');
  const baseRtp=finite(ev?.inputs?.baseRtp);
  const active=ev?.inputs?.activeContributionShares||{};
  const reserve=ev?.inputs?.reserveShares||{};
  const caps=ev?.inputs?.capHypothesisEUR||{};
  const seeds=ev?.inputs?.seedHypothesisEUR||{};
  const alphaGrid=Array.isArray(ev?.inputs?.alphaGrid)?ev.inputs.alphaGrid.map(Number).filter(Number.isFinite):[];
  if(baseRtp===null||alphaGrid.length===0) throw new Error('missing frozen model inputs');
  for(const k of ['ROYAL','REGAL']){
    if(finite(active?.[k])===null||finite(caps?.[k])===null||finite(seeds?.[k])===null||Number(caps[k])<=Number(seeds[k])) throw new Error(`invalid frozen ${k} inputs`);
  }
  const q={
    ROYAL:clamp((pots.ROYAL-Number(seeds.ROYAL))/(Number(caps.ROYAL)-Number(seeds.ROYAL))),
    REGAL:clamp((pots.REGAL-Number(seeds.REGAL))/(Number(caps.REGAL)-Number(seeds.REGAL)))
  };
  function potEv(k,progress,alpha){
    const seed=Number(seeds[k]),cap=Number(caps[k]),span=cap-seed,V=seed+progress*span,F=progress**alpha,f=alpha*progress**(alpha-1);
    const hazardPerStake=Number(active[k])/span*f/Math.max(1e-15,1-F);
    return {V,hazardPerStake,ev:V*hazardPerStake};
  }
  const kingBaselines={
    ZERO_CONSERVATIVE:0,
    ACTIVE_PLUS_RESERVE_STRUCTURAL:(finite(active?.JACKPOT_KING)??0)+(finite(reserve?.JACKPOT_KING)??0)
  };
  const scenarios=[];
  for(const [kingBaselineScenario,kingBaseline] of Object.entries(kingBaselines)){
    for(const alpha of alphaGrid){
      const r=potEv('ROYAL',q.ROYAL,alpha),g=potEv('REGAL',q.REGAL,alpha);
      scenarios.push({
        alpha,kingBaselineScenario,
        totalRtp:+(baseRtp+kingBaseline+r.ev+g.ev).toFixed(6),
        royalEv:+r.ev.toFixed(6),regalEv:+g.ev.toFixed(6),
        royalOnlyRtp:+(baseRtp+r.ev).toFixed(6),regalOnlyRtp:+(baseRtp+g.ev).toFixed(6)
      });
    }
  }
  const conservative=scenarios.filter(x=>x.kingBaselineScenario==='ZERO_CONSERVATIVE');
  const structural=scenarios.filter(x=>x.kingBaselineScenario==='ACTIVE_PLUS_RESERVE_STRUCTURAL');
  const robustConservativeScreenPass=conservative.length===alphaGrid.length&&conservative.every(x=>x.totalRtp>=1);
  const robustRoyalOnlyPass=conservative.length===alphaGrid.length&&conservative.every(x=>x.royalOnlyRtp>=1);
  const robustRegalOnlyPass=conservative.length===alphaGrid.length&&conservative.every(x=>x.regalOnlyRtp>=1);
  const worst=conservative.length?Math.min(...conservative.map(x=>x.totalRtp)):null;
  const best=conservative.length?Math.max(...conservative.map(x=>x.totalRtp)):null;
  const out=structuredClone(ev);
  out.version=`${String(ev.version||'botemania-jpk-near-cap-ev-scenarios-v1')}+live-current-refresh-v1`;
  out.generatedAt=generatedAt;
  out.current={
    observedAt,potsEUR:pots,sourceClass:'ALL_NETWORK_BLUEPRINT_EXACT_IDS',normalizedSeedToCap:q,scenarios,
    allModeledRtpBelowOne:{ZERO_CONSERVATIVE:conservative.every(x=>x.totalRtp<1),ACTIVE_PLUS_RESERVE_STRUCTURAL:structural.every(x=>x.totalRtp<1)},
    robustConservativeScreenPass,robustRoyalOnlyPass,robustRegalOnlyPass,
    worstConservativeRtp:worst===null?null:+worst.toFixed(6),bestConservativeRtp:best===null?null:+best.toFixed(6)
  };
  out.decision={...(ev.decision||{}),currentPositiveEvProven:false,currentScreenPass:robustConservativeScreenPass,currentRoyalOnlyScreenPass:robustRoyalOnlyPass,currentRegalOnlyScreenPass:robustRegalOnlyPass,liveCurrentRefreshOnly:true,realMoneyAllowed:false,automaticBettingAllowed:false};
  out.guards={...(ev.guards||{}),frozenModelInputsNotRetuned:true,thresholdSensitivityNotRetuned:true,liveRefreshDoesNotValidateSeed:true,liveRefreshDoesNotValidateHazard:true,noScreenPassAsProof:true,noBetting:true,realMoneyAllowed:false};
  return out;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const EV='loterias-ai/casino/jackpots/evidence/botemania-jpk-near-cap-ev-scenarios-v1.json';
  const LIVE='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
  const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
  const out=refreshJpkNearCapCurrent(read(EV),read(LIVE));
  fs.writeFileSync(EV,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({version:out.version,current:out.current,decision:out.decision,guards:{frozenModelInputsNotRetuned:out.guards.frozenModelInputsNotRetuned,liveRefreshDoesNotValidateHazard:out.guards.liveRefreshDoesNotValidateHazard,realMoneyAllowed:out.guards.realMoneyAllowed}},null,2));
}
