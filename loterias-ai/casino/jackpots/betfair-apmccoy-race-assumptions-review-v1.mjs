const VERSION='betfair-apmccoy-race-assumptions-review-v1';
const CONTRACT_REVISION='v1.2-code-owned-artifact-identity';
const SHA=/^[0-9a-f]{40}$/;
// Future entries map review commit -> exact canonical reviewed assumption identity.
// Empty until a complete fixed-attempt AP McCoy ledger and its statistical
// assumptions are independently reviewed.
const APPROVED_RACE_ASSUMPTION_REVIEWS=new Map();
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,contractRevision:CONTRACT_REVISION,valid:false,reason,completeProspectiveCycleLedgerVerified:false,binomialSamplingAssumptionJustified:false,currentCycleExchangeabilityVerified:false,independentRaceAssumptionsReviewed:false,usableForRaceBound:false,usableForExecution:false,execution:execution(),...extra};}
function exactUniqueCycleIds(value){if(!Array.isArray(value)||value.length<1)return null;const ids=value.map(text);if(ids.some(x=>!x)||new Set(ids).size!==ids.length)return null;return ids;}
function artifactIdentity(v){return JSON.stringify([
  text(v?.protocolId),text(v?.completeProspectiveLedgerCommit)?.toLowerCase()||null,
  Array.isArray(v?.cycleIds)?v.cycleIds.map(text):null,text(v?.bindingScopeKey),text(v?.assumptionEvidenceId),
  v?.samplingWindowFrozenBeforeFirstCycle===true,v?.allEligibleDistinctDailyGhtCyclesIncluded===true,
  v?.failedShortAndAmbiguousCyclesRetained===true,v?.assumptionsSelectedUsingSurvivalOutcomes===false,
  v?.completeProspectiveCycleLedgerVerified===true,v?.binomialSamplingAssumptionJustified===true,
  v?.currentCycleExchangeabilityVerified===true
]);}
export function isApprovedBetfairApMcCoyRaceAssumptionReviewCommit(value){const s=text(value)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_RACE_ASSUMPTION_REVIEWS.has(s);}
export function isApprovedBetfairApMcCoyRaceAssumptionReviewArtifact(review){const commit=text(review?.reviewCommit)?.toLowerCase();if(!commit||!SHA.test(commit))return false;const expected=APPROVED_RACE_ASSUMPTION_REVIEWS.get(commit);return !!expected&&expected===artifactIdentity(review);}

export function reviewBetfairApMcCoyRaceAssumptions({assumptions,reviewCommit}={}){
  const a=assumptions||{};
  const protocolId=text(a.protocolId);if(!protocolId)return fail('PROTOCOL_ID_REQUIRED');
  const ledgerCommit=text(a.completeProspectiveLedgerCommit)?.toLowerCase();if(!ledgerCommit||!SHA.test(ledgerCommit))return fail('COMPLETE_PROSPECTIVE_LEDGER_COMMIT_REQUIRED',{protocolId});
  const cycleIds=exactUniqueCycleIds(a.cycleIds);if(!cycleIds)return fail('NONEMPTY_UNIQUE_CYCLE_IDS_REQUIRED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit});
  const bindingScopeKey=text(a.bindingScopeKey);if(!bindingScopeKey)return fail('BINDING_SCOPE_KEY_REQUIRED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,cycleIds});
  const rationaleId=text(a.assumptionEvidenceId);if(!rationaleId)return fail('ASSUMPTION_EVIDENCE_ID_REQUIRED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,cycleIds,bindingScopeKey});
  if(a.samplingWindowFrozenBeforeFirstCycle!==true)return fail('SAMPLING_WINDOW_NOT_FROZEN_BEFORE_FIRST_CYCLE',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,cycleIds});
  if(a.allEligibleDistinctDailyGhtCyclesIncluded!==true)return fail('ALL_ELIGIBLE_DISTINCT_DAILY_GHT_CYCLES_NOT_INCLUDED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,cycleIds});
  if(a.failedShortAndAmbiguousCyclesRetained!==true)return fail('FAILED_SHORT_OR_AMBIGUOUS_CYCLES_NOT_RETAINED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,cycleIds});
  if(a.assumptionsSelectedUsingSurvivalOutcomes!==false)return fail('ASSUMPTIONS_MUST_BE_INDEPENDENT_OF_SURVIVAL_OUTCOMES',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,cycleIds});
  if(a.completeProspectiveCycleLedgerVerified!==true)return fail('COMPLETE_PROSPECTIVE_CYCLE_LEDGER_NOT_ATTESTED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,cycleIds,assumptionEvidenceId:rationaleId});
  if(a.binomialSamplingAssumptionJustified!==true)return fail('BINOMIAL_SAMPLING_ASSUMPTION_NOT_JUSTIFIED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,cycleIds,assumptionEvidenceId:rationaleId});
  if(a.currentCycleExchangeabilityVerified!==true)return fail('CURRENT_CYCLE_EXCHANGEABILITY_NOT_VERIFIED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,cycleIds,assumptionEvidenceId:rationaleId});
  const commit=text(reviewCommit)?.toLowerCase();if(!commit||!SHA.test(commit))return fail('VALID_RACE_ASSUMPTION_REVIEW_COMMIT_REQUIRED',{protocolId});
  const normalized={protocolId,completeProspectiveLedgerCommit:ledgerCommit,cycleIds,bindingScopeKey,assumptionEvidenceId:rationaleId,samplingWindowFrozenBeforeFirstCycle:true,allEligibleDistinctDailyGhtCyclesIncluded:true,failedShortAndAmbiguousCyclesRetained:true,assumptionsSelectedUsingSurvivalOutcomes:false,completeProspectiveCycleLedgerVerified:true,binomialSamplingAssumptionJustified:true,currentCycleExchangeabilityVerified:true};
  const identity=artifactIdentity(normalized),approvedIdentity=APPROVED_RACE_ASSUMPTION_REVIEWS.get(commit);
  if(!approvedIdentity)return fail('RACE_ASSUMPTION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{protocolId,reviewCommit:commit,completeProspectiveLedgerCommit:ledgerCommit,cycleIds,bindingScopeKey,assumptionEvidenceId:rationaleId});
  if(approvedIdentity!==identity)return fail('RACE_ASSUMPTION_REVIEW_ARTIFACT_IDENTITY_MISMATCH',{protocolId,reviewCommit:commit,reviewArtifactIdentity:identity});
  return {
    version:VERSION,contractRevision:CONTRACT_REVISION,valid:true,reason:'INDEPENDENT_AP_MCCOY_RACE_ASSUMPTIONS_REVIEW_APPROVED_EXACT_IDENTITY',reviewCommit:commit,reviewArtifactIdentity:identity,
    ...normalized,binomialIidAssumptionJustified:true,independentRaceAssumptionsReviewed:true,usableForRaceBound:true,usableForExecution:false,
    scientificUse:'Code-owned review gate for the assumptions used to interpret the AP McCoy fixed-attempt ledger as a binomial race probability. The review commit is bound to the exact canonical assumption identity: full ledger commit, exact cycle IDs, binding, rationale and all sampling/exchangeability declarations. An approved SHA cannot be reused with altered assumptions or a different ledger.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedReviewArtifactIdentity:true,reviewAllowlistCurrentlyEmpty:APPROVED_RACE_ASSUMPTION_REVIEWS.size===0,approvedShaCannotBeReusedWithAlteredAssumptions:true,completeProspectiveLedgerCommitRequired:true,exactCycleLedgerIdentityRequired:true,bindingScopeRequired:true,samplingWindowFrozenBeforeFirstCycleRequired:true,allEligibleDistinctDailyGhtCyclesRequired:true,failedShortAmbiguousCyclesMustBeRetained:true,assumptionSelectionIndependentOfOutcomesRequired:true,binomialAssumptionMustBeReviewed:true,currentCycleExchangeabilityMustBeReviewed:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}
