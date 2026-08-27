import {validateBet365SportingPassiveRaceCycle} from './bet365-sporting-passive-race-cycle-v1.mjs';

const VERSION='bet365-frank-prospective-race-cycle-v1';
const PROTOCOL_ID='bet365-spain-frank-sporting-prospective-race-v1';
const FREEZE_COMMIT_SHA='0e482769ebef9ec709aa3a66ef0d0a706bcc4d07';
const FREEZE_COMMIT_UTC='2026-08-27T01:20:02Z';
const FREEZE_EPOCH_SECONDS=Date.parse(FREEZE_COMMIT_UTC)/1000;
const ACTION_LATENCY_SECONDS=null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,usableForRaceEvidence:false,reason,protocolId:PROTOCOL_ID,freezeCommitSha:FREEZE_COMMIT_SHA,freezeCommitUtc:FREEZE_COMMIT_UTC,freezeEpochSeconds:FREEZE_EPOCH_SECONDS,actionLatencySeconds:ACTION_LATENCY_SECONDS,execution:execution(),...extra};}

export function validateBet365FrankProspectiveRaceCycle(input={}){
  if(ACTION_LATENCY_SECONDS===null)return fail('ACTION_LATENCY_NOT_FROZEN_BEFORE_FIRST_COUNTED_CYCLE',{requiredNextArtifact:'Commit and independently review a defensible Frank manual-action latency value/policy before changing ACTION_LATENCY_SECONDS. No cycle observed before that later latency-freeze commit may count.'});
  const result=validateBet365SportingPassiveRaceCycle({
    ...input,
    protocolId:PROTOCOL_ID,
    protocolFrozenAtEpochSeconds:FREEZE_EPOCH_SECONDS,
    actionLatencySeconds:ACTION_LATENCY_SECONDS,
  });
  if(result?.valid!==true)return fail('FROZEN_BET365_FRANK_CYCLE_REJECTED',{cycleReason:result?.reason||null});
  if(!(Number(result.detectionTimestamp)>FREEZE_EPOCH_SECONDS&&Number(result.confirmationTimestamp)>FREEZE_EPOCH_SECONDS))return fail('CYCLE_OBSERVATION_NOT_STRICTLY_POST_FREEZE');
  return {...result,version:VERSION,validatorVersion:VERSION,protocolId:PROTOCOL_ID,freezeCommitSha:FREEZE_COMMIT_SHA,freezeCommitUtc:FREEZE_COMMIT_UTC,freezeEpochSeconds:FREEZE_EPOCH_SECONDS,actionLatencySeconds:ACTION_LATENCY_SECONDS,usableForRaceEvidence:true,execution:execution(),hardGuards:{...result.guards,freezeCommitHardcoded:true,callerCannotOverrideProtocolId:true,callerCannotOverrideFreezeTime:true,callerCannotOverrideActionLatency:true,preLatencyFreezeCyclesForbidden:true}};
}

export function getBet365FrankProspectiveRaceFreeze(){
  return {version:VERSION,protocolId:PROTOCOL_ID,freezeCommitSha:FREEZE_COMMIT_SHA,freezeCommitUtc:FREEZE_COMMIT_UTC,freezeEpochSeconds:FREEZE_EPOCH_SECONDS,actionLatencySeconds:ACTION_LATENCY_SECONDS,firstCountedCycleEnabled:ACTION_LATENCY_SECONDS!==null,execution:execution()};
}
