#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const GATE='loterias-ai/casino/evidence/five-euro-real-pilot-gate-v1.json';
const LIVE='loterias-ai/casino/jackpots/evidence/botemania-jpk-live-gate-v1.json';
const VALIDATION='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-validation-result-v1.json';
const PARAMS='loterias-ai/edge-live/evidence/botemania-fishin-execution-parameters-v1.json';
const OUT='loterias-ai/edge-live/evidence/edge-live-execution-plan-v1.json';
const GAME_URL='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const MAX_SIGNAL_AGE_SECONDS=90;

const gate=read(GATE)||{}, live=read(LIVE)||{}, validation=read(VALIDATION)||{}, params=read(PARAMS)||{};
const lane=(Array.isArray(gate?.lanes)?gate.lanes:[]).find(x=>x?.id==='botemania-jackpot-king')||{};
const structurePass=validation?.outcome==='PASSED_NETWORK_ALLOCATION' && validation?.frozen===true;
const economicPass=gate?.decision?.pilotAllowed===true && lane?.eligible===true && live?.decision?.economicPromotionCandidate===true;
const exactStakeKnown=params?.exactStakePerSpinKnown===true && Number(params?.stakePerSpinEUR)>0;
const timingEdgeValidated=params?.timingEdgeValidated===true;
const sourceFresh=live?.current?.sourceFresh===true;
const observedAt=live?.current?.observedAt||null;
const observedMs=Date.parse(observedAt||'');
const expiresAt=Number.isFinite(observedMs)?new Date(observedMs+MAX_SIGNAL_AGE_SECONDS*1000).toISOString():null;
const signalAgeSeconds=Number.isFinite(observedMs)?Math.max(0,Math.floor((Date.now()-observedMs)/1000)):null;
const timingReady=timingEdgeValidated && Number.isFinite(signalAgeSeconds) && signalAgeSeconds<=MAX_SIGNAL_AGE_SECONDS;
const ready=structurePass&&economicPass&&exactStakeKnown&&timingReady&&sourceFresh;
const stake=ready?Number(params.stakePerSpinEUR):0;
const maxTotal=ready?Math.min(Number(gate?.decision?.maxTotalStakeEUR||0),Number(params?.maxTotalStakeEUR||gate?.decision?.maxTotalStakeEUR||0)):0;
const maxSpins=ready&&stake>0?Math.max(1,Math.floor(maxTotal/stake)):0;

const blockers=[];
if(!structurePass) blockers.push('STRUCTURAL_VALIDATION_NOT_PASSED');
if(!economicPass) blockers.push('ECONOMIC_GATE_NOT_PASSED');
if(!exactStakeKnown) blockers.push('EXACT_STAKE_PER_SPIN_NOT_VERIFIED');
if(!timingEdgeValidated) blockers.push('TIMING_EDGE_NOT_VALIDATED');
if(!sourceFresh) blockers.push('SOURCE_NOT_FRESH');
if(Number.isFinite(signalAgeSeconds)&&signalAgeSeconds>MAX_SIGNAL_AGE_SECONDS) blockers.push('SIGNAL_EXPIRED');

const out={
  version:'edge-live-execution-plan-v1',
  generatedAt:new Date().toISOString(),
  operator:'botemania-es',
  game:{id:'fishin-frenzy-jackpot-king',name:"Fishin' Frenzy: Jackpot King",url:GAME_URL},
  state:ready?'READY_TO_EXECUTE_MANUALLY':'NO_EXECUTION',
  order:{
    action:ready?'PLAY':'DO_NOT_PLAY',
    stakePerSpinEUR:stake,
    maxSpins,
    maxTotalStakeEUR:maxTotal,
    entryMode:ready?'OPEN_REAL_GAME_AND_EXECUTE_WITHIN_VALID_WINDOW':'WAIT',
    validFrom:ready?observedAt:null,
    validUntil:ready?expiresAt:null,
    exactClockMinuteRequired:false,
    timingBasis:timingEdgeValidated?'VALIDATED_STATE_DEPENDENT_WINDOW':'NO_VALIDATED_MINUTE_OR_SECOND_EDGE'
  },
  evidence:{
    structurePass,
    economicPass,
    exactStakeKnown,
    timingEdgeValidated,
    sourceFresh,
    observedAt,
    signalAgeSeconds,
    bestConservativeRtp:live?.current?.modelScreen?.bestConservativeRtp??null,
    potsEUR:live?.current?.potsEUR||null,
    networkAllocationProspectivelyValidated:lane?.evidence?.networkAllocationProspectivelyValidated===true
  },
  blockers,
  interpretation: ready
    ? 'The app may show a manual execution instruction only while every exact execution gate remains valid.'
    : 'No exact wager amount or clock time is published because one or more execution gates are unresolved. Precision must not be fabricated.',
  guards:{
    noAutomaticBetting:true,
    noInventedStake:true,
    noInventedMinute:true,
    noMartingale:true,
    noLossChasing:true,
    staleSignalFailsClosed:true,
    manualExecutionOnly:true
  }
};
fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
