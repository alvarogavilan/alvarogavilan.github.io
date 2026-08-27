const VERSION='betfair-apmccoy-post-ght-survival-review-v1';
const CANDIDATE_VERSION='betfair-apmccoy-post-ght-survival-cycle-v1';
const FREEZE_COMMIT_SHA='8eb28f5d7a3c708104f3e2356b6cc86764dba68c';
const SHA=/^[0-9a-f]{40}$/;

// Deliberately empty until a real prospective AP McCoy cycle artifact and its
// complete capture-attempt ledger are independently reviewed in a later commit.
const APPROVED_CYCLE_REVIEW_COMMITS=new Set();
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
export function isApprovedBetfairApMcCoySurvivalReviewCommit(value){const s=text(value)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_CYCLE_REVIEW_COMMITS.has(s);}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,independentReviewApproved:false,usableForLatencyClassification:false,usableForRaceEvidence:false,usableForExecution:false,execution:execution(),...extra};}

export function reviewBetfairApMcCoyPostGhtSurvivalCycle({cycleCandidate,reviewCommit}={}){
  const c=cycleCandidate;
  if(!c||c.version!==CANDIDATE_VERSION||c.valid!==true||c.prospectiveSurvivalCandidate!==true)return fail('VALID_PROSPECTIVE_SURVIVAL_CANDIDATE_REQUIRED');
  if(c.freezeCommitSha!==FREEZE_COMMIT_SHA)return fail('SURVIVAL_FREEZE_COMMIT_MISMATCH',{candidateFreezeCommitSha:c.freezeCommitSha||null});
  if(c.completeObservationHorizon!==true)return fail('COMPLETE_FROZEN_OBSERVATION_HORIZON_REQUIRED');
  if(c.independentCycleReviewRequired!==true||c.completeAttemptLedgerVerified!==false)return fail('UNREVIEWED_CANDIDATE_CONTRACT_REQUIRED');
  if(c.latencyThresholdSelectedAtCollectionTime!==false)return fail('LATENCY_SELECTION_AT_COLLECTION_FORBIDDEN');
  if(c.rightCensored!==true&&c.firstObservedAwardOrResetTimestamp===null)return fail('CENSORING_OR_TERMINAL_EVENT_REQUIRED');
  const commit=text(reviewCommit)?.toLowerCase()||null;
  if(!commit||!SHA.test(commit))return fail('VALID_REVIEW_COMMIT_SHA_REQUIRED',{cycleId:c.cycleId||null});
  if(!isApprovedBetfairApMcCoySurvivalReviewCommit(commit))return fail('REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{cycleId:c.cycleId||null,reviewCommit:commit});
  return {
    version:VERSION,valid:true,reason:'INDEPENDENT_PROSPECTIVE_SURVIVAL_CYCLE_REVIEW_APPROVED',
    cycleId:c.cycleId,reviewCommit:commit,freezeCommitSha:c.freezeCommitSha,
    bindingScope:c.bindingScope,requestExecIntervalSeconds:c.requestExecIntervalSeconds,
    detectionTimestamp:c.detectionTimestamp,detectionLagSeconds:c.detectionLagSeconds,
    lastConfirmedUnawardedTimestamp:c.lastConfirmedUnawardedTimestamp,
    survivalLowerBoundSeconds:c.survivalLowerBoundSeconds,
    firstObservedAwardOrResetTimestamp:c.firstObservedAwardOrResetTimestamp,
    awardResetInterval:c.awardResetInterval,rightCensored:c.rightCensored,
    completeObservationHorizon:true,completeAttemptLedgerVerified:true,
    latencyThresholdSelectedAtCollectionTime:false,independentReviewApproved:true,
    usableForLatencyClassification:true,usableForRaceEvidence:false,usableForExecution:false,
    scientificUse:'Only a code-owned allowlist can promote a raw prospective AP McCoy post-GHT survival candidate to latency classification. Caller booleans and arbitrary review SHAs cannot approve a cycle. Review must verify the complete capture-attempt ledger, frozen horizon, exact AP McCoy served binding continuity, no omitted failed or short captures and consistency with the committed evidence digest before its review commit is added to the allowlist. Approval remains research-only until latency, race assumptions, served stake and final fresh state are independently closed.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedReviewAllowlist:true,reviewAllowlistCurrentlyEmpty:APPROVED_CYCLE_REVIEW_COMMITS.size===0,completeAttemptLedgerRequired:true,latencyStillNotSelected:true,servedStakeStillRequiredForExecution:true,raceAssumptionsStillRequiredForExecution:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}
