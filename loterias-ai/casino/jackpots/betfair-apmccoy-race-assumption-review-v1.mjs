const VERSION='betfair-apmccoy-race-assumption-review-v1';
const SHA=/^[0-9a-f]{40}$/;

// Deliberately empty until a prospective AP McCoy survival ledger exists and a
// separate review commit documents the sampling frame, completeness and
// exchangeability argument without selecting assumptions from observed outcomes.
const APPROVED_RACE_ASSUMPTION_REVIEW_COMMITS=new Set();
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function approved(v){const s=text(v)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_RACE_ASSUMPTION_REVIEW_COMMITS.has(s);}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,raceExecutionAssumptionsVerified:false,usableForEmpiricalRaceBound:false,usableForExecution:false,execution:execution(),...extra};}
function exactUniqueIds(v){if(!Array.isArray(v)||v.length<1)return null;const ids=v.map(text);if(ids.some(x=>!x)||new Set(ids).size!==ids.length)return null;return ids;}

export function reviewBetfairApMcCoyRaceAssumptions({assumptionArtifact,reviewCommit}={}){
  const a=assumptionArtifact||{};
  const protocolId=text(a.protocolId);if(!protocolId)return fail('PROTOCOL_ID_REQUIRED');
  const cycleIds=exactUniqueIds(a.cycleIds);if(!cycleIds)return fail('NONEMPTY_UNIQUE_CYCLE_IDS_REQUIRED',{protocolId});
  const assumptionEvidenceId=text(a.assumptionEvidenceId);if(!assumptionEvidenceId)return fail('ASSUMPTION_EVIDENCE_ID_REQUIRED',{protocolId,cycleIds});
  const bindingScopeKey=text(a.bindingScopeKey);if(!bindingScopeKey)return fail('BINDING_SCOPE_KEY_REQUIRED',{protocolId,cycleIds});
  if(a.samplingWindowFrozenBeforeFirstCycle!==true)return fail('SAMPLING_WINDOW_MUST_BE_FROZEN_BEFORE_FIRST_CYCLE',{protocolId,cycleIds});
  if(a.allEligibleDistinctDailyGhtCyclesIncluded!==true)return fail('COMPLETE_ELIGIBLE_GHT_LEDGER_REQUIRED',{protocolId,cycleIds});
  if(a.failedShortAndAmbiguousCyclesRetained!==true)return fail('FAILED_SHORT_AMBIGUOUS_CYCLES_MUST_BE_RETAINED',{protocolId,cycleIds});
  if(a.binomialIidAssumptionJustified!==true)return fail('BINOMIAL_IID_OR_EQUIVALENT_MODEL_NOT_JUSTIFIED',{protocolId,cycleIds});
  if(a.currentCycleExchangeabilityVerified!==true)return fail('CURRENT_CYCLE_EXCHANGEABILITY_NOT_VERIFIED',{protocolId,cycleIds});
  if(a.assumptionsSelectedUsingSurvivalOutcomes!==false)return fail('ASSUMPTION_SELECTION_MUST_BE_INDEPENDENT_OF_SURVIVAL_OUTCOMES',{protocolId,cycleIds});
  const commit=text(reviewCommit)?.toLowerCase()||null;
  if(!commit||!SHA.test(commit))return fail('VALID_RACE_ASSUMPTION_REVIEW_COMMIT_REQUIRED',{protocolId,cycleIds});
  if(!approved(commit))return fail('RACE_ASSUMPTION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{protocolId,cycleIds,reviewCommit:commit});
  return {
    version:VERSION,valid:true,reason:'INDEPENDENT_AP_MCCOY_RACE_ASSUMPTION_REVIEW_APPROVED',
    protocolId,cycleIds,bindingScopeKey,assumptionEvidenceId,reviewCommit:commit,
    samplingWindowFrozenBeforeFirstCycle:true,allEligibleDistinctDailyGhtCyclesIncluded:true,
    failedShortAndAmbiguousCyclesRetained:true,binomialIidAssumptionJustified:true,
    completeProspectiveCycleLedgerVerified:true,currentCycleExchangeabilityVerified:true,
    assumptionsSelectedUsingSurvivalOutcomes:false,raceExecutionAssumptionsVerified:true,
    usableForEmpiricalRaceBound:true,usableForExecution:false,
    scientificUse:'Code-owned promotion gate for the AP McCoy empirical-race sampling assumptions. A caller cannot make a Clopper-Pearson race bound executable by setting IID, ledger-complete or exchangeability booleans. A later approved review must document a prospectively frozen sampling window, inclusion of every eligible distinct Daily GHT cycle, retention of failures/short/ambiguous cycles, an explicit binomial-IID or equivalent justification, current-cycle exchangeability, and independence of those choices from observed survival outcomes. This review still cannot authorize money or replace the final independent race-ledger review.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedReviewAllowlist:true,reviewAllowlistCurrentlyEmpty:APPROVED_RACE_ASSUMPTION_REVIEW_COMMITS.size===0,callerBooleansCannotCloseRaceAssumptions:true,completeProspectiveLedgerRequired:true,allEligibleDistinctDailyGhtCyclesRequired:true,ambiguousCyclesCannotBeDropped:true,assumptionSelectionCannotUseOutcomes:true,finalRaceLedgerReviewStillRequired:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}
