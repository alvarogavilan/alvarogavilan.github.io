const VERSION='bet365-frank-post-ght-survival-review-v1';
const CANDIDATE_VERSION='bet365-frank-post-ght-survival-cycle-v1';
const FREEZE_COMMIT_SHA='c3df680c2f51dffffe16706e9820248b21e555d4';
const SHA=/^[0-9a-f]{40}$/;

// Deliberately empty until a real prospective cycle artifact has been independently
// inspected and its dedicated review commit is later pinned here by a separate code change.
const APPROVED_CYCLE_REVIEW_COMMITS=new Set();
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
export function isApprovedBet365FrankSurvivalReviewCommit(value){const s=text(value)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_CYCLE_REVIEW_COMMITS.has(s);}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,independentReviewApproved:false,usableForLatencyClassification:false,usableForRaceEvidence:false,usableForExecution:false,execution:execution(),...extra};}

export function reviewBet365FrankPostGhtSurvivalCycle({cycleCandidate,reviewCommit}={}){
  const c=cycleCandidate;
  if(!c||c.version!==CANDIDATE_VERSION||c.valid!==true||c.prospectiveSurvivalCandidate!==true)return fail('VALID_PROSPECTIVE_SURVIVAL_CANDIDATE_REQUIRED');
  if(c.freezeCommitSha!==FREEZE_COMMIT_SHA)return fail('SURVIVAL_FREEZE_COMMIT_MISMATCH',{candidateFreezeCommitSha:c.freezeCommitSha||null});
  if(c.completeObservationHorizon!==true)return fail('COMPLETE_FROZEN_OBSERVATION_HORIZON_REQUIRED');
  if(c.independentCycleReviewRequired!==true||c.completeAttemptLedgerVerified!==false)return fail('UNREVIEWED_CANDIDATE_CONTRACT_REQUIRED');
  if(c.latencyThresholdSelectedAtCollectionTime!==false)return fail('LATENCY_SELECTION_AT_COLLECTION_FORBIDDEN');
  if(c.rightCensored!==true&&c.firstObservedAwardOrResetTimestamp===null)return fail('CENSORING_OR_TERMINAL_EVENT_REQUIRED');
  const commit=text(reviewCommit)?.toLowerCase()||null;
  if(!commit||!SHA.test(commit))return fail('VALID_REVIEW_COMMIT_SHA_REQUIRED',{cycleId:c.cycleId||null});
  if(!isApprovedBet365FrankSurvivalReviewCommit(commit))return fail('REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{cycleId:c.cycleId||null,reviewCommit:commit});
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
    scientificUse:'A code-owned allowlist is the only promotion path from a raw prospective Frank post-GHT survival candidate to latency classification. Caller booleans cannot approve a cycle. The review must verify the complete capture-attempt ledger, frozen horizon, exact binding continuity, no omitted failed/short snapshots and consistency with the committed evidence digest before its review commit is added to the allowlist. Even an approved survival cycle is not execution evidence until a separately frozen latency policy classifies it and operator rule/eligibility gates are closed.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedReviewAllowlist:true,reviewAllowlistCurrentlyEmpty:APPROVED_CYCLE_REVIEW_COMMITS.size===0,completeAttemptLedgerRequired:true,latencyStillNotSelected:true,operatorRuleStillRequiredForExecution:true,tenCentEligibilityStillRequiredForExecution:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}
