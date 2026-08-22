#!/usr/bin/env node
import fs from 'node:fs';

const INPUT='loterias-ai/casino/jackpots/evidence/jpk-global-public-trigger-prior-v1.json';
const OUTPUT='loterias-ai/casino/jackpots/evidence/jpk-global-trigger-prior-analysis-v1.json';

export function median(xs){const a=[...xs].sort((x,y)=>x-y);if(!a.length)return null;const i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;}
export function analyzeTriggerPrior(doc){
  const byTier={};
  for(const w of doc.wins||[]){
    const cap=doc.capsGBP?.[w.tier];
    if(!Number.isFinite(cap)||cap<=0||!Number.isFinite(w.amountGBP)||w.amountGBP<=0)continue;
    (byTier[w.tier]??=[]).push(w.amountGBP/cap);
  }
  const tiers={};
  for(const [tier,positions] of Object.entries(byTier)){
    const sorted=[...positions].sort((a,b)=>a-b);
    tiers[tier]={
      n:sorted.length,
      minCapFraction:+sorted[0].toFixed(6),
      medianCapFraction:+median(sorted).toFixed(6),
      maxCapFraction:+sorted.at(-1).toFixed(6),
      positions:sorted.map(x=>+x.toFixed(6)),
      hazardFitAllowed:sorted.length>=20,
      reason:sorted.length>=20?'SAMPLE_SIZE_GATE_ONLY_NOT_MARKET_EQUIVALENCE':'INSUFFICIENT_SAMPLE_FOR_HAZARD_FIT'
    };
  }
  return {
    version:'jpk-global-trigger-prior-analysis-v1',
    sourceVersion:doc.version,
    tiers,
    interpretation:{
      royalPublicSampleDemonstratesEarlyDrops:(tiers.ROYAL?.minCapFraction??1)<0.5,
      nearCapDeterminismRejected:(tiers.ROYAL?.minCapFraction??1)<0.5,
      marketEquivalenceVerified:doc.spain?.marketEquivalent===true,
      economicPromotionAllowed:false,
      note:'Cross-market trigger positions may inform model class only. They do not set a Spain entry threshold.'
    },
    guards:{
      noSpainThresholdPromotion:true,
      noHazardFitUnlessTierNAtLeast20:true,
      realMoneyAllowed:false,
      stakeEUR:0
    }
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const doc=JSON.parse(fs.readFileSync(INPUT,'utf8'));
  const out=analyzeTriggerPrior(doc);
  fs.writeFileSync(OUTPUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify(out,null,2));
}
