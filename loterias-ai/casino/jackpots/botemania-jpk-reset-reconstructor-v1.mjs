#!/usr/bin/env node
import fs from 'node:fs';

const OBS='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-reset-reconstructor-v1.json';
const j=JSON.parse(fs.readFileSync(OBS,'utf8'));
const xs=(j.observations||[]).filter(o=>o?.labeledPots&&o.observedAt).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
const seedHyp={ROYAL:500,REGAL:5000};
const tiers=['ROYAL','REGAL'];
const sibling={ROYAL:'REGAL',REGAL:'ROYAL'};
const windows=[];
for(let i=1;i<xs.length;i++){
  const a=xs[i-1],b=xs[i];
  const dt=(Date.parse(b.observedAt)-Date.parse(a.observedAt))/1000;
  if(!(dt>0))continue;
  for(const tier of tiers){
    const sib=sibling[tier];
    const from=Number(a.labeledPots[tier]),to=Number(b.labeledPots[tier]);
    const sibFrom=Number(a.labeledPots[sib]),sibTo=Number(b.labeledPots[sib]);
    const kingFrom=Number(a.labeledPots.JACKPOT_KING),kingTo=Number(b.labeledPots.JACKPOT_KING);
    if(![from,to,sibFrom,sibTo,kingFrom,kingTo].every(Number.isFinite))continue;
    const drop=from-to;
    if(!(drop>0))continue;
    const sibGrowth=sibTo-sibFrom;
    const kingGrowth=kingTo-kingFrom;
    const siblingStayedNondecreasing=sibGrowth>=0;
    const kingStayedNondecreasing=kingGrowth>=0;
    // If only one of Royal/Regal falls, equal-allocation evidence makes sibling growth a useful clock.
    // Without knowing the reserve value at the exact reset, the award is interval-censored:
    // from <= award <= from + siblingGrowth (single-reset/equal-allocation assumptions).
    const cleanSingleTierCandidate=siblingStayedNondecreasing&&kingStayedNondecreasing&&sibGrowth>=0;
    const lower=cleanSingleTierCandidate?from:null;
    const upper=cleanSingleTierCandidate?from+sibGrowth:null;
    const seed=seedHyp[tier];
    const seedPoint=cleanSingleTierCandidate?from+sibGrowth-to+seed:null;
    windows.push({
      tier,
      fromObservedAt:a.observedAt,toObservedAt:b.observedAt,seconds:dt,
      fromEUR:+from.toFixed(2),toEUR:+to.toFixed(2),observedDropEUR:+drop.toFixed(2),
      siblingTier:sib,siblingGrowthEUR:+sibGrowth.toFixed(4),jackpotKingGrowthEUR:+kingGrowth.toFixed(4),
      cleanSingleTierCandidate,
      awardIntervalEUR:cleanSingleTierCandidate?{lower:+lower.toFixed(2),upper:+upper.toFixed(2),width:+Math.max(0,upper-lower).toFixed(4)}:null,
      seedHypothesisPointEstimateEUR:cleanSingleTierCandidate?+seedPoint.toFixed(2):null,
      seedHypothesisEUR:seed,
      assumptions:{singleResetWithinWindow:true,royalRegalEqualActiveAllocationWithinWindow:true,reserveAtResetUnknown:true,seedPointEstimateHypothesisOnly:true},
      usableForSpainHazardValidation:cleanSingleTierCandidate
    });
  }
}
const clean=windows.filter(x=>x.cleanSingleTierCandidate);
const out={
  version:'botemania-jpk-reset-reconstructor-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',source:OBS,
  method:'INTERVAL_CENSOR_RESET_AWARD_USING_NONRESET_SIBLING_GROWTH',
  evidenceBasis:'Royal and Regal active meters have repeatedly shown approximately equal growth on Botemania and independent Jackpot King Deluxe control network.',
  windows,
  summary:{detectedTierDrops:windows.length,cleanSingleTierCandidates:clean.length,royal:clean.filter(x=>x.tier==='ROYAL').length,regal:clean.filter(x=>x.tier==='REGAL').length,medianIntervalWidthEUR:clean.length?[...clean].map(x=>x.awardIntervalEUR.width).sort((a,b)=>a-b)[Math.floor(clean.length/2)]:null},
  decision:{exactSpainMbwbKnown:false,exactHazardKnown:false,realMoneyAllowed:false},
  guards:{intervalCensoringPreserved:true,noSeedPointEstimateAsFact:true,noMultipleResetAssumptionHidden:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({summary:out.summary,cleanWindows:clean.slice(-10),decision:out.decision},null,2));
