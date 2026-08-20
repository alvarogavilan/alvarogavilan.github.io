#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const MBWB='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-mbwb-v1.json';
const HAZ='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-help-hazard-v1.json';
const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const CENSUS='loterias-ai/casino/jackpots/evidence/botemania-jpk-game-economics-census-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-shape-free-bound-v1.json';
const mbwb=read(MBWB)||{},haz=read(HAZ)||{},flow=read(FLOW)||{},census=read(CENSUS)||{};
const exactMbwb=mbwb?.decision?.exactSpainMbwbKnown===true;
const monotone=haz?.hazardEvidence?.qualitativeMonotonicIncreaseKnown===true;
const pots=flow?.latest?.potsEUR||{};
const caps={ROYAL:Number(mbwb?.mustBeWonBeforeEUR?.ROYAL),REGAL:Number(mbwb?.mustBeWonBeforeEUR?.REGAL)};
const belowCap=Number(pots.ROYAL)<caps.ROYAL&&Number(pots.REGAL)<caps.REGAL;
const rows=(Array.isArray(census?.rows)?census.rows:[]).map(r=>({slug:r.slug,title:r.title||null,baseRtpPct:Number(r.baseRtpPct)||null})).filter(r=>Number.isFinite(r.baseRtpPct));
const bestBase=rows.sort((a,b)=>b.baseRtpPct-a.baseRtpPct)[0]||null;
const theoremApplies=exactMbwb&&monotone&&belowCap;
const out={
 version:'botemania-jpk-shape-free-bound-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',
 purpose:'Determine what can be proved about current EV from exact Spanish MBWB plus monotone-increasing jackpot chance without assuming a parametric hazard family.',
 inputs:{exactSpainMbwbKnown:exactMbwb,qualitativeHazardDirectionKnown:monotone,currentPotsEUR:pots,capEUR:caps,currentStrictlyBelowCap:belowCap},
 result:{
   theoremApplies,
   robustIncrementalJackpotEvLowerBoundPerEUR:theoremApplies?0:null,
   reason:theoremApplies?'For any current value strictly below MBWB, the verified qualitative constraints still admit a nondecreasing hazard that places arbitrarily little win mass at or below the current value and concentrates the remaining mass later, including a forced terminal event near MBWB. Therefore qualitative monotonicity + MBWB alone cannot provide a positive lower bound on current jackpot EV.':null,
   bestPublishedBaseRtpGame:bestBase,
   positiveEvProvableFromQualitativeRulesAlone:false,
   providerFormulaOrEmpiricalHitLevelDataRequired:true
 },
 decision:{
   closesQualitativeOnlyShortcut:true,
   exactHazardStillRequiredForEconomicPromotion:true,
   currentPositiveEvProven:false,
   realMoneyAllowed:false,
   reason:'NO_SHAPE_FREE_POSITIVE_EV_LOWER_BOUND_BELOW_MBWB'
 },
 guards:{noParametricHazardAssumed:true,noForcedWinBeforeObservedCapConvertedToCurrentProbability:true,noOptionalStopping:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
