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
const OPERATOR_ACCESS_LEAD_SECONDS=120;
const SAFETY_BUFFER_SECONDS=60;
const MAX_SIGNAL_AGE_SECONDS=OPERATOR_ACCESS_LEAD_SECONDS+SAFETY_BUFFER_SECONDS;

const gate=read(GATE)||{}, live=read(LIVE)||{}, validation=read(VALIDATION)||{}, params=read(PARAMS)||{}, stakeProbe=read(STAKE_PROBE)||{};
const lane=(Array.isArray(gate?.lanes)?gate.lanes:[]).find(x=>x?.id==='botemania-jackpot-king')||{};
const structurePass=validation?.outcome==='PASSED_NETWORK_ALLOCATION' && validation?.frozen===true;
const economicPass=gate?.decision?.pilotAllowed===true && lane?.eligible===true && live?.decision?.economicPromotionCandidate===true;
const probedStake=stakeProbe?.decision?.exactStakePerSpinKnown===true?Number(stakeProbe?.decision?.minimumExactTotalBetEUR):null;
const configuredStake=params?.exactStakePerSpinKnown===true?Number(params?.stakePerSpinEUR):null;
const exactStakeValue=Number.isFinite(probedStake)&&probedStake>0?probedStake:(Number.isFinite(configuredStake)&&configuredStake>0?configuredStake:null);
const exactStakeKnown=Number.isFinite(exactStakeValue)&&exactStakeValue>0;
const exactStakeSource=Number.isFinite(probedStake)&&probedStake>0?(stakeProbe?.decision?.evidenceClass||'VERIFIED_STAKE_PROBE'):(Number.isFinite(configuredStake)&&configuredStake>0?'VERIFIED_EXECUTION_PARAMETERS':null);
const sourceFresh=live?.current?.sourceFresh===true;
const observedAt=live?.current?.observedAt||null;
const observedMs=Date.parse(observedAt||'');
const expiresAt=Number.isFinite(observedMs)?new Date(observedMs+MAX_SIGNAL_AGE_SECONDS*1000).toISOString():null;
const signalAgeSeconds=Number.isFinite(observedMs)?Math.max(0,Math.floor((Date.now()-observedMs)/1000)):null;
const withinFreshExecutionWindow=Number.isFinite(signalAgeSeconds)&&signalAgeSeconds<=MAX_SIGNAL_AGE_SECONDS;
const ready=structurePass&&economicPass&&exactStakeKnown&&sourceFresh&&withinFreshExecutionWindow;

const routeEtas=Object.values(live?.researchBand?.routes||{}).map(r=>Number(r?.etaNoReset?.hours)).filter(Number.isFinite).map(h=>Math.max(0,Math.round(h*3600)));
const nearestResearchEtaSeconds=routeEtas.length?Math.min(...routeEtas):null;
const hardPrereqsForPrepare=structurePass&&exactStakeKnown&&sourceFresh&&lane?.evidence?.exactSpainMbwbKnown===true&&lane?.evidence?.exactHazardKnown===true;
const prepare=!ready&&hardPrereqsForPrepare&&Number.isFinite(nearestResearchEtaSeconds)&&nearestResearchEtaSeconds<=MAX_SIGNAL_AGE_SECONDS;

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
const state=ready?'READY_TO_EXECUTE_MANUALLY':prepare?'PREPARE_OPEN_GAME_NO_BET':'NO_EXECUTION';
const action=ready?'PLAY':prepare?'OPEN_GAME_ONLY_NO_BET':'DO_NOT_PLAY';
const out={version:'edge-live-execution-plan-v1.4-exact-ingame-stake',generatedAt:new Date().toISOString(),operator:'botemania-es',game:{id:'fishin-frenzy-jackpot-king',name:"Fishin' Frenzy: Jackpot King",url:GAME_URL},state,order:{action,stakePerSpinEUR:stake,maxSpins,maxTotalStakeEUR:maxTotal,entryMode:ready?'EXECUTE_ONLY_IF_STILL_GREEN':prepare?'OPEN_REAL_GAME_AND_GET_READY_NO_BET':'WAIT',operatorAccessLeadSeconds:OPERATOR_ACCESS_LEAD_SECONDS,safetyBufferSeconds:SAFETY_BUFFER_SECONDS,validFrom:ready?observedAt:null,validUntil:ready?expiresAt:null,exactClockMinuteRequired:false,timingBasis:'STATE_TRIGGERED_WITH_OPERATOR_ACCESS_LEAD',maxSignalAgeSeconds:MAX_SIGNAL_AGE_SECONDS,requiresFinalGreenRecheckBeforeFirstSpin:true,preparationEtaSeconds:prepare?nearestResearchEtaSeconds:null},evidence:{structurePass,economicPass,exactStakeKnown,exactStakeValueEUR:exactStakeKnown?exactStakeValue:null,exactStakeSource,totalBetOptionsEUR:Array.isArray(stakeProbe?.decision?.exactTotalBetOptionsEUR)?stakeProbe.decision.exactTotalBetOptionsEUR:[],publicStakeProbeRecovered:stakeProbe?.decision?.exactTotalBetLadderRecovered===true,exactSpainMbwbKnown:lane?.evidence?.exactSpainMbwbKnown===true,exactHazardKnown:lane?.evidence?.exactHazardKnown===true,sourceFresh,withinFreshExecutionWindow,observedAt,signalAgeSeconds,nearestResearchEtaSeconds,bestConservativeRtp:live?.current?.modelScreen?.bestConservativeRtp??null,potsEUR:live?.current?.potsEUR||null,networkAllocationProspectivelyValidated:lane?.evidence?.networkAllocationProspectivelyValidated===true},blockers,interpretation:ready?'GREEN means execute manually only after a final recheck that the signal is still green.':prepare?'YELLOW means open Botemania and get Fishin Frenzy ready, but do not place any spin yet.':'RED means do not play. No execution order is published while any strict prerequisite remains unresolved.',guards:{noAutomaticBetting:true,noInventedStake:true,noCoinValueAsTotalStakeAssumption:true,noCrossOperatorStakeSubstitution:true,noInventedMinute:true,noClockPatternAssumption:true,noMartingale:true,noLossChasing:true,staleSignalFailsClosed:true,manualExecutionOnly:true,prepareNeverAuthorizesBet:true,finalGreenRecheckMandatory:true}};
fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
