const VERSION='betfair-apmccoy-attempt-plan-activation-v1.1-first-ght-pinned';
const PLAN_FREEZE_COMMIT_SHA='e82f6d61dffa21ec3ca7ec940c51fc3fe36f0e1a';
const SHA40=/^[0-9a-f]{40}$/i;
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}

// Deliberately empty. A future code-owned activation record must pin the exact
// binding, activation time and the exact first Daily sljp-1 GHT observed for the
// prospective window. This prevents skipping an inconvenient first opportunity.
const APPROVED_ACTIVATIONS=new Map();

export function getApprovedBetfairApMcCoyAttemptPlanActivation(reviewCommit){
  const sha=text(reviewCommit)?.toLowerCase();
  if(!sha||!SHA40.test(sha))return null;
  const a=APPROVED_ACTIVATIONS.get(sha);if(!a)return null;
  const bindingScopeKey=text(a.bindingScopeKey),activatedAtEpochSeconds=finite(a.activatedAtEpochSeconds),firstScheduledGhtEpochSeconds=finite(a.firstScheduledGhtEpochSeconds);
  const sourceEvidenceCommit=text(a.sourceEvidenceCommit)?.toLowerCase()||null;
  if(!bindingScopeKey||bindingScopeKey==='|||'||!(activatedAtEpochSeconds>0)||!(firstScheduledGhtEpochSeconds>activatedAtEpochSeconds))return null;
  if(!sourceEvidenceCommit||!SHA40.test(sourceEvidenceCommit)||sourceEvidenceCommit===sha)return null;
  return {
    version:VERSION,valid:true,planFreezeCommitSha:PLAN_FREEZE_COMMIT_SHA,activationReviewCommit:sha,
    bindingScopeKey,activatedAtEpochSeconds,firstScheduledGhtEpochSeconds,sourceEvidenceCommit,
    independentlyRecordedBeforeAttemptWindow:true,firstScheduledOpportunityPinnedAtActivation:true,
    usableForAttemptLedger:true,usableForExecution:false,execution:execution()
  };
}

export function evaluateBetfairApMcCoyAttemptPlanActivation({activationReviewCommit,bindingScopeKey,firstScheduledGhtEpochSeconds}={}){
  const approved=getApprovedBetfairApMcCoyAttemptPlanActivation(activationReviewCommit);
  const fail=(reason,extra={})=>({version:VERSION,valid:false,reason,planActivated:false,usableForAttemptLedger:false,usableForExecution:false,execution:execution(),...extra});
  if(!approved)return fail('ACTIVATION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{activationReviewCommit:text(activationReviewCommit)?.toLowerCase()||null});
  const binding=text(bindingScopeKey);if(binding!==approved.bindingScopeKey)return fail('ACTIVATION_BINDING_SCOPE_MISMATCH',{approvedBindingScopeKey:approved.bindingScopeKey,suppliedBindingScopeKey:binding});
  const firstGht=finite(firstScheduledGhtEpochSeconds);if(firstGht!==approved.firstScheduledGhtEpochSeconds)return fail('FIRST_SCHEDULED_GHT_MUST_EQUAL_CODE_OWNED_ACTIVATION_GHT',{approvedFirstScheduledGhtEpochSeconds:approved.firstScheduledGhtEpochSeconds,suppliedFirstScheduledGhtEpochSeconds:firstGht});
  return {...approved,reason:'CODE_OWNED_AP_MCCOY_ATTEMPT_PLAN_ACTIVATION_VERIFIED_EXACT_FIRST_GHT',planActivated:true,hardGuards:{onlineOnly:true,nonPromoOnly:true,planFrozenBeforeActivation:true,activationReviewCodeOwned:true,activationBindingCodeOwned:true,activationTimeCodeOwned:true,firstScheduledGhtCodeOwned:true,firstScheduledGhtStrictlyAfterActivation:true,firstOpportunityCannotBeSkipped:true,callerCannotBackdateActivation:true,callerCannotChooseAlternateBinding:true,sourceEvidenceCommitRequired:true,activationReviewMustDifferFromSourceEvidence:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}};
}
