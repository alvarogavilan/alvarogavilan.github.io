const VERSION='betfair-apmccoy-race-assumptions-review-v1';
const SHA=/^[0-9a-f]{40}$/;
// Empty until a complete prospective AP McCoy ledger and the statistical
// assumptions used to interpret it are independently reviewed in a later commit.
const APPROVED_RACE_ASSUMPTION_REVIEW_COMMITS=new Set();
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
export function isApprovedBetfairApMcCoyRaceAssumptionReviewCommit(value){const s=text(value)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_RACE_ASSUMPTION_REVIEW_COMMITS.has(s);}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,completeProspectiveCycleLedgerVerified:false,binomialSamplingAssumptionJustified:false,currentCycleExchangeabilityVerified:false,independentRaceAssumptionsReviewed:false,usableForRaceBound:false,usableForExecution:false,execution:execution(),...extra};}
function exactUniqueCycleIds(value){
  if(!Array.isArray(value)||value.length<1)return null;
  const ids=value.map(text);
  if(ids.some(x=>!x)||new Set(ids).size!==ids.length)return null;
  return ids;
}

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
  if(!isApprovedBetfairApMcCoyRaceAssumptionReviewCommit(commit))return fail('RACE_ASSUMPTION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{protocolId,reviewCommit:commit,completeProspectiveLedgerCommit:ledgerCommit,cycleIds,bindingScopeKey,assumptionEvidenceId:rationaleId});
  return {
    version:VERSION,contractRevision:'v1.1-exact-ledger-binding',valid:true,reason:'INDEPENDENT_AP_MCCOY_RACE_ASSUMPTIONS_REVIEW_APPROVED',protocolId,reviewCommit:commit,
    completeProspectiveLedgerCommit:ledgerCommit,cycleIds,bindingScopeKey,assumptionEvidenceId:rationaleId,
    samplingWindowFrozenBeforeFirstCycle:true,allEligibleDistinctDailyGhtCyclesIncluded:true,failedShortAndAmbiguousCyclesRetained:true,
    assumptionsSelectedUsingSurvivalOutcomes:false,
    completeProspectiveCycleLedgerVerified:true,binomialSamplingAssumptionJustified:true,binomialIidAssumptionJustified:true,currentCycleExchangeabilityVerified:true,
    independentRaceAssumptionsReviewed:true,usableForRaceBound:true,usableForExecution:false,
    scientificUse:'Code-owned review gate for the assumptions required to interpret the exact AP McCoy post-GHT survival ledger as a binomial race probability. The review is bound to one explicit prospective-ledger commit, the exact unique cycle IDs and one binding scope. The sampling window must have been frozen before the first cycle; every eligible distinct Daily GHT cycle must be included; failed, short and ambiguous cycles must be retained; and the sampling/exchangeability assumptions must be chosen independently of the observed survival outcomes. Caller booleans cannot close these assumptions because the review commit itself must be hard-pinned in code. This review does not select latency, approve stake, prove current jackpot state or authorize execution.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedReviewAllowlist:true,reviewAllowlistCurrentlyEmpty:APPROVED_RACE_ASSUMPTION_REVIEW_COMMITS.size===0,completeProspectiveLedgerCommitRequired:true,exactCycleLedgerIdentityRequired:true,bindingScopeRequired:true,samplingWindowFrozenBeforeFirstCycleRequired:true,allEligibleDistinctDailyGhtCyclesRequired:true,failedShortAmbiguousCyclesMustBeRetained:true,assumptionSelectionIndependentOfOutcomesRequired:true,binomialAssumptionMustBeReviewed:true,currentCycleExchangeabilityMustBeReviewed:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}
