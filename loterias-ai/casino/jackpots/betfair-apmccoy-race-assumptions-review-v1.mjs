const VERSION='betfair-apmccoy-race-assumptions-review-v1';
const SHA=/^[0-9a-f]{40}$/;
// Empty until a complete prospective AP McCoy ledger and the statistical
// assumptions used to interpret it are independently reviewed in a later commit.
const APPROVED_RACE_ASSUMPTION_REVIEW_COMMITS=new Set();
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
export function isApprovedBetfairApMcCoyRaceAssumptionReviewCommit(value){const s=text(value)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_RACE_ASSUMPTION_REVIEW_COMMITS.has(s);}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,completeProspectiveCycleLedgerVerified:false,binomialSamplingAssumptionJustified:false,currentCycleExchangeabilityVerified:false,independentRaceAssumptionsReviewed:false,usableForRaceBound:false,usableForExecution:false,execution:execution(),...extra};}

export function reviewBetfairApMcCoyRaceAssumptions({assumptions,reviewCommit}={}){
  const a=assumptions||{};
  const protocolId=text(a.protocolId);if(!protocolId)return fail('PROTOCOL_ID_REQUIRED');
  const ledgerCommit=text(a.completeProspectiveLedgerCommit)?.toLowerCase();if(!ledgerCommit||!SHA.test(ledgerCommit))return fail('COMPLETE_PROSPECTIVE_LEDGER_COMMIT_REQUIRED',{protocolId});
  const rationaleId=text(a.assumptionEvidenceId);if(!rationaleId)return fail('ASSUMPTION_EVIDENCE_ID_REQUIRED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit});
  if(a.completeProspectiveCycleLedgerVerified!==true)return fail('COMPLETE_PROSPECTIVE_CYCLE_LEDGER_NOT_ATTESTED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,assumptionEvidenceId:rationaleId});
  if(a.binomialSamplingAssumptionJustified!==true)return fail('BINOMIAL_SAMPLING_ASSUMPTION_NOT_JUSTIFIED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,assumptionEvidenceId:rationaleId});
  if(a.currentCycleExchangeabilityVerified!==true)return fail('CURRENT_CYCLE_EXCHANGEABILITY_NOT_VERIFIED',{protocolId,completeProspectiveLedgerCommit:ledgerCommit,assumptionEvidenceId:rationaleId});
  const commit=text(reviewCommit)?.toLowerCase();if(!commit||!SHA.test(commit))return fail('VALID_RACE_ASSUMPTION_REVIEW_COMMIT_REQUIRED',{protocolId});
  if(!isApprovedBetfairApMcCoyRaceAssumptionReviewCommit(commit))return fail('RACE_ASSUMPTION_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{protocolId,reviewCommit:commit,completeProspectiveLedgerCommit:ledgerCommit,assumptionEvidenceId:rationaleId});
  return {
    version:VERSION,valid:true,reason:'INDEPENDENT_AP_MCCOY_RACE_ASSUMPTIONS_REVIEW_APPROVED',protocolId,reviewCommit:commit,
    completeProspectiveLedgerCommit:ledgerCommit,assumptionEvidenceId:rationaleId,
    completeProspectiveCycleLedgerVerified:true,binomialSamplingAssumptionJustified:true,currentCycleExchangeabilityVerified:true,
    independentRaceAssumptionsReviewed:true,usableForRaceBound:true,usableForExecution:false,
    scientificUse:'Code-owned review gate for the assumptions required to interpret AP McCoy post-GHT survival outcomes as a binomial race probability. The complete prospective ledger identity, sampling model and current-cycle exchangeability must be documented and independently reviewed. Caller booleans cannot close these assumptions because the review commit itself must be hard-pinned in code. This review does not select a latency, approve a stake, prove a current jackpot state or authorize execution.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedReviewAllowlist:true,reviewAllowlistCurrentlyEmpty:APPROVED_RACE_ASSUMPTION_REVIEW_COMMITS.size===0,completeProspectiveLedgerCommitRequired:true,binomialAssumptionMustBeReviewed:true,currentCycleExchangeabilityMustBeReviewed:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}
