const VERSION='betfair-apmccoy-post-ght-survival-review-v1';
const CONTRACT_REVISION='v1.1-code-owned-artifact-identity';
const CANDIDATE_VERSION='betfair-apmccoy-post-ght-survival-cycle-v1';
const FREEZE_COMMIT_SHA='8eb28f5d7a3c708104f3e2356b6cc86764dba68c';
const SHA=/^[0-9a-f]{40}$/;

// Future entries map review commit -> exact canonical reviewed survival-cycle
// identity. Empty until a real prospective cycle and its complete attempt ledger
// are independently reviewed.
const APPROVED_CYCLE_REVIEWS=new Map();
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function bindingIdentity(b){return [String(b?.expectedBetfairImsCasino||'').toLowerCase(),String(b?.tickerEndpoint||''),String(b?.configSourceUrl||''),String(b?.instanceCode||'')];}
function artifactIdentity(v){return JSON.stringify([
  text(v?.cycleId),text(v?.freezeCommitSha)?.toLowerCase()||null,bindingIdentity(v?.bindingScope),
  finite(v?.requestExecIntervalSeconds),finite(v?.detectionTimestamp),finite(v?.detectionLagSeconds),
  finite(v?.lastConfirmedUnawardedTimestamp),finite(v?.survivalLowerBoundSeconds),
  finite(v?.firstObservedAwardOrResetTimestamp),finite(v?.awardResetInterval?.lowerExclusiveTimestamp),
  finite(v?.awardResetInterval?.upperInclusiveTimestamp),v?.rightCensored===true,
  v?.completeObservationHorizon===true,v?.completeAttemptLedgerVerified===true,
  v?.latencyThresholdSelectedAtCollectionTime===false
]);}
export function isApprovedBetfairApMcCoySurvivalReviewCommit(value){const s=text(value)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_CYCLE_REVIEWS.has(s);}
export function isApprovedBetfairApMcCoySurvivalReviewArtifact(review){const commit=text(review?.reviewCommit)?.toLowerCase();if(!commit||!SHA.test(commit))return false;const expected=APPROVED_CYCLE_REVIEWS.get(commit);return !!expected&&expected===artifactIdentity(review);}
function fail(reason,extra={}){return {version:VERSION,contractRevision:CONTRACT_REVISION,valid:false,reason,independentReviewApproved:false,usableForLatencyClassification:false,usableForRaceEvidence:false,usableForExecution:false,execution:execution(),...extra};}

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
  const normalized={
    cycleId:c.cycleId,freezeCommitSha:c.freezeCommitSha,bindingScope:c.bindingScope,requestExecIntervalSeconds:c.requestExecIntervalSeconds,
    detectionTimestamp:c.detectionTimestamp,detectionLagSeconds:c.detectionLagSeconds,lastConfirmedUnawardedTimestamp:c.lastConfirmedUnawardedTimestamp,
    survivalLowerBoundSeconds:c.survivalLowerBoundSeconds,firstObservedAwardOrResetTimestamp:c.firstObservedAwardOrResetTimestamp,
    awardResetInterval:c.awardResetInterval,rightCensored:c.rightCensored,completeObservationHorizon:true,completeAttemptLedgerVerified:true,
    latencyThresholdSelectedAtCollectionTime:false,
  };
  const identity=artifactIdentity(normalized),approvedIdentity=APPROVED_CYCLE_REVIEWS.get(commit);
  if(!approvedIdentity)return fail('REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{cycleId:c.cycleId||null,reviewCommit:commit});
  if(approvedIdentity!==identity)return fail('SURVIVAL_REVIEW_ARTIFACT_IDENTITY_MISMATCH',{cycleId:c.cycleId||null,reviewCommit:commit,reviewArtifactIdentity:identity});
  return {
    version:VERSION,contractRevision:CONTRACT_REVISION,valid:true,reason:'INDEPENDENT_PROSPECTIVE_SURVIVAL_CYCLE_REVIEW_APPROVED_EXACT_IDENTITY',
    reviewCommit:commit,reviewArtifactIdentity:identity,...normalized,
    independentReviewApproved:true,usableForLatencyClassification:true,usableForRaceEvidence:false,usableForExecution:false,
    scientificUse:'Only a code-owned exact reviewed artifact can promote a prospective AP McCoy post-GHT survival cycle to latency classification. The review commit is bound to the exact cycle identity: freeze, served binding, cadence, detection lag, survival interval, terminal/censoring state and complete observation flags. An approved SHA cannot be reused with altered timing or outcomes.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedReviewArtifactIdentity:true,reviewAllowlistCurrentlyEmpty:APPROVED_CYCLE_REVIEWS.size===0,approvedShaCannotBeReusedWithAlteredCycle:true,completeAttemptLedgerRequired:true,latencyStillNotSelected:true,servedStakeStillRequiredForExecution:true,raceAssumptionsStillRequiredForExecution:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}
