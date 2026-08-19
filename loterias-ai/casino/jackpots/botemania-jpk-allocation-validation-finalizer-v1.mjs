#!/usr/bin/env node
import fs from 'node:fs';

const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const PROTOCOL='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-protocol-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-validation-result-v1.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

if(fs.existsSync(OUT)){
 const existing=read(OUT);
 if(existing?.frozen===true){console.log(JSON.stringify({state:'ALREADY_FROZEN',outcome:existing.outcome,frozenAt:existing.frozenAt},null,2));process.exit(0);}
}
const flow=read(FLOW),protocol=read(PROTOCOL),cfg=protocol?.validation||{};
const frozenMs=Date.parse(protocol?.frozenAt||'');
const clean=(Array.isArray(flow?.intervals)?flow.intervals:[]).filter(x=>{
 const from=Date.parse(x?.from||''),d=x?.deltasEUR||{};
 return Number.isFinite(from)&&from>=frozenMs&&Number(d.JACKPOT_KING)>0&&Number(d.REGAL)>0&&Number(d.ROYAL)>0&&Number(x?.activePotGrowthEUR)>0;
}).sort((a,b)=>Date.parse(a.from)-Date.parse(b.from));
const minN=Number(cfg.minimumCleanIntervals||20),minGrowth=Number(cfg.minimumCumulativeActiveGrowthEUR||50),minInfo=Number(cfg.minimumInformativeIntervals||10),infoMin=Number(cfg.informativeIntervalMinimumGrowthEUR||0);
let boundary=null,growth=0,info=0;
for(let i=0;i<clean.length;i++){
 growth+=Number(clean[i]?.activePotGrowthEUR||0);
 if(Number(clean[i]?.activePotGrowthEUR)>=infoMin)info++;
 if(i+1>=minN&&growth>=minGrowth&&info>=minInfo){boundary=clean.slice(0,i+1);break;}
}
if(!boundary){console.log(JSON.stringify({state:'NOT_COMPLETE',cleanFutureIntervals:clean.length,minimumCleanIntervals:minN,cumulativeActiveGrowthEUR:+growth.toFixed(2),minimumGrowthEUR:minGrowth,informativeIntervals:info,minimumInformativeIntervals:minInfo},null,2));process.exit(0);}
const sum=k=>boundary.reduce((a,x)=>a+Number(x?.deltasEUR?.[k]||0),0);
const boundaryGrowth=boundary.reduce((a,x)=>a+Number(x?.activePotGrowthEUR||0),0);
const deltas={JACKPOT_KING:sum('JACKPOT_KING'),REGAL:sum('REGAL'),ROYAL:sum('ROYAL')};
const shares={JACKPOT_KING:deltas.JACKPOT_KING/boundaryGrowth,REGAL:deltas.REGAL/boundaryGrowth,ROYAL:deltas.ROYAL/boundaryGrowth};
const inBand=(v,b)=>Number.isFinite(Number(v))&&Array.isArray(b)&&Number(v)>=Number(b[0])&&Number(v)<=Number(b[1]);
const informative=boundary.filter(x=>Number(x?.activePotGrowthEUR)>=infoMin);
const broad=cfg.broadPerIntervalBands||{};
const inside=informative.filter(x=>{const s=x?.allocationShares||{};return inBand(s.JACKPOT_KING,broad.JACKPOT_KING)&&inBand(s.REGAL,broad.REGAL)&&inBand(s.ROYAL,broad.ROYAL);});
const insideFraction=informative.length?inside.length/informative.length:null;
const wb=cfg.weightedShareBands||{};
const weightedPass=inBand(shares.JACKPOT_KING,wb.JACKPOT_KING)&&inBand(shares.REGAL,wb.REGAL)&&inBand(shares.ROYAL,wb.ROYAL);
const symmetryDiff=Math.abs(shares.REGAL-shares.ROYAL);
const symmetryPass=symmetryDiff<=Number(cfg.maximumWeightedRegalRoyalDifference);
const broadPass=Number.isFinite(insideFraction)&&insideFraction>=Number(cfg.minimumInformativeIntervalsInsideBroadBandFraction||0.8);
const passed=weightedPass&&symmetryPass&&broadPass;
const result={
 version:'botemania-jpk-allocation-validation-result-v1.1',frozen:true,frozenAt:new Date().toISOString(),protocolFrozenAt:protocol?.frozenAt||null,operator:'botemania-es',
 outcome:passed?'PASSED_NETWORK_ALLOCATION':'FAILED_FROZEN_CRITERIA',
 boundaryRule:'FIRST_CHRONOLOGICAL_BOUNDARY_SATISFYING_ALL_PREREGISTERED_MINIMUM_COUNTS_NO_OPTIONAL_STOPPING',
 boundarySnapshot:{firstFrom:boundary[0]?.from||null,lastTo:boundary.at(-1)?.to||null,cleanFutureIntervals:boundary.length,cumulativeActiveGrowthEUR:+boundaryGrowth.toFixed(2),informativeIntervals:informative.length,weightedAllocationShares:{JACKPOT_KING:+shares.JACKPOT_KING.toFixed(6),REGAL:+shares.REGAL.toFixed(6),ROYAL:+shares.ROYAL.toFixed(6)},weightedRegalRoyalDifference:+symmetryDiff.toFixed(6),informativeIntervalsInsideBroadBand:inside.length,informativeIntervalsInsideBroadBandFraction:Number.isFinite(insideFraction)?+insideFraction.toFixed(6):null,checks:{enoughIntervals:boundary.length>=minN,enoughGrowth:boundaryGrowth>=minGrowth,enoughInformative:informative.length>=minInfo,weightedShareBands:weightedPass,regalRoyalSymmetry:symmetryPass,perIntervalBroadBand:broadPass}},
 interpretation:{proves:passed?'Future clean network meter increments satisfy the preregistered network-level approximately 60/20/20 allocation criteria at the first completion boundary.':'The preregistered network-allocation criteria failed at the first completion boundary.',doesNotProve:['Exact Fishin Frenzy per-title contribution split','Exact Spain Royal/Regal MBWB','Exact jackpot hazard','Positive EV','Authorization to wager']},
 guards:{firstCompletionBoundary:true,postBoundaryIntervalsExcludedFromDecision:true,immutableSnapshot:true,noRetuning:true,noOptionalStopping:true,economicPromotionByThisResultAlone:false,realMoneyAllowed:false,automaticBettingAllowed:false}
};
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));