import {deriveProspectiveEmpiricalRaceLowerBound} from './sporting-legends-empirical-race-bound-v1.mjs';
import {evaluateSportingLegendsOverdueFirstBet} from './sporting-legends-overdue-first-bet-v1.mjs';
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const noPlay=(reason,extra={})=>({version:'sporting-legends-overdue-green-route-v1',decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,reason,...extra});
export function evaluateSportingLegendsOverdueGreenRoute({
  before,after,nowEpochSeconds,
  exactBetfairSpainTickerImsBindingVerified=false,
  betfairFirstBetFollowingDayRuleVerified=false,
  providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified=false,
  conservativeBaseRtpPct=93.03,stakeEUR=null,
  currentDailyAmountExactVerified=false,stakeAtDecisionExactVerified=false,
  measuredActionLatencySeconds=null,measuredActionLatencyVerified=false,
  frozenActionLatencyCeilingSeconds=null,
  frozenProtocolId=null,dryRunCycles=[],confidence=0.95,maxFeedAgeSeconds=360,
}={}){
  const measured=finite(measuredActionLatencySeconds),ceiling=finite(frozenActionLatencyCeilingSeconds),protocol=text(frozenProtocolId);
  if(measuredActionLatencyVerified!==true||measured===null||measured<0)return noPlay('MEASURED_ACTION_LATENCY_NOT_VERIFIED');
  if(!(ceiling>0)||measured>ceiling)return noPlay('MEASURED_LATENCY_EXCEEDS_FROZEN_CEILING',{measuredActionLatencySeconds:measured,frozenActionLatencyCeilingSeconds:ceiling});
  if(!protocol)return noPlay('FROZEN_PROTOCOL_ID_REQUIRED');
  if(!Array.isArray(dryRunCycles)||dryRunCycles.length<1)return noPlay('NO_PROSPECTIVE_DRY_RUN_CYCLES');
  let successes=0;
  for(const [index,cycle] of dryRunCycles.entries()){
    if(!cycle||cycle.observedProspectively!==true||cycle.protocolFrozenBeforeObservation!==true||cycle.comparableCycleDefinitionVerified!==true||cycle.detectedOverdueStateVerified!==true||cycle.sameBetfairBindingVerified!==true)return noPlay('INVALID_DRY_RUN_CYCLE',{cycleIndex:index});
    if(text(cycle.protocolId)!==protocol)return noPlay('DRY_RUN_PROTOCOL_CHANGED',{cycleIndex:index});
    const survival=finite(cycle.postDetectionSurvivalSeconds);
    if(survival===null||survival<0)return noPlay('INVALID_POST_DETECTION_SURVIVAL',{cycleIndex:index});
    if(survival>ceiling)successes++;
  }
  const bound=deriveProspectiveEmpiricalRaceLowerBound({successfulDryRunCycles:successes,totalDryRunCycles:dryRunCycles.length,confidence,prospectiveProtocolFrozen:true,comparableCycleDefinitionVerified:true});
  if(!bound.valid||!bound.usableForExecution)return noPlay('EMPIRICAL_RACE_BOUND_NOT_EXECUTABLE',{empiricalRaceBound:bound});
  const result=evaluateSportingLegendsOverdueFirstBet({before,after,nowEpochSeconds,exactBetfairSpainTickerImsBindingVerified,betfairFirstBetFollowingDayRuleVerified,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified,conservativeBaseRtpPct,stakeEUR,firstBetProbabilityLowerBound:bound.firstBetRaceProbabilityLowerBound,raceProbabilityProspectivelyValidated:true,currentDailyAmountExactVerified,stakeAtDecisionExactVerified,measuredActionLatencyVerified:true,prospectiveDryRunCycleVerified:true,maxFeedAgeSeconds});
  return {...result,version:'sporting-legends-overdue-green-route-v1',empiricalRaceBound:bound,dryRunSummary:{protocolId:protocol,frozenActionLatencyCeilingSeconds:ceiling,measuredActionLatencySeconds:measured,successfulDryRunCycles:successes,totalDryRunCycles:dryRunCycles.length,confidence},guards:{...(result.guards||{}),poissonNotRequiredForGreen:true,dryRunProtocolFrozenBeforeObservationRequired:true,currentMeasuredLatencyMustNotExceedFrozenCeiling:true}};
}
