const VERSION='betfair-apmccoy-attempt-plan-activation-v1';
const PLAN_FREEZE_COMMIT_SHA='e82f6d61dffa21ec3ca7ec940c51fc3fe36f0e1a';
const SHA40=/^[0-9a-f]{40}$/i;
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}

// Deliberately empty. After the first real exact AP McCoy served binding is
// independently recorded, a later code change may add exactly one reviewed
// activation record. The activation timestamp and binding are code-owned so a
// caller cannot choose the binding or backdate the seven-opportunity window.
const APPROVED_ACTIVATIONS=new Map();

export function getApprovedBetfairApMcCoyAttemptPlanActivation(reviewCommit){
  const sha=text(reviewCommit)?.toLowerCase();
  if(!sha||!SHA40.test(sha))return null;
  const a=APPROVED_ACTIVATIONS.get(sha);if(!a)return null;
  const bindingScopeKey=text(a.bindingScopeKey),activatedAtEpochSeconds=finite(a.activatedAtEpochSeconds);
  if(!bindingScopeKey||bindingScopeKey==='|||'||!(activatedAtEpochSeconds>0))return null;
  return {version:VERSION,valid:true,planFreezeCommitSha:PLAN_FREEZE_COMMIT_SHA,activationReviewCommit:sha,bindingScopeKey,activatedAtEpochSeconds,sourceEvidenceCommit:text(a.sourceEvidenceCommit)?.toLowerCase()||null,independentlyRecordedBeforeAttemptWindow:true,usableForAttemptLedger:true,usableForExecution:false,execution:execution()};
}

export function evaluateBetfairApMcCoyAttemptPlanActivation({activationReviewCommit,bindingScopeKey,firstScheduledGhtEpochSeconds}={}){
  const approved=getApprovedBetfairApMcCoyAttemptPlanActivation(activationReviewCommit);
  const fail=(reason,extra={})=>({version:VERSION,valid:false,reason,planActivated:false,usableForAttemptLedger:false,usableForExecution:false,execution:execution(),...extra});
  if(!approved)return fail('ACTIVATION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{activationReviewCommit:text(activationReviewCommit)?.toLowerCase()||null});
  const binding=text(bindingScopeKey);if(binding!==approved.bindingScopeKey)return fail('ACTIVATION_BINDING_SCOPE_MISMATCH',{approvedBindingScopeKey:approved.bindingScopeKey,suppliedBindingScopeKey:binding});
  const firstGht=finite(firstScheduledGhtEpochSeconds);if(!(firstGht>approved.activatedAtEpochSeconds))return fail('FIRST_SCHEDULED_GHT_MUST_BE_STRICTLY_AFTER_ACTIVATION',{activatedAtEpochSeconds:approved.activatedAtEpochSeconds,firstScheduledGhtEpochSeconds:firstGht});
  return {...approved,reason:'CODE_OWNED_AP_MCCOY_ATTEMPT_PLAN_ACTIVATION_VERIFIED',planActivated:true,firstScheduledGhtEpochSeconds:firstGht,hardGuards:{onlineOnly:true,nonPromoOnly:true,planFrozenBeforeActivation:true,activationReviewCodeOwned:true,activationBindingCodeOwned:true,activationTimeCodeOwned:true,firstScheduledGhtStrictlyAfterActivation:true,callerCannotBackdateActivation:true,callerCannotChooseAlternateBinding:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}};
}
