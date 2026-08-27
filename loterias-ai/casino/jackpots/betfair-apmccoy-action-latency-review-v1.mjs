const VERSION='betfair-apmccoy-action-latency-review-v1';
const FREEZE_COMMIT_SHA='8eb28f5d7a3c708104f3e2356b6cc86764dba68c';
const SHA=/^[0-9a-f]{40}$/;
// Deliberately empty. A real manual-action latency measurement protocol must be
// committed and independently reviewed before a later code change may pin it here.
const APPROVED_ACTION_LATENCY_REVIEW_COMMITS=new Set();
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function approved(v){const s=text(v)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_ACTION_LATENCY_REVIEW_COMMITS.has(s);}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,measuredActionLatencyVerified:false,latencyPolicyIndependentlyReviewed:false,usableForRaceWindow:false,usableForExecution:false,execution:execution(),...extra};}

export function reviewBetfairApMcCoyActionLatency({measurement,reviewCommit}={}){
  const m=measurement||{};
  const seconds=finite(m.measuredActionLatencySeconds);
  if(!(seconds>0))return fail('POSITIVE_MEASURED_ACTION_LATENCY_REQUIRED');
  const sampleCount=Number(m.sampleCount);
  if(!Number.isInteger(sampleCount)||sampleCount<1)return fail('POSITIVE_INTEGER_SAMPLE_COUNT_REQUIRED',{measuredActionLatencySeconds:seconds});
  const protocolId=text(m.protocolId);
  if(!protocolId)return fail('LATENCY_MEASUREMENT_PROTOCOL_ID_REQUIRED',{measuredActionLatencySeconds:seconds,sampleCount});
  const method=text(m.method);
  if(!method)return fail('LATENCY_MEASUREMENT_METHOD_REQUIRED',{measuredActionLatencySeconds:seconds,sampleCount,protocolId});
  if(m.selectedUsingPostGhtSurvivalOutcomes!==false)return fail('LATENCY_SELECTION_MUST_BE_INDEPENDENT_OF_SURVIVAL_OUTCOMES',{measuredActionLatencySeconds:seconds,sampleCount,protocolId});
  const commit=text(reviewCommit)?.toLowerCase()||null;
  if(!commit||!SHA.test(commit))return fail('VALID_ACTION_LATENCY_REVIEW_COMMIT_REQUIRED',{measuredActionLatencySeconds:seconds,sampleCount,protocolId});
  if(!approved(commit))return fail('ACTION_LATENCY_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{reviewCommit:commit,measuredActionLatencySeconds:seconds,sampleCount,protocolId});
  return {
    version:VERSION,valid:true,reason:'INDEPENDENT_AP_MCCOY_ACTION_LATENCY_REVIEW_APPROVED',
    reviewCommit:commit,freezeCommitSha:FREEZE_COMMIT_SHA,protocolId,method,sampleCount,measuredActionLatencySeconds:seconds,
    selectedUsingPostGhtSurvivalOutcomes:false,measuredActionLatencyVerified:true,latencyPolicyIndependentlyReviewed:true,
    usableForRaceWindow:true,usableForExecution:false,
    scientificUse:'Code-owned promotion gate for AP McCoy manual-action latency. A positive measured latency is not trusted merely because a caller supplies it: the measurement protocol, method, sample count and explicit independence from post-GHT survival outcomes must be committed, independently reviewed, and that review commit must later be hard-pinned in this module. The latency review only supplies an operational latency input; it cannot prove a race probability, current jackpot state, stake or execution authority.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedReviewAllowlist:true,reviewAllowlistCurrentlyEmpty:APPROVED_ACTION_LATENCY_REVIEW_COMMITS.size===0,latencyMustBeMeasured:true,latencySelectionCannotUseSurvivalOutcomes:true,latencyCannotSelfAuthorizeRaceProbability:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}
