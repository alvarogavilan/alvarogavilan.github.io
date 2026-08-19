#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const PROTOCOL='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-protocol-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-status-v1.json';
const flow=read(FLOW)||{};
const protocol=read(PROTOCOL)||{};
const cfg=protocol.validation||{};
const frozenMs=Date.parse(protocol.frozenAt||'');
const all=Array.isArray(flow.intervals)?flow.intervals:[];
const future=all.filter(x=>{
  const from=Date.parse(x?.from||'');
  const d=x?.deltasEUR||{};
  return Number.isFinite(from)&&from>=frozenMs&&Number(d.JACKPOT_KING)>0&&Number(d.REGAL)>0&&Number(d.ROYAL)>0&&Number(x?.activePotGrowthEUR)>0;
});
const sum=k=>future.reduce((a,x)=>a+Number(x?.deltasEUR?.[k]||0),0);
const growth=future.reduce((a,x)=>a+Number(x?.activePotGrowthEUR||0),0);
const deltas={JACKPOT_KING:sum('JACKPOT_KING'),REGAL:sum('REGAL'),ROYAL:sum('ROYAL')};
const shares=growth>0?{
  JACKPOT_KING:deltas.JACKPOT_KING/growth,
  REGAL:deltas.REGAL/growth,
  ROYAL:deltas.ROYAL/growth
}:{JACKPOT_KING:null,REGAL:null,ROYAL:null};
const inBand=(v,b)=>Number.isFinite(Number(v))&&Array.isArray(b)&&Number(v)>=Number(b[0])&&Number(v)<=Number(b[1]);
const informative=future.filter(x=>Number(x?.activePotGrowthEUR)>=Number(cfg.informativeIntervalMinimumGrowthEUR||0));
const broad=cfg.broadPerIntervalBands||{};
const informativeInside=informative.filter(x=>{
  const s=x?.allocationShares||{};
  return inBand(s.JACKPOT_KING,broad.JACKPOT_KING)&&inBand(s.REGAL,broad.REGAL)&&inBand(s.ROYAL,broad.ROYAL);
});
const insideFraction=informative.length?informativeInside.length/informative.length:null;
const weightedBands=cfg.weightedShareBands||{};
const weightedPass=inBand(shares.JACKPOT_KING,weightedBands.JACKPOT_KING)&&inBand(shares.REGAL,weightedBands.REGAL)&&inBand(shares.ROYAL,weightedBands.ROYAL);
const symmetryDiff=Number.isFinite(shares.REGAL)&&Number.isFinite(shares.ROYAL)?Math.abs(shares.REGAL-shares.ROYAL):null;
const symmetryPass=Number.isFinite(symmetryDiff)&&symmetryDiff<=Number(cfg.maximumWeightedRegalRoyalDifference);
const enoughIntervals=future.length>=Number(cfg.minimumCleanIntervals||20);
const enoughGrowth=growth>=Number(cfg.minimumCumulativeActiveGrowthEUR||50);
const enoughInformative=informative.length>=Number(cfg.minimumInformativeIntervals||10);
const broadPass=Number.isFinite(insideFraction)&&insideFraction>=Number(cfg.minimumInformativeIntervalsInsideBroadBandFraction||0.8);
const complete=enoughIntervals&&enoughGrowth&&enoughInformative;
const pass=complete&&weightedPass&&symmetryPass&&broadPass;
let state='ACCUMULATING_FUTURE_INTERVALS';
if(complete&&!pass)state='VALIDATION_FAILED_FROZEN_CRITERIA';
if(pass)state='VALIDATION_PASSED_NETWORK_ALLOCATION';
const out={
  version:'botemania-jpk-allocation-prospective-status-v1',
  generatedAt:new Date().toISOString(),
  operator:'botemania-es',
  protocolFrozenAt:protocol.frozenAt||null,
  state,
  progress:{
    cleanFutureIntervals:future.length,
    targetCleanIntervals:Number(cfg.minimumCleanIntervals||20),
    cumulativeActiveGrowthEUR:+growth.toFixed(2),
    targetCumulativeActiveGrowthEUR:Number(cfg.minimumCumulativeActiveGrowthEUR||50),
    informativeIntervals:informative.length,
    targetInformativeIntervals:Number(cfg.minimumInformativeIntervals||10)
  },
  weightedAllocationShares:{
    JACKPOT_KING:Number.isFinite(shares.JACKPOT_KING)?+shares.JACKPOT_KING.toFixed(6):null,
    REGAL:Number.isFinite(shares.REGAL)?+shares.REGAL.toFixed(6):null,
    ROYAL:Number.isFinite(shares.ROYAL)?+shares.ROYAL.toFixed(6):null
  },
  weightedRegalRoyalDifference:Number.isFinite(symmetryDiff)?+symmetryDiff.toFixed(6):null,
  informativeIntervalsInsideBroadBand:informativeInside.length,
  informativeIntervalsInsideBroadBandFraction:Number.isFinite(insideFraction)?+insideFraction.toFixed(6):null,
  checks:{enoughIntervals,enoughGrowth,enoughInformative,weightedShareBands:weightedPass,regalRoyalSymmetry:symmetryPass,perIntervalBroadBand:broadPass},
  decision:{
    networkAllocationProspectivelyValidated:pass,
    perTitleContributionSplitProven:false,
    economicPromotionAllowedByThisAlone:false,
    realMoneyAllowed:false,
    automaticBettingAllowed:false
  },
  guards:{futureIntervalsOnly:true,noRetuning:true,networkLevelOnly:true,noBetting:true,realMoneyAllowed:false}
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
