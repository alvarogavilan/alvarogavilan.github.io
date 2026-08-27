import {isApprovedBetfairApMcCoySurvivalReviewCommit} from './betfair-apmccoy-post-ght-survival-review-v1.mjs';
import {evaluateBetfairApMcCoyAttemptPlanActivation} from './betfair-apmccoy-attempt-plan-activation-v1.mjs';

const VERSION='betfair-apmccoy-scheduled-attempt-ledger-review-v1.3-code-owned-artifact-identity';
const LEDGER_VERSION='betfair-apmccoy-scheduled-attempt-ledger-v1';
const CYCLE_VERSION='betfair-apmccoy-post-ght-survival-review-v1';
const PLAN_FREEZE_COMMIT_SHA='e82f6d61dffa21ec3ca7ec940c51fc3fe36f0e1a';
const TARGET_SCHEDULED_OPPORTUNITIES=7;
const SHA40=/^[0-9a-f]{40}$/i;
const SHA256=/^[0-9a-f]{64}$/i;
const NON_CYCLE_FAILURE_CLASSES=new Set(['CAPTURE_FAILED','CAPTURE_STARTED_TOO_LATE','CAPTURE_STOPPED_SHORT','BINDING_OR_SCOPE_INVALID','MISSED_SCHEDULED_OPPORTUNITY']);
// Future entries map review commit -> exact canonical reviewed-ledger identity.
// Empty now: no real seven-opportunity ledger has been observed or reviewed.
const APPROVED_ATTEMPT_LEDGER_REVIEWS=new Map();
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function bindingKey(b){return [String(b?.expectedBetfairImsCasino||'').toLowerCase(),String(b?.tickerEndpoint||''),String(b?.configSourceUrl||''),String(b?.instanceCode||'')].join('|');}
function cycleScheduledGht(c){const detection=finite(c?.detectionTimestamp),lag=finite(c?.detectionLagSeconds);return detection!==null&&lag!==null?detection-lag:null;}
function cycleIdentity(c){return [text(c?.cycleId),text(c?.reviewCommit)?.toLowerCase()||null,bindingKey(c?.bindingScope),finite(c?.requestExecIntervalSeconds),finite(c?.detectionTimestamp),finite(c?.detectionLagSeconds),finite(c?.lastConfirmedUnawardedTimestamp),finite(c?.survivalLowerBoundSeconds),finite(c?.firstObservedAwardOrResetTimestamp),finite(c?.awardResetInterval?.lowerExclusiveTimestamp),finite(c?.awardResetInterval?.upperInclusiveTimestamp),c?.rightCensored===true,c?.completeObservationHorizon===true,c?.completeAttemptLedgerVerified===true];}
function entryIdentity(e){if(e?.terminalClass==='REVIEWED_COMPLETE_SURVIVAL_CYCLE')return [text(e?.attemptId),finite(e?.scheduledGhtEpochSeconds),e.terminalClass,cycleIdentity(e.reviewedCycle)];return [text(e?.attemptId),finite(e?.scheduledGhtEpochSeconds),text(e?.terminalClass),text(e?.evidenceDigestSha256)?.toLowerCase()||null,text(e?.reason)];}
function ledgerArtifactIdentity(v){return JSON.stringify([text(v?.planFreezeCommitSha)?.toLowerCase()||null,text(v?.activationReviewCommit)?.toLowerCase()||null,finite(v?.activatedAtEpochSeconds),text(v?.ledgerCommit)?.toLowerCase()||null,text(v?.stoppingRuleType),Number(v?.targetScheduledOpportunities),Number(v?.scheduledAttemptCount),text(v?.bindingScopeKey),(v?.entries||[]).map(entryIdentity)]);}
export function isApprovedBetfairApMcCoyAttemptLedgerReviewCommit(value){const s=text(value)?.toLowerCase();return !!s&&SHA40.test(s)&&APPROVED_ATTEMPT_LEDGER_REVIEWS.has(s);}
export function isApprovedBetfairApMcCoyAttemptLedgerReviewArtifact(review){const commit=text(review?.reviewCommit)?.toLowerCase();if(!commit||!SHA40.test(commit))return false;const expected=APPROVED_ATTEMPT_LEDGER_REVIEWS.get(commit);return !!expected&&expected===ledgerArtifactIdentity(review);}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,completeScheduledAttemptLedgerVerified:false,allScheduledOpportunitiesRetained:false,usableForRaceDenominator:false,usableForExecution:false,execution:execution(),...extra};}

export function reviewBetfairApMcCoyScheduledAttemptLedger({ledger,ledgerCommit,reviewCommit}={}){
  const l=ledger||{};
  if(l.version!==LEDGER_VERSION)return fail('EXACT_SCHEDULED_ATTEMPT_LEDGER_VERSION_REQUIRED');
  if(text(l.planFreezeCommitSha)?.toLowerCase()!==PLAN_FREEZE_COMMIT_SHA)return fail('ATTEMPT_PLAN_FREEZE_COMMIT_MISMATCH');
  const committed=text(ledgerCommit)?.toLowerCase();if(!committed||!SHA40.test(committed))return fail('COMMITTED_ATTEMPT_LEDGER_SHA_REQUIRED');
  if(Number(l.targetScheduledOpportunities)!==TARGET_SCHEDULED_OPPORTUNITIES)return fail('FIXED_SEVEN_OPPORTUNITY_TARGET_REQUIRED');
  if(l.stoppingRuleType!=='FIXED_FIRST_SEVEN_SCHEDULED_DISTINCT_DAILY_GHT_OPPORTUNITIES')return fail('FROZEN_STOPPING_RULE_REQUIRED');
  if(l.stopRuleChangedAfterObservation!==false)return fail('STOPPING_RULE_MUST_REMAIN_UNCHANGED');
  const declaredBinding=text(l.bindingScopeKey);if(!declaredBinding||declaredBinding==='|||')return fail('FROZEN_BINDING_SCOPE_KEY_REQUIRED');
  const entries=Array.isArray(l.entries)?l.entries:[];
  if(entries.length!==TARGET_SCHEDULED_OPPORTUNITIES)return fail('EXACTLY_SEVEN_SCHEDULED_ATTEMPT_ENTRIES_REQUIRED',{entryCount:entries.length});
  const activation=evaluateBetfairApMcCoyAttemptPlanActivation({activationReviewCommit:l.activationReviewCommit,bindingScopeKey:declaredBinding,firstScheduledGhtEpochSeconds:entries[0]?.scheduledGhtEpochSeconds});
  if(activation.valid!==true||activation.planActivated!==true)return fail('ATTEMPT_PLAN_ACTIVATION_NOT_VERIFIED',{activation});

  const ids=new Set(),ghts=new Set(),reviewedCycleIds=new Set(),safeEntries=[];
  let previousGht=null,reviewedCycleCount=0,nonCycleFailureCount=0;
  for(let i=0;i<entries.length;i++){
    const e=entries[i]||{},attemptId=text(e.attemptId),ght=finite(e.scheduledGhtEpochSeconds),terminalClass=text(e.terminalClass);
    if(!attemptId||ids.has(attemptId))return fail('MISSING_OR_DUPLICATE_ATTEMPT_ID',{attemptIndex:i,attemptId});ids.add(attemptId);
    if(!(ght>0)||ghts.has(ght))return fail('MISSING_OR_DUPLICATE_SCHEDULED_GHT',{attemptIndex:i,scheduledGhtEpochSeconds:ght});ghts.add(ght);
    if(i===0&&ght!==activation.firstScheduledGhtEpochSeconds)return fail('FIRST_LEDGER_GHT_DOES_NOT_MATCH_ACTIVATION',{scheduledGhtEpochSeconds:ght,activationFirstScheduledGhtEpochSeconds:activation.firstScheduledGhtEpochSeconds});
    if(previousGht!==null&&!(ght>previousGht))return fail('SCHEDULED_GHT_ORDER_NOT_STRICTLY_FORWARD',{attemptIndex:i});previousGht=ght;
    if(terminalClass==='REVIEWED_COMPLETE_SURVIVAL_CYCLE'){
      const c=e.reviewedCycle;
      if(!c||c.version!==CYCLE_VERSION||c.valid!==true||c.independentReviewApproved!==true||c.completeAttemptLedgerVerified!==true||c.completeObservationHorizon!==true||c.usableForLatencyClassification!==true)return fail('VALID_REVIEWED_COMPLETE_SURVIVAL_CYCLE_REQUIRED',{attemptIndex:i});
      if(!isApprovedBetfairApMcCoySurvivalReviewCommit(c.reviewCommit))return fail('SURVIVAL_CYCLE_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{attemptIndex:i,cycleId:c.cycleId||null,reviewCommit:c.reviewCommit||null});
      const cycleId=text(c.cycleId);if(!cycleId||reviewedCycleIds.has(cycleId))return fail('MISSING_OR_DUPLICATE_REVIEWED_CYCLE_ID',{attemptIndex:i,cycleId});reviewedCycleIds.add(cycleId);
      if(bindingKey(c.bindingScope)!==declaredBinding)return fail('REVIEWED_CYCLE_BINDING_SCOPE_MISMATCH',{attemptIndex:i,cycleId});
      if(cycleScheduledGht(c)!==ght)return fail('REVIEWED_CYCLE_GHT_DOES_NOT_MATCH_SCHEDULED_OPPORTUNITY',{attemptIndex:i,cycleId,scheduledGhtEpochSeconds:ght,cycleGhtEpochSeconds:cycleScheduledGht(c)});
      reviewedCycleCount++;safeEntries.push({attemptId,scheduledGhtEpochSeconds:ght,terminalClass,cycleId,reviewedCycle:c});
    }else{
      if(!NON_CYCLE_FAILURE_CLASSES.has(terminalClass))return fail('INVALID_TERMINAL_CLASS',{attemptIndex:i,terminalClass});
      const digest=text(e.evidenceDigestSha256)?.toLowerCase();if(!digest||!SHA256.test(digest))return fail('NON_CYCLE_FAILURE_EVIDENCE_DIGEST_REQUIRED',{attemptIndex:i,terminalClass});
      const reason=text(e.reason);if(!reason)return fail('NON_CYCLE_FAILURE_REASON_REQUIRED',{attemptIndex:i,terminalClass});
      nonCycleFailureCount++;safeEntries.push({attemptId,scheduledGhtEpochSeconds:ght,terminalClass,evidenceDigestSha256:digest,reason});
    }
  }
  const commit=text(reviewCommit)?.toLowerCase();if(!commit||!SHA40.test(commit))return fail('VALID_ATTEMPT_LEDGER_REVIEW_COMMIT_REQUIRED',{ledgerCommit:committed,scheduledAttemptCount:entries.length});
  if(commit===committed)return fail('INDEPENDENT_REVIEW_COMMIT_MUST_DIFFER_FROM_LEDGER_COMMIT',{ledgerCommit:committed,reviewCommit:commit});
  const identitySource={planFreezeCommitSha:PLAN_FREEZE_COMMIT_SHA,activationReviewCommit:activation.activationReviewCommit,activatedAtEpochSeconds:activation.activatedAtEpochSeconds,ledgerCommit:committed,stoppingRuleType:l.stoppingRuleType,targetScheduledOpportunities:TARGET_SCHEDULED_OPPORTUNITIES,scheduledAttemptCount:entries.length,bindingScopeKey:declaredBinding,entries:safeEntries};
  const identity=ledgerArtifactIdentity(identitySource),approvedIdentity=APPROVED_ATTEMPT_LEDGER_REVIEWS.get(commit);
  if(!approvedIdentity)return fail('ATTEMPT_LEDGER_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{ledgerCommit:committed,reviewCommit:commit,scheduledAttemptCount:entries.length,reviewedCycleCount,nonCycleFailureCount});
  if(approvedIdentity!==identity)return fail('ATTEMPT_LEDGER_REVIEW_ARTIFACT_IDENTITY_MISMATCH',{ledgerCommit:committed,reviewCommit:commit,reviewArtifactIdentity:identity});
  return {
    version:VERSION,valid:true,reason:'INDEPENDENT_FIXED_SEVEN_AP_MCCOY_ATTEMPT_LEDGER_REVIEW_APPROVED_EXACT_IDENTITY',
    reviewArtifactIdentity:identity,...identitySource,reviewCommit:commit,
    attemptIds:[...ids],scheduledGhtEpochSeconds:[...ghts],reviewedCycleIds:[...reviewedCycleIds],reviewedCycleCount,nonCycleFailureCount,
    stopRuleChangedAfterObservation:false,allScheduledOpportunitiesRetained:true,completeScheduledAttemptLedgerVerified:true,activationVerifiedBeforeFirstScheduledGht:true,
    nonCycleAttemptsCountAsConservativeRaceFailures:true,ambiguousReviewedCyclesCountAsConservativeRaceFailures:true,usableForRaceDenominator:true,usableForExecution:false,
    scientificUse:'Promotes only an independently reviewed, separately committed fixed seven-opportunity ledger after code-owned activation. The review commit is bound to the exact canonical ledger identity: activation, immutable ledger commit, binding, seven GHTs and every reviewed-cycle or failure outcome. An approved SHA therefore cannot be reused with a different binding, omitted failure, altered GHT or changed cycle.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,planFreezeCommitRequired:true,codeOwnedActivationRequired:true,activationMustPrecedeFirstScheduledGht:true,activationBindingMustMatchLedger:true,separateCommittedLedgerIdentityRequired:true,independentReviewCommitMustDifferFromLedgerCommit:true,fixedSevenScheduledOpportunities:true,strictDistinctGhtOrder:true,reviewedCyclesMustBeCodeAllowlisted:true,nonCycleFailuresRequireEvidenceDigest:true,missingAttemptsCannotBeDropped:true,retryUntilSuccessForbidden:true,optionalStoppingForbidden:true,codeOwnedReviewArtifactIdentity:true,reviewAllowlistCurrentlyEmpty:APPROVED_ATTEMPT_LEDGER_REVIEWS.size===0,approvedShaCannotBeReusedWithAlteredLedger:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}
