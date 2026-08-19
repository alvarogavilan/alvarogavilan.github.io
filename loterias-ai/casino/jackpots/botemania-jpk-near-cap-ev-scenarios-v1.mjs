#!/usr/bin/env node
import fs from 'node:fs';

const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-near-cap-ev-scenarios-v1.json';
const flow=JSON.parse(fs.readFileSync(FLOW,'utf8'));
const BASE_RTP=0.9332;
const caps={ROYAL:{seed:500,cap:3500},REGAL:{seed:5000,cap:35000}}; // hypothesis only
const shares=flow.aggregate?.allocationShares||{};
const active={ROYAL:0.0232*(shares.ROYAL??0.2),REGAL:0.0232*(shares.REGAL??0.2),JACKPOT_KING:0.0232*(shares.JACKPOT_KING??0.6)};
const reserve={ROYAL:0.0068*(shares.ROYAL??0.2),REGAL:0.0068*(shares.REGAL??0.2),JACKPOT_KING:0.0068*(shares.JACKPOT_KING??0.6)};
const alphaGrid=[0.5,0.75,1,1.25,1.5,2,3];
function potEvAtProgress(k,q,alpha){
 const {seed,cap}=caps[k], span=cap-seed, V=seed+q*span;
 const F=q**alpha, f=alpha*q**(alpha-1);
 const hazardPerStake=active[k]/span * f/Math.max(1e-15,1-F);
 return {V,hazardPerStake,ev:V*hazardPerStake};
}
function total(qR,qG,alpha,kingBaseline){
 const r=potEvAtProgress('ROYAL',qR,alpha),g=potEvAtProgress('REGAL',qG,alpha);
 return {rtp:BASE_RTP+kingBaseline+r.ev+g.ev,royal:r,regal:g};
}
const kingBaselines={ZERO_CONSERVATIVE:0,ACTIVE_PLUS_RESERVE_STRUCTURAL:active.JACKPOT_KING+reserve.JACKPOT_KING};
const curves=[];
for(const [kingName,kingBaseline] of Object.entries(kingBaselines)){
 for(const alpha of alphaGrid){
  let firstBoth=null,firstRoyalOnly=null,firstRegalOnly=null;
  for(let i=1;i<=9998;i++){
   const q=i/10000;
   if(!firstBoth&&total(q,q,alpha,kingBaseline).rtp>=1) firstBoth=q;
   const currentQRegal=(Number(flow.latest?.capScreen?.REGAL?.currentEUR)-caps.REGAL.seed)/(caps.REGAL.cap-caps.REGAL.seed);
   const currentQRoyal=(Number(flow.latest?.capScreen?.ROYAL?.currentEUR)-caps.ROYAL.seed)/(caps.ROYAL.cap-caps.ROYAL.seed);
   if(!firstRoyalOnly&&total(q,Math.max(0,Math.min(.9998,currentQRegal)),alpha,kingBaseline).rtp>=1) firstRoyalOnly=q;
   if(!firstRegalOnly&&total(Math.max(0,Math.min(.9998,currentQRoyal)),q,alpha,kingBaseline).rtp>=1) firstRegalOnly=q;
   if(firstBoth&&firstRoyalOnly&&firstRegalOnly)break;
  }
  curves.push({alpha,kingBaselineScenario:kingName,kingBaselineRtp:kingBaseline,thresholdsNormalizedSeedToCap:{bothSameProgress:firstBoth,royalWithRegalCurrent:firstRoyalOnly,regalWithRoyalCurrent:firstRegalOnly},thresholdPotsEUR:{bothRoyal:firstBoth?+(caps.ROYAL.seed+firstBoth*(caps.ROYAL.cap-caps.ROYAL.seed)).toFixed(2):null,bothRegal:firstBoth?+(caps.REGAL.seed+firstBoth*(caps.REGAL.cap-caps.REGAL.seed)).toFixed(2):null,royalWithRegalCurrent:firstRoyalOnly?+(caps.ROYAL.seed+firstRoyalOnly*(caps.ROYAL.cap-caps.ROYAL.seed)).toFixed(2):null,regalWithRoyalCurrent:firstRegalOnly?+(caps.REGAL.seed+firstRegalOnly*(caps.REGAL.cap-caps.REGAL.seed)).toFixed(2):null}});
 }
}
function rangeFor(scenario,key){const xs=curves.filter(x=>x.kingBaselineScenario===scenario).map(x=>x.thresholdsNormalizedSeedToCap[key]).filter(Number.isFinite);return xs.length?{min:+Math.min(...xs).toFixed(4),max:+Math.max(...xs).toFixed(4)}:null;}
const currentQ={ROYAL:(flow.latest.capScreen.ROYAL.currentEUR-caps.ROYAL.seed)/(caps.ROYAL.cap-caps.ROYAL.seed),REGAL:(flow.latest.capScreen.REGAL.currentEUR-caps.REGAL.seed)/(caps.REGAL.cap-caps.REGAL.seed)};
const currentScenarios=[];
for(const [kingName,kingBaseline] of Object.entries(kingBaselines))for(const alpha of alphaGrid){const t=total(currentQ.ROYAL,currentQ.REGAL,alpha,kingBaseline);currentScenarios.push({alpha,kingBaselineScenario:kingName,totalRtp:+t.rtp.toFixed(6),royalEv:+t.royal.ev.toFixed(6),regalEv:+t.regal.ev.toFixed(6)});}
const out={version:'botemania-jpk-near-cap-ev-scenarios-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',purpose:'SENSITIVITY_SCREEN_ONLY_NOT_A_WAGER_RECOMMENDATION',inputs:{baseRtp:BASE_RTP,activeContributionShares:active,reserveShares:reserve,capHypothesisEUR:{ROYAL:3500,REGAL:35000},seedHypothesisEUR:{ROYAL:500,REGAL:5000},capHypothesisVerifiedInBotemania:false,alphaGrid},model:{family:'HIDDEN_DROP_THRESHOLD_BETA_ALPHA_1_ON_SEED_TO_CAP',conditionalHazard:'activeContribution/span * alpha*q^(alpha-1)/(1-q^alpha)',warning:'Blueprint exact server-side hazard is unknown. This family is used only to test whether a near-cap region is structurally robust across shapes.'},current:{observedAt:flow.latest.observedAt,potsEUR:flow.latest.potsEUR,normalizedSeedToCap:currentQ,scenarios:currentScenarios},thresholdSensitivity:{ZERO_CONSERVATIVE:{bothSameProgress:rangeFor('ZERO_CONSERVATIVE','bothSameProgress'),royalWithRegalCurrent:rangeFor('ZERO_CONSERVATIVE','royalWithRegalCurrent'),regalWithRoyalCurrent:rangeFor('ZERO_CONSERVATIVE','regalWithRoyalCurrent')},ACTIVE_PLUS_RESERVE_STRUCTURAL:{bothSameProgress:rangeFor('ACTIVE_PLUS_RESERVE_STRUCTURAL','bothSameProgress'),royalWithRegalCurrent:rangeFor('ACTIVE_PLUS_RESERVE_STRUCTURAL','royalWithRegalCurrent'),regalWithRoyalCurrent:rangeFor('ACTIVE_PLUS_RESERVE_STRUCTURAL','regalWithRoyalCurrent')}},curves,decision:{currentPositiveEvProven:false,exactHazardKnown:false,exactSpainMbwbKnown:false,realMoneyAllowed:false,automaticBettingAllowed:false},guards:{noSingleDistributionClaim:true,noCapHypothesisAsFact:true,noMainKingDoubleCount:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({current:out.current,thresholdSensitivity:out.thresholdSensitivity,decision:out.decision},null,2));