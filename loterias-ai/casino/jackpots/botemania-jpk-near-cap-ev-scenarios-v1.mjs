#!/usr/bin/env node
import fs from 'node:fs';

const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-near-cap-ev-scenarios-v1.json';
const flow=JSON.parse(fs.readFileSync(FLOW,'utf8'));
const BASE_RTP=0.9332;
const caps={ROYAL:{seed:500,cap:3500},REGAL:{seed:5000,cap:35000}};
const shares=flow.aggregate?.allocationShares||{};
const active={ROYAL:0.0232*(shares.ROYAL??0.2),REGAL:0.0232*(shares.REGAL??0.2),JACKPOT_KING:0.0232*(shares.JACKPOT_KING??0.6)};
const reserve={ROYAL:0.0068*(shares.ROYAL??0.2),REGAL:0.0068*(shares.REGAL??0.2),JACKPOT_KING:0.0068*(shares.JACKPOT_KING??0.6)};
const alphaGrid=[0.25,0.5,0.75,1,1.25,1.5,2,3,4,5,7.5,10];
const clamp=q=>Math.max(0.0001,Math.min(.9998,q));
const currentQ={
  ROYAL:clamp((flow.latest.capScreen.ROYAL.currentEUR-caps.ROYAL.seed)/(caps.ROYAL.cap-caps.ROYAL.seed)),
  REGAL:clamp((flow.latest.capScreen.REGAL.currentEUR-caps.REGAL.seed)/(caps.REGAL.cap-caps.REGAL.seed))
};
function potEvAtProgress(k,q,alpha){
 const {seed,cap}=caps[k],span=cap-seed,V=seed+q*span;
 const F=q**alpha,f=alpha*q**(alpha-1);
 const hazardPerStake=active[k]/span*f/Math.max(1e-15,1-F);
 return {V,hazardPerStake,ev:V*hazardPerStake};
}
function total(qR,qG,alpha,kingBaseline){
 const r=potEvAtProgress('ROYAL',qR,alpha),g=potEvAtProgress('REGAL',qG,alpha);
 return {rtp:BASE_RTP+kingBaseline+r.ev+g.ev,royal:r,regal:g};
}
function oneTier(k,q,alpha){
 const p=potEvAtProgress(k,q,alpha);
 return {rtp:BASE_RTP+p.ev,pot:p};
}
function firstForwardCross(startQ,test){
 for(let i=Math.max(1,Math.ceil(startQ*10000));i<=9998;i++){
  const q=i/10000;
  if(test(q)>=1)return q;
 }
 return null;
}
const kingBaselines={ZERO_CONSERVATIVE:0,ACTIVE_PLUS_RESERVE_STRUCTURAL:active.JACKPOT_KING+reserve.JACKPOT_KING};
const curves=[];
for(const [kingName,kingBaseline] of Object.entries(kingBaselines)){
 for(const alpha of alphaGrid){
  const startBoth=Math.max(currentQ.ROYAL,currentQ.REGAL);
  const both=firstForwardCross(startBoth,q=>total(q,q,alpha,kingBaseline).rtp);
  const royalWithRegalCurrent=firstForwardCross(currentQ.ROYAL,q=>total(q,currentQ.REGAL,alpha,kingBaseline).rtp);
  const regalWithRoyalCurrent=firstForwardCross(currentQ.REGAL,q=>total(currentQ.ROYAL,q,alpha,kingBaseline).rtp);
  const royalOnly=firstForwardCross(currentQ.ROYAL,q=>oneTier('ROYAL',q,alpha).rtp);
  const regalOnly=firstForwardCross(currentQ.REGAL,q=>oneTier('REGAL',q,alpha).rtp);
  curves.push({
    alpha,kingBaselineScenario:kingName,kingBaselineRtp:kingBaseline,
    thresholdsNormalizedSeedToCap:{
      bothSameProgressForward:both,
      royalForwardWithRegalCurrent:royalWithRegalCurrent,
      regalForwardWithRoyalCurrent:regalWithRoyalCurrent,
      royalOnlyNoOtherJackpotCredit:royalOnly,
      regalOnlyNoOtherJackpotCredit:regalOnly
    },
    thresholdPotsEUR:{
      bothRoyal:both?+(caps.ROYAL.seed+both*(caps.ROYAL.cap-caps.ROYAL.seed)).toFixed(2):null,
      bothRegal:both?+(caps.REGAL.seed+both*(caps.REGAL.cap-caps.REGAL.seed)).toFixed(2):null,
      royalForwardWithRegalCurrent:royalWithRegalCurrent?+(caps.ROYAL.seed+royalWithRegalCurrent*(caps.ROYAL.cap-caps.ROYAL.seed)).toFixed(2):null,
      regalForwardWithRoyalCurrent:regalWithRoyalCurrent?+(caps.REGAL.seed+regalWithRoyalCurrent*(caps.REGAL.cap-caps.REGAL.seed)).toFixed(2):null,
      royalOnlyNoOtherJackpotCredit:royalOnly?+(caps.ROYAL.seed+royalOnly*(caps.ROYAL.cap-caps.ROYAL.seed)).toFixed(2):null,
      regalOnlyNoOtherJackpotCredit:regalOnly?+(caps.REGAL.seed+regalOnly*(caps.REGAL.cap-caps.REGAL.seed)).toFixed(2):null
    }
  });
 }
}
function rangeFor(scenario,key){
 const xs=curves.filter(x=>x.kingBaselineScenario===scenario).map(x=>x.thresholdsNormalizedSeedToCap[key]).filter(Number.isFinite);
 return xs.length?{min:+Math.min(...xs).toFixed(4),max:+Math.max(...xs).toFixed(4)}:null;
}
const currentScenarios=[];
for(const [kingName,kingBaseline] of Object.entries(kingBaselines))for(const alpha of alphaGrid){
 const t=total(currentQ.ROYAL,currentQ.REGAL,alpha,kingBaseline);
 const royalOnly=oneTier('ROYAL',currentQ.ROYAL,alpha);
 const regalOnly=oneTier('REGAL',currentQ.REGAL,alpha);
 currentScenarios.push({alpha,kingBaselineScenario:kingName,totalRtp:+t.rtp.toFixed(6),royalEv:+t.royal.ev.toFixed(6),regalEv:+t.regal.ev.toFixed(6),royalOnlyRtp:+royalOnly.rtp.toFixed(6),regalOnlyRtp:+regalOnly.rtp.toFixed(6)});
}
const conservativeAll=currentScenarios.filter(x=>x.kingBaselineScenario==='ZERO_CONSERVATIVE');
const structuralAll=currentScenarios.filter(x=>x.kingBaselineScenario==='ACTIVE_PLUS_RESERVE_STRUCTURAL');
const robustConservativeScreenPass=conservativeAll.length===alphaGrid.length&&conservativeAll.every(x=>x.totalRtp>=1);
const robustRoyalOnlyPass=conservativeAll.length===alphaGrid.length&&conservativeAll.every(x=>x.royalOnlyRtp>=1);
const robustRegalOnlyPass=conservativeAll.length===alphaGrid.length&&conservativeAll.every(x=>x.regalOnlyRtp>=1);
const worstConservativeRtp=conservativeAll.length?Math.min(...conservativeAll.map(x=>x.totalRtp)):null;
const bestConservativeRtp=conservativeAll.length?Math.max(...conservativeAll.map(x=>x.totalRtp)):null;
const out={
 version:'botemania-jpk-near-cap-ev-scenarios-v1.4',generatedAt:new Date().toISOString(),operator:'botemania-es',purpose:'SENSITIVITY_SCREEN_ONLY_NOT_A_WAGER_RECOMMENDATION',
 inputs:{baseRtp:BASE_RTP,activeContributionShares:active,reserveShares:reserve,capHypothesisEUR:{ROYAL:3500,REGAL:35000},seedHypothesisEUR:{ROYAL:500,REGAL:5000},capHypothesisVerifiedInBotemania:false,alphaGrid,stressExtensionReason:'Cross-network winner controls suggest testing hazards more concentrated near MBWB; control data remains discovery-only.'},
 model:{family:'HIDDEN_DROP_THRESHOLD_BETA_ALPHA_1_ON_SEED_TO_CAP',conditionalHazard:'activeContribution/span * alpha*q^(alpha-1)/(1-q^alpha)',warning:'Blueprint exact server-side hazard is unknown. This family tests robustness only; crossings are not evidence of real positive EV.',selectedGameContributionSplitAssumption:'Fishin Frenzy 2.32% active contribution is assumed to inherit the repeatedly observed approximately 60/20/20 Royal-Regal-King meter allocation. This is a research assumption, not provider-published per-tier split.',oneTierConservativeDefinition:'A Royal-only or Regal-only threshold gives zero EV credit to the other guaranteed pot and zero credit to the main Jackpot King. It asks whether that tier alone can bridge the 93.32% base RTP to 100% across the full alpha grid.'},
 current:{observedAt:flow.latest.observedAt,potsEUR:flow.latest.potsEUR,normalizedSeedToCap:currentQ,scenarios:currentScenarios,allModeledRtpBelowOne:{ZERO_CONSERVATIVE:conservativeAll.every(x=>x.totalRtp<1),ACTIVE_PLUS_RESERVE_STRUCTURAL:structuralAll.every(x=>x.totalRtp<1)},robustConservativeScreenPass,robustRoyalOnlyPass,robustRegalOnlyPass,worstConservativeRtp:worstConservativeRtp==null?null:+worstConservativeRtp.toFixed(6),bestConservativeRtp:bestConservativeRtp==null?null:+bestConservativeRtp.toFixed(6)},
 thresholdSensitivity:{
  ZERO_CONSERVATIVE:{
    bothSameProgressForward:rangeFor('ZERO_CONSERVATIVE','bothSameProgressForward'),
    royalForwardWithRegalCurrent:rangeFor('ZERO_CONSERVATIVE','royalForwardWithRegalCurrent'),
    regalForwardWithRoyalCurrent:rangeFor('ZERO_CONSERVATIVE','regalForwardWithRoyalCurrent'),
    royalOnlyNoOtherJackpotCredit:rangeFor('ZERO_CONSERVATIVE','royalOnlyNoOtherJackpotCredit'),
    regalOnlyNoOtherJackpotCredit:rangeFor('ZERO_CONSERVATIVE','regalOnlyNoOtherJackpotCredit')
  },
  ACTIVE_PLUS_RESERVE_STRUCTURAL:{
    bothSameProgressForward:rangeFor('ACTIVE_PLUS_RESERVE_STRUCTURAL','bothSameProgressForward'),
    royalForwardWithRegalCurrent:rangeFor('ACTIVE_PLUS_RESERVE_STRUCTURAL','royalForwardWithRegalCurrent'),
    regalForwardWithRoyalCurrent:rangeFor('ACTIVE_PLUS_RESERVE_STRUCTURAL','regalForwardWithRoyalCurrent'),
    royalOnlyNoOtherJackpotCredit:rangeFor('ACTIVE_PLUS_RESERVE_STRUCTURAL','royalOnlyNoOtherJackpotCredit'),
    regalOnlyNoOtherJackpotCredit:rangeFor('ACTIVE_PLUS_RESERVE_STRUCTURAL','regalOnlyNoOtherJackpotCredit')
  }
 },
 curves,
 decision:{currentPositiveEvProven:false,currentScreenPass:robustConservativeScreenPass,currentRoyalOnlyScreenPass:robustRoyalOnlyPass,currentRegalOnlyScreenPass:robustRegalOnlyPass,screenMeaning:'All ZERO_CONSERVATIVE alpha-grid scenarios are >=100% at the actual state under the unverified Spain cap and hazard-family assumptions. One-tier screens give zero jackpot EV credit to every other pot.',exactHazardKnown:false,exactSpainMbwbKnown:false,realMoneyAllowed:false,automaticBettingAllowed:false},
 guards:{forwardCrossingOnly:true,noSingleDistributionClaim:true,noCapHypothesisAsFact:true,noMainKingDoubleCount:true,oneTierRoutesGiveNoOtherJackpotCredit:true,crossNetworkControlsDiscoveryOnly:true,noScreenPassAsProof:true,noBetting:true,realMoneyAllowed:false}
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({current:out.current,thresholdSensitivity:out.thresholdSensitivity,decision:out.decision},null,2));
