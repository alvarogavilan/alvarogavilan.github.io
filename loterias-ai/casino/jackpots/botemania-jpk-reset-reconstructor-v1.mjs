#!/usr/bin/env node
import fs from 'node:fs';

const OBS='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const FAST='loterias-ai/casino/jackpots/evidence/botemania-jpk-fast-reset-ledger-v1.json';
const MBWB='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-mbwb-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-reset-reconstructor-v1.json';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const j=read(OBS)||{},fast=read(FAST)||{},mbwb=read(MBWB)||{};
const xs=(j.observations||[]).filter(o=>o?.labeledPots&&o.observedAt).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
const seedHyp={ROYAL:500,REGAL:5000};
const tiers=['ROYAL','REGAL'];
const sibling={ROYAL:'REGAL',REGAL:'ROYAL'};
const windows=[];
for(let i=1;i<xs.length;i++){
  const a=xs[i-1],b=xs[i],dt=(Date.parse(b.observedAt)-Date.parse(a.observedAt))/1000;if(!(dt>0))continue;
  for(const tier of tiers){
    const sib=sibling[tier],from=Number(a.labeledPots[tier]),to=Number(b.labeledPots[tier]),sibFrom=Number(a.labeledPots[sib]),sibTo=Number(b.labeledPots[sib]),kingFrom=Number(a.labeledPots.JACKPOT_KING),kingTo=Number(b.labeledPots.JACKPOT_KING);
    if(![from,to,sibFrom,sibTo,kingFrom,kingTo].every(Number.isFinite))continue;
    const drop=from-to;if(!(drop>0))continue;
    const sibGrowth=sibTo-sibFrom,kingGrowth=kingTo-kingFrom;
    const cleanSingleTierCandidate=sibGrowth>=0&&kingGrowth>=0;
    const lower=cleanSingleTierCandidate?from:null,upper=cleanSingleTierCandidate?from+sibGrowth:null,seed=seedHyp[tier],seedPoint=cleanSingleTierCandidate?from+sibGrowth-to+seed:null;
    windows.push({source:'PERSISTED_OBSERVER_WINDOWS',tier,fromObservedAt:a.observedAt,toObservedAt:b.observedAt,seconds:dt,fromEUR:+from.toFixed(2),toEUR:+to.toFixed(2),observedDropEUR:+drop.toFixed(2),siblingTier:sib,siblingGrowthEUR:+sibGrowth.toFixed(4),jackpotKingGrowthEUR:+kingGrowth.toFixed(4),cleanSingleTierCandidate,awardIntervalEUR:cleanSingleTierCandidate?{lower:+lower.toFixed(2),upper:+upper.toFixed(2),width:+Math.max(0,upper-lower).toFixed(4)}:null,seedHypothesisPointEstimateEUR:cleanSingleTierCandidate?+seedPoint.toFixed(2):null,seedHypothesisEUR:seed,assumptions:{singleResetWithinWindow:true,royalRegalEqualActiveAllocationWithinWindow:true,reserveAtResetUnknown:true,seedPointEstimateHypothesisOnly:true},usableForSpainHazardValidation:cleanSingleTierCandidate});
  }
}
const fastEvents=(Array.isArray(fast?.events)?fast.events:[]).filter(e=>['ROYAL','REGAL'].includes(e?.tier)&&e?.cleanSingleTierCandidate===true).map(e=>({source:'FAST_15S_RESET_LEDGER',tier:e.tier,fromObservedAt:e.fromObservedAt||null,toObservedAt:e.observedAt||null,seconds:e.fromObservedAt&&e.observedAt?(Date.parse(e.observedAt)-Date.parse(e.fromObservedAt))/1000:null,fromEUR:Number(e.fromEUR),toEUR:Number(e.toEUR),observedDropEUR:Number.isFinite(Number(e.fromEUR))&&Number.isFinite(Number(e.toEUR))?+(Number(e.fromEUR)-Number(e.toEUR)).toFixed(2):null,siblingTier:e.siblingTier||sibling[e.tier],siblingGrowthEUR:Number(e.siblingGrowthEUR),jackpotKingGrowthEUR:Number(e.jackpotKingGrowthEUR),cleanSingleTierCandidate:true,awardIntervalEUR:e.awardIntervalEUR||null,seedHypothesisPointEstimateEUR:null,seedHypothesisEUR:seedHyp[e.tier],assumptions:{singleResetWithinWindow:true,royalRegalEqualActiveAllocationWithinWindow:true,reserveAtResetUnknown:true,fastSamplingTargetSeconds:15},usableForSpainHazardValidation:true,eventId:e.eventId||null}));
const key=x=>`${x.tier}|${x.toObservedAt||x.fromObservedAt}|${Number(x.fromEUR).toFixed(2)}|${Number(x.toEUR).toFixed(2)}`;
const merged=new Map();for(const x of [...windows,...fastEvents]){const k=key(x),prior=merged.get(k);if(!prior||x.source==='FAST_15S_RESET_LEDGER')merged.set(k,x);}
const all=[...merged.values()].sort((a,b)=>Date.parse(a.toObservedAt||a.fromObservedAt)-Date.parse(b.toObservedAt||b.fromObservedAt));
const clean=all.filter(x=>x.cleanSingleTierCandidate);
const exactMbwb=mbwb?.decision?.exactSpainMbwbKnown===true;
const capEUR=exactMbwb?mbwb?.mustBeWonBeforeEUR:null;
const out={version:'botemania-jpk-reset-reconstructor-v1.1-fast-merged',generatedAt:new Date().toISOString(),operator:'botemania-es',sources:[OBS,FAST,MBWB],method:'MERGE_5MIN_INTERVAL_CENSORING_WITH_COMPACT_15S_RESET_EVENTS',evidenceBasis:'Royal and Regal share a prospectively validated network allocation; fast events reduce reset-window censoring while exact Spanish MBWB comes from the operator UI.',windows:all,summary:{detectedTierDrops:all.length,cleanSingleTierCandidates:clean.length,royal:clean.filter(x=>x.tier==='ROYAL').length,regal:clean.filter(x=>x.tier==='REGAL').length,fastCleanCandidates:clean.filter(x=>x.source==='FAST_15S_RESET_LEDGER').length,minimumCleanResetsForHazardFit:10,hazardFitReady:clean.length>=10,medianIntervalWidthEUR:clean.length?[...clean].map(x=>Number(x.awardIntervalEUR?.width)).filter(Number.isFinite).sort((a,b)=>a-b)[Math.floor(clean.map(x=>Number(x.awardIntervalEUR?.width)).filter(Number.isFinite).length/2)]??null:null},mbwb:{exactSpainMbwbKnown:exactMbwb,capEUR},decision:{exactSpainMbwbKnown:exactMbwb,hazardFitReady:clean.length>=10,exactHazardKnown:false,realMoneyAllowed:false},guards:{intervalCensoringPreserved:true,fastEventsDeduplicated:true,noSeedPointEstimateAsFact:true,noHazardFitBeforeMinimumResets:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,decision:out.decision},null,2));
