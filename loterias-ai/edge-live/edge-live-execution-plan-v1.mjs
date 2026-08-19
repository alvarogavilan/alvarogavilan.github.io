#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const GATE='loterias-ai/casino/evidence/five-euro-real-pilot-gate-v1.json';
const LIVE='loterias-ai/casino/jackpots/evidence/botemania-jpk-live-gate-v1.json';
const VALIDATION='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-validation-result-v1.json';
const PARAMS='loterias-ai/edge-live/evidence/botemania-fishin-execution-parameters-v1.json';
const STAKE_PROBE='loterias-ai/edge-live/evidence/botemania-fishin-public-stake-probe-v1.json';
const OUT='loterias-ai/edge-live/evidence/edge-live-execution-plan-v1.json';
const GAME_URL='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const MAX_SIGNAL_AGE_SECONDS=90;

const gate=read(GATE)||{}, live=read(LIVE)||{}, validation=read(VALIDATION)||{}, params=read(PARAMS)||{}, stakeProbe=read(STAKE_PROBE)||{};
const lane=(Array.isArray(gate?.lanes)?gate.lanes:[]).find(x=>x?.id==='botemania-jackpot-king')||{};
const structurePass=validation?.outcome==='PASSED_NETWORK_ALLOCATION' && validation?.frozen===true;
const economicPass=gate?.decision?.pilotAllowed===true && lane?.eligible===true && live?.decision?.economicPromotionCandidate===true;
const probedStake=stakeProbe?.decision?.exactStakePerSpinKnown===true?Number(stakeProbe?.decision?.minimumExactTotalBetEUR):null;
const configuredStake=params?.exactStakePerSpinKnown===true?Number(params?.stakePerSpinEUR):null;
const exactStakeValue=Number.isFinite(probedStake)&&probedStake>0?probedStake:(Number.isFinite(configuredStake)&&configuredStake>0?configuredStake:null);
const exactStakeKnown=Number.isFinite(exactStakeValue)&&exactStakeValue>0;
const exactStakeSource=Number.isFinite(probedStake)&&probedStake>0?'OFFICIAL_PUBLIC_STAKE_PROBE':(Number.isFinite(configuredStake)&&configuredStake>0?'VERIFIED_EXECUTION_PARAMETERS':null);
const sourceFresh=live?.current?.sourceFresh===true;
const observedAt=live?.current?.observedAt||null;
const observedMs=Date.parse(observedAt||'');
const expiresAt=Number.isFinite(observedMs)?new Date(observedMs+MAX_SIGNAL_AGE_SECONDS*1000).toISOString():null;
const signalAgeSeconds=Number.isFinite(observedMs)?Math.max(0,Math.floor((Date.now()-observedMs)/1000)):null;
const withinFreshExecutionWindow=Number.isFinite(signalAgeSeconds)&&signalAgeSeconds<=MAX_SIGNAL_AGE_SECONDS;
const ready=structurePass&&economicPass&&exactStakeKnown&&sourceFresh&&withinFreshExecutionWindow;
const stake=ready?exactStakeValue:0;
const budgetCeiling=Number(params?.maxTotalStakeEUR||5);
const maxTotal=ready?Math.min(Number(gate?.decision?.maxTotalStakeEUR||0),budgetCeiling):0;
const maxSpins=ready&&stake>0?Math.max(1,Math.floor(maxTotal/stake)):0;

const blockers=[];
if(!structurePass) blockers.push('STRUCTURAL_VALIDATION_NOT_PASSED');
if(!economicPass) blockers.push('ECONOMIC_GATE_NOT_PASSED');
if(!exactStakeKnown) blockers.push('EXACT_STAKE_PER_SPIN_NOT_VERIFIED');
if(!sourceFresh) blockers.push('SOURCE_NOT_FRESH');
if(Number.isFinite(signalAgeSeconds)&&signalAgeSeconds>MAX_SIGNAL_AGE_SECONDS) blockers.push('SIGNAL_EXPIRED');

const out={
  version:'edge-live-execution-plan-v1.2-exact-stake-probe',
  generatedAt:new Date().toISOString(),
  operator:'botemania-es',
  game:{id:'fishin-frenzy-jackpot-king',name:"Fishin' Frenzy: Jackpot King",url:GAME_URL},
  state:ready?'READY_TO_EXECUTE_MANUALLY':'NO_EXECUTION',
  order:{
    action:ready?'PLAY':'DO_NOT_PLAY',
    stakePerSpinEUR:stake,
    maxSpins,
    maxTotalStakeEUR:maxTotal,
    entryMode:ready?'OPEN_REAL_GAME_AND_EXECUTE_WITHIN_STATE_FRESHNESS_WINDOW':'WAIT',
    validFrom:ready?observedAt:null,
    validUntil:ready?expiresAt:null,
    exactClockMinuteRequired:false,
    timingBasis:'STATE_TRIGGERED_FRESHNESS_WINDOW',
    maxSignalAgeSeconds:MAX_SIGNAL_AGE_SECONDS
  },
  evidence:{
    structurePass,
    economicPass,
    exactStakeKnown,
    exactStakeValueEUR:exactStakeKnown?exactStakeValue:null,
    exactStakeSource,
    publicStakeProbeRecovered:stakeProbe?.decision?.exactTotalBetLadderRecovered===true,
    sourceFresh,
    withinFreshExecutionWindow,
    observedAt,
    signalAgeSeconds,
    bestConservativeRtp:live?.current?.modelScreen?.bestConservativeRtp??null,
    potsEUR:live?.current?.potsEUR||null,
    networkAllocationProspectivelyValidated:lane?.evidence?.networkAllocationProspectivelyValidated===true
  },
  blockers,
  interpretation: ready
    ? 'Execution is state-triggered, not clock-predicted: play only within the fresh validated state window using the exact verified stake and spin cap.'
    : 'No execution order is published while the economic gate or exact stake remains unresolved, or while the state is stale. No special lucky minute is assumed.',
  guards:{
    noAutomaticBetting:true,
    noInventedStake:true,
    noCoinValueAsTotalStakeAssumption:true,
    noCrossOperatorStakeSubstitution:true,
    noInventedMinute:true,
    noClockPatternAssumption:true,
    noMartingale:true,
    noLossChasing:true,
    staleSignalFailsClosed:true,
    manualExecutionOnly:true
  }
};
fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
