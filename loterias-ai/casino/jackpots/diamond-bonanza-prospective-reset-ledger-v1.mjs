#!/usr/bin/env node
import fs from 'node:fs';
import { classifyDiamondTransition } from './diamond-bonanza-reset-core-v1.mjs';

const FEED='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const STASIS='loterias-ai/edge-live/evidence/meter-stasis-ledger-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/diamond-bonanza-prospective-reset-ledger-v1.json';
const KEY='generic:diamondbonanza25BTM';
const RESET_SCALE_DROP_FRACTION=0.20;
const MIN_REPLICATED_RESET_CANDIDATES=3;
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};

const feed=read(FEED)||{};
const stasis=read(STASIS)||{};
const prior=read(OUT)||{};
const current=feed?.currentByKey?.[KEY]||null;
const observedAt=feed?.observedAt||feed?.generatedAt||new Date().toISOString();
const currentAmountEUR=Number(current?.amountEUR);
if(!current||!Number.isFinite(currentAmountEUR)) throw new Error(`Diamond Bonanza exact stable key missing: ${KEY}`);

const isPriorV1=prior?.version==='diamond-bonanza-prospective-reset-ledger-v1';
const frozenAt=isPriorV1?prior.frozenAt:observedAt;
const priorAmountEUR=isPriorV1?Number(prior?.lastObservation?.amountEUR):null;
const priorPositiveGrowthObserved=isPriorV1&&prior?.movement?.positiveGrowthObserved===true;
const transition=classifyDiamondTransition({
  priorAmountEUR,
  currentAmountEUR,
  priorPositiveGrowthObserved,
  resetScaleDropFraction:RESET_SCALE_DROP_FRACTION,
});

const priorObservedAt=isPriorV1?prior?.lastObservation?.observedAt:null;
const windowSeconds=priorObservedAt?Math.max(0,(Date.parse(observedAt)-Date.parse(priorObservedAt))/1000):null;
const positiveGrowthObserved=priorPositiveGrowthObserved||transition.classification==='POSITIVE_GROWTH';
const priorEvents=isPriorV1&&Array.isArray(prior.events)?prior.events:[];
const events=[...priorEvents];
if(isPriorV1&&['RESET_SCALE_DROP_CANDIDATE','RESET_SCALE_DROP_WITHOUT_PRIOR_POSITIVE_GROWTH','SMALL_DROP_CANDIDATE'].includes(transition.classification)){
  const event={
    eventId:`${KEY}|${Number(priorAmountEUR).toFixed(2)}|${currentAmountEUR.toFixed(2)}|${observedAt}`,
    observedAt,
    priorObservedAt,
    windowSeconds,
    key:KEY,
    previousEUR:priorAmountEUR,
    currentEUR:currentAmountEUR,
    ...transition,
    evidenceClass:'FROZEN_PROSPECTIVE_EXACT_STABLE_ID_TRANSITION',
    economicPromotionAllowed:false,
  };
  if(!events.some(x=>x.eventId===event.eventId)) events.push(event);
}

const usableResetCandidates=events.filter(e=>e.classification==='RESET_SCALE_DROP_CANDIDATE'&&e.usableForSeedInference===true);
const postResetUpperBounds=usableResetCandidates.map(e=>Number(e.postDropAmountUpperBoundForSeedEUR)).filter(Number.isFinite);
const meter=stasis?.meters?.[KEY]||null;
const dynamicFreshnessVerified=meter?.dynamicFreshness30m?.verified===true;
const observationCount=(isPriorV1?Number(prior?.monitor?.observationCount||0):0)+1;
const positiveGrowthCount=(isPriorV1?Number(prior?.movement?.positiveGrowthCount||0):0)+(transition.classification==='POSITIVE_GROWTH'?1:0);

const out={
  version:'diamond-bonanza-prospective-reset-ledger-v1',
  generatedAt:new Date().toISOString(),
  frozenAt,
  operator:'botemania-es',
  target:{game:'Danza de los Diamantes — Diamond Bonanza 25c',key:KEY,feedId:'diamondbonanza25BTM'},
  protocol:{
    frozenBeforeResetEvidence:true,
    resetScaleDropFraction:RESET_SCALE_DROP_FRACTION,
    requiresPriorPositiveGrowthForSeedInference:true,
    minimumReplicatedResetCandidates:MIN_REPLICATED_RESET_CANDIDATES,
    noOptionalStopping:true,
    noHistoricalEventsImported:true,
  },
  monitor:{
    observationCount,
    sourceObservedAt:observedAt,
    sourceHttpFresh:Boolean(feed?.source?.httpStatus===200),
    dynamicFreshnessVerified,
    dynamicFreshnessReason:meter?.dynamicFreshness30m?.reason??'STASIS_STATE_UNAVAILABLE',
    exactStableIdentityPresent:true,
  },
  movement:{
    positiveGrowthObserved,
    positiveGrowthCount,
    currentStasisSeconds:Number.isFinite(Number(meter?.stasisSeconds))?Number(meter.stasisSeconds):null,
    lastChangedAt:meter?.lastChangedAt??null,
  },
  lastObservation:{observedAt,amountEUR:currentAmountEUR,transitionFromPrior:transition},
  events:events.slice(-500),
  resetResearch:{
    resetScaleCandidateCount:events.filter(e=>String(e.classification).startsWith('RESET_SCALE_DROP')).length,
    usableResetCandidateCount:usableResetCandidates.length,
    replicatedForSeedResearch:usableResetCandidates.length>=MIN_REPLICATED_RESET_CANDIDATES,
    postResetUpperBoundsEUR:postResetUpperBounds,
    tightestObservedSeedUpperBoundEUR:postResetUpperBounds.length?Math.min(...postResetUpperBounds):null,
    seedPointEstimateEUR:null,
    seedVerified:false,
    jackpotWinVerified:false,
  },
  decision:{
    currentCounterDynamicallyVerified:dynamicFreshnessVerified,
    currentSpainSeedVerified:false,
    exactJackpotContributionVerified:false,
    breakEvenJackpotEURVerified:false,
    economicPromotionAllowed:false,
    realMoneyAllowed:false,
    reason:!positiveGrowthObserved?'POSITIVE_DYNAMIC_GROWTH_NOT_YET_OBSERVED':usableResetCandidates.length<MIN_REPLICATED_RESET_CANDIDATES?'INSUFFICIENT_PROSPECTIVE_RESET_CANDIDATES':'SEED_UPPER_BOUNDS_ONLY_NOT_EXACT_ECONOMICS',
  },
  guards:{
    publicFeedOnly:true,
    exactStableIdOnly:true,
    httpFreshnessDoesNotEqualDynamicFreshness:true,
    dropDoesNotEqualJackpotWin:true,
    postDropValueIsUpperBoundNotSeedPoint:true,
    noHistoricalGbpSubstitution:true,
    noBetting:true,
    realMoneyAllowed:false,
  },
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({frozenAt:out.frozenAt,monitor:out.monitor,movement:out.movement,lastObservation:out.lastObservation,resetResearch:out.resetResearch,decision:out.decision},null,2));
