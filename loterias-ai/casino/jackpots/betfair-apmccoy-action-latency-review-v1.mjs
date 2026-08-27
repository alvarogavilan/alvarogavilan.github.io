const VERSION='betfair-apmccoy-action-latency-review-v1';
const CONTRACT_REVISION='v1.1-dispatch-plus-passive-rtt';
const FREEZE_COMMIT_SHA='8eb28f5d7a3c708104f3e2356b6cc86764dba68c';
const SHA=/^[0-9a-f]{40}$/;
const MIN_SAMPLE_COUNT=20;
const REQUIRED_START_EVENT='VALIDATED_SERVER_STATE_AVAILABLE_TO_DECISION_LOGIC';
const REQUIRED_END_EVENT='MANUAL_WAGER_REQUEST_DISPATCH_OBSERVED_LOCALLY';
const REQUIRED_NETWORK_ALLOWANCE_BASIS='PASSIVE_SAME_ORIGIN_FULL_RTT_UPPER_BOUND';
// Deliberately empty. A real non-wager latency measurement package must be
// committed and independently reviewed before a later code change may pin it.
const APPROVED_ACTION_LATENCY_REVIEW_COMMITS=new Set();
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
export function isApprovedBetfairApMcCoyActionLatencyReviewCommit(value){const s=text(value)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_ACTION_LATENCY_REVIEW_COMMITS.has(s);}
function fail(reason,extra={}){return {version:VERSION,contractRevision:CONTRACT_REVISION,valid:false,reason,measuredActionLatencyVerified:false,latencyPolicyIndependentlyReviewed:false,usableForRaceWindow:false,usableForExecution:false,execution:execution(),...extra};}

export function reviewBetfairApMcCoyActionLatency({measurement,reviewCommit}={}){
  const m=measurement||{};
  const total=finite(m.measuredActionLatencySeconds),dispatch=finite(m.measuredDispatchLatencySeconds),network=finite(m.networkAllowanceSeconds);
  if(!(total>0))return fail('POSITIVE_MEASURED_ACTION_LATENCY_REQUIRED');
  if(!(dispatch>0))return fail('POSITIVE_MEASURED_DISPATCH_LATENCY_REQUIRED',{measuredActionLatencySeconds:total});
  if(!(network>0))return fail('POSITIVE_PASSIVE_NETWORK_ALLOWANCE_REQUIRED',{measuredActionLatencySeconds:total,measuredDispatchLatencySeconds:dispatch});
  if(total+1e-9<dispatch+network)return fail('TOTAL_LATENCY_MUST_COVER_DISPATCH_PLUS_NETWORK_ALLOWANCE',{measuredActionLatencySeconds:total,measuredDispatchLatencySeconds:dispatch,networkAllowanceSeconds:network,minimumTotalLatencySeconds:dispatch+network});
  const sampleCount=Number(m.sampleCount);
  if(!Number.isInteger(sampleCount)||sampleCount<MIN_SAMPLE_COUNT)return fail('MINIMUM_LATENCY_SAMPLE_COUNT_REQUIRED',{sampleCount,minimumSampleCount:MIN_SAMPLE_COUNT});
  const protocolId=text(m.protocolId);if(!protocolId)return fail('LATENCY_MEASUREMENT_PROTOCOL_ID_REQUIRED',{measuredActionLatencySeconds:total,sampleCount});
  const method=text(m.method);if(!method)return fail('LATENCY_MEASUREMENT_METHOD_REQUIRED',{measuredActionLatencySeconds:total,sampleCount,protocolId});
  if(text(m.startEvent)!==REQUIRED_START_EVENT)return fail('LATENCY_START_EVENT_NOT_END_TO_END_SERVER_DETECTION',{requiredStartEvent:REQUIRED_START_EVENT,observedStartEvent:text(m.startEvent)});
  if(text(m.endEvent)!==REQUIRED_END_EVENT)return fail('LATENCY_END_EVENT_NOT_LOCAL_REQUEST_DISPATCH',{requiredEndEvent:REQUIRED_END_EVENT,observedEndEvent:text(m.endEvent)});
  if(text(m.networkAllowanceBasis)!==REQUIRED_NETWORK_ALLOWANCE_BASIS)return fail('NETWORK_ALLOWANCE_BASIS_NOT_CONSERVATIVE_PASSIVE_FULL_RTT',{requiredNetworkAllowanceBasis:REQUIRED_NETWORK_ALLOWANCE_BASIS,observedNetworkAllowanceBasis:text(m.networkAllowanceBasis)});
  if(m.networkAllowanceDerivedFromPassiveTrafficOnly!==true)return fail('NETWORK_ALLOWANCE_MUST_USE_PASSIVE_TRAFFIC_ONLY');
  if(m.wagerProbeUsed!==false)return fail('WAGER_PROBE_FORBIDDEN');
  if(m.selectedUsingPostGhtSurvivalOutcomes!==false)return fail('LATENCY_SELECTION_MUST_BE_INDEPENDENT_OF_SURVIVAL_OUTCOMES',{measuredActionLatencySeconds:total,sampleCount,protocolId});
  const commit=text(reviewCommit)?.toLowerCase()||null;
  if(!commit||!SHA.test(commit))return fail('VALID_ACTION_LATENCY_REVIEW_COMMIT_REQUIRED',{measuredActionLatencySeconds:total,sampleCount,protocolId});
  if(!isApprovedBetfairApMcCoyActionLatencyReviewCommit(commit))return fail('ACTION_LATENCY_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{reviewCommit:commit,measuredActionLatencySeconds:total,sampleCount,protocolId});
  return {
    version:VERSION,contractRevision:CONTRACT_REVISION,valid:true,reason:'INDEPENDENT_AP_MCCOY_END_TO_END_ACTION_LATENCY_REVIEW_APPROVED',
    reviewCommit:commit,freezeCommitSha:FREEZE_COMMIT_SHA,protocolId,method,sampleCount,
    startEvent:REQUIRED_START_EVENT,endEvent:REQUIRED_END_EVENT,
    measuredDispatchLatencySeconds:dispatch,networkAllowanceSeconds:network,networkAllowanceBasis:REQUIRED_NETWORK_ALLOWANCE_BASIS,
    measuredActionLatencySeconds:total,selectedUsingPostGhtSurvivalOutcomes:false,networkAllowanceDerivedFromPassiveTrafficOnly:true,wagerProbeUsed:false,
    measuredActionLatencyVerified:true,latencyPolicyIndependentlyReviewed:true,usableForRaceWindow:true,usableForExecution:false,
    scientificUse:'Code-owned promotion gate for conservative AP McCoy action latency. The reviewed value must cover the interval from validated server-state availability through local manual wager-request dispatch plus a positive network allowance derived only from passive same-origin full-RTT observations. At least twenty samples are required, no wager probe is allowed, and the protocol must be independent of post-GHT survival outcomes. The result supplies only a conservative race-window input and cannot prove state, stake, jackpot eligibility or execution authority.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,minimumSampleCount:MIN_SAMPLE_COUNT,startEventFixed:true,endEventFixedAtLocalRequestDispatch:true,positivePassiveNetworkAllowanceRequired:true,fullPassiveRttAllowanceRequired:true,totalMustCoverDispatchPlusNetworkAllowance:true,networkAllowanceFromPassiveTrafficOnly:true,wagerProbeForbidden:true,codeOwnedReviewAllowlist:true,reviewAllowlistCurrentlyEmpty:APPROVED_ACTION_LATENCY_REVIEW_COMMITS.size===0,latencySelectionCannotUseSurvivalOutcomes:true,latencyCannotSelfAuthorizeRaceProbability:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}
