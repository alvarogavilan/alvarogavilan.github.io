const VERSION='betfair-apmccoy-action-latency-review-v1';
const CONTRACT_REVISION='v1.2-code-owned-artifact-identity';
const FREEZE_COMMIT_SHA='8eb28f5d7a3c708104f3e2356b6cc86764dba68c';
const SHA=/^[0-9a-f]{40}$/;
const MIN_SAMPLE_COUNT=20;
const REQUIRED_START_EVENT='VALIDATED_SERVER_STATE_AVAILABLE_TO_DECISION_LOGIC';
const REQUIRED_END_EVENT='MANUAL_WAGER_REQUEST_DISPATCH_OBSERVED_LOCALLY';
const REQUIRED_NETWORK_ALLOWANCE_BASIS='PASSIVE_SAME_ORIGIN_FULL_RTT_UPPER_BOUND';
// Deliberately empty. Future approval entries map review commit -> exact canonical
// reviewed measurement identity, preventing reuse of an approved SHA with altered
// protocol, samples, dispatch latency, network allowance or total latency.
const APPROVED_ACTION_LATENCY_REVIEWS=new Map();
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function identityFields(v){return [text(v?.protocolId),text(v?.method),Number(v?.sampleCount),text(v?.startEvent),text(v?.endEvent),finite(v?.measuredDispatchLatencySeconds),finite(v?.networkAllowanceSeconds),text(v?.networkAllowanceBasis),finite(v?.measuredActionLatencySeconds),v?.networkAllowanceDerivedFromPassiveTrafficOnly===true,v?.wagerProbeUsed===false,v?.selectedUsingPostGhtSurvivalOutcomes===false];}
function artifactIdentity(v){return JSON.stringify(identityFields(v));}
export function isApprovedBetfairApMcCoyActionLatencyReviewCommit(value){const s=text(value)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_ACTION_LATENCY_REVIEWS.has(s);}
export function isApprovedBetfairApMcCoyActionLatencyReviewArtifact(review){const commit=text(review?.reviewCommit)?.toLowerCase();if(!commit||!SHA.test(commit))return false;const expected=APPROVED_ACTION_LATENCY_REVIEWS.get(commit);return !!expected&&expected===artifactIdentity(review);}
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
  const normalized={protocolId,method,sampleCount,startEvent:REQUIRED_START_EVENT,endEvent:REQUIRED_END_EVENT,measuredDispatchLatencySeconds:dispatch,networkAllowanceSeconds:network,networkAllowanceBasis:REQUIRED_NETWORK_ALLOWANCE_BASIS,measuredActionLatencySeconds:total,networkAllowanceDerivedFromPassiveTrafficOnly:true,wagerProbeUsed:false,selectedUsingPostGhtSurvivalOutcomes:false};
  const identity=artifactIdentity(normalized),approvedIdentity=APPROVED_ACTION_LATENCY_REVIEWS.get(commit);
  if(!approvedIdentity)return fail('ACTION_LATENCY_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{reviewCommit:commit,measuredActionLatencySeconds:total,sampleCount,protocolId});
  if(approvedIdentity!==identity)return fail('ACTION_LATENCY_REVIEW_ARTIFACT_IDENTITY_MISMATCH',{reviewCommit:commit,reviewArtifactIdentity:identity});
  return {
    version:VERSION,contractRevision:CONTRACT_REVISION,valid:true,reason:'INDEPENDENT_AP_MCCOY_END_TO_END_ACTION_LATENCY_REVIEW_APPROVED',
    reviewCommit:commit,reviewArtifactIdentity:identity,freezeCommitSha:FREEZE_COMMIT_SHA,...normalized,
    measuredActionLatencyVerified:true,latencyPolicyIndependentlyReviewed:true,usableForRaceWindow:true,usableForExecution:false,
    scientificUse:'Code-owned promotion gate for conservative AP McCoy action latency. Approval binds the review commit to the exact canonical measurement identity, so an approved SHA cannot be reused with altered protocol, sample count, dispatch latency, passive network allowance or total latency. The reviewed total covers validated server-state availability through local manual request dispatch plus a positive passive full-RTT allowance; at least twenty samples are required and wager probes are forbidden.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,minimumSampleCount:MIN_SAMPLE_COUNT,startEventFixed:true,endEventFixedAtLocalRequestDispatch:true,positivePassiveNetworkAllowanceRequired:true,fullPassiveRttAllowanceRequired:true,totalMustCoverDispatchPlusNetworkAllowance:true,networkAllowanceFromPassiveTrafficOnly:true,wagerProbeForbidden:true,codeOwnedReviewArtifactIdentity:true,reviewAllowlistCurrentlyEmpty:APPROVED_ACTION_LATENCY_REVIEWS.size===0,approvedShaCannotBeReusedWithAlteredArtifact:true,latencySelectionCannotUseSurvivalOutcomes:true,latencyCannotSelfAuthorizeRaceProbability:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}
