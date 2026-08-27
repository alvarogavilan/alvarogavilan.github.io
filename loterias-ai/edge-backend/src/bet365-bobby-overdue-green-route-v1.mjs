const VERSION='bet365-bobby-overdue-green-route-v1';
const ECONOMICS_VERSION='bet365-bobby-overdue-economics-screen-v1';
const CALIBRATION_VERSION='bet365-sporting-prospective-calibration-v1';
const RACE_VERSION='sporting-legends-empirical-race-bound-v1.2-explicit-binomial-assumptions';
const SHA=/^[0-9a-f]{40}$/;

// Deliberately empty. A real prospective artifact must be independently reviewed,
// committed, then explicitly pinned by a later code review before this route can promote.
const APPROVED_SESSION_BINDING_REVIEW_COMMITS=new Set();
const APPROVED_SERVED_STAKE_REVIEW_COMMITS=new Set();
const APPROVED_OPERATOR_RULE_REVIEW_COMMITS=new Set();
const APPROVED_RACE_LEDGER_REVIEW_COMMITS=new Set();

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
function approved(set,v){const s=text(v)?.toLowerCase();return !!s&&SHA.test(s)&&set.has(s);}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,greenCandidate:false,independentReviewClosed:false,usableForExecution:false,execution:execution(),...extra};}

export function evaluateBet365BobbyOverdueGreenRoute({economicsScreen,prospectiveCalibration,raceEvidence,independentReview}={}){
  if(!economicsScreen||economicsScreen.version!==ECONOMICS_VERSION||economicsScreen.valid!==true)return fail('VALID_BOBBY_ECONOMICS_SCREEN_REQUIRED');
  if(economicsScreen.probabilityScreenPassed!==true)return fail('ECONOMIC_RACE_THRESHOLD_NOT_CLEARED');
  if(finite(economicsScreen.stakeEUR)!==0.10)return fail('EXACT_TEN_CENT_ECONOMICS_REQUIRED');
  if(!(finite(economicsScreen.currentDailyJackpotEUR)>0))return fail('CURRENT_DAILY_JACKPOT_REQUIRED');
  if(!(finite(economicsScreen.firstBetProbabilityLowerBound)>finite(economicsScreen.breakEvenFirstBetProbability)))return fail('RACE_LOWER_BOUND_NOT_ABOVE_BREAK_EVEN');

  if(!prospectiveCalibration||prospectiveCalibration.version!==CALIBRATION_VERSION||prospectiveCalibration.valid!==true)return fail('VALID_PROSPECTIVE_DUAL_FEED_CALIBRATION_REQUIRED');
  if(prospectiveCalibration.prospectiveCalibrationCandidate!==true||prospectiveCalibration.empiricalModernResponseMappingVerified!==true||prospectiveCalibration.allCapturesStrictlyAfterFreezeCommit!==true)return fail('PROSPECTIVE_CALIBRATION_NOT_CLOSED');

  if(!raceEvidence||raceEvidence.version!==RACE_VERSION||raceEvidence.valid!==true)return fail('VALID_PROSPECTIVE_RACE_EVIDENCE_REQUIRED');
  if(raceEvidence.source!=='VALIDATED_PASSIVE_CYCLE_LEDGER'||raceEvidence.usableForExecution!==true||raceEvidence.executionAssumptionsClosed!==true)return fail('RACE_LEDGER_EXECUTION_ASSUMPTIONS_NOT_CLOSED');
  if(!(finite(raceEvidence.firstBetRaceProbabilityLowerBound)>finite(economicsScreen.breakEvenFirstBetProbability)))return fail('REVIEWED_RACE_BOUND_NOT_ABOVE_BREAK_EVEN');

  const review=independentReview||{};
  const reviewStatus={
    sessionBindingReviewApproved:approved(APPROVED_SESSION_BINDING_REVIEW_COMMITS,review.sessionBindingReviewCommit),
    servedStakeReviewApproved:approved(APPROVED_SERVED_STAKE_REVIEW_COMMITS,review.servedStakeReviewCommit),
    operatorRuleReviewApproved:approved(APPROVED_OPERATOR_RULE_REVIEW_COMMITS,review.operatorRuleReviewCommit),
    raceLedgerReviewApproved:approved(APPROVED_RACE_LEDGER_REVIEW_COMMITS,review.raceLedgerReviewCommit),
  };
  const independentReviewClosed=Object.values(reviewStatus).every(Boolean);
  if(!independentReviewClosed)return fail('INDEPENDENT_REVIEW_ALLOWLIST_REQUIRED',{reviewStatus,independentReviewClosed});

  return {
    version:VERSION,
    valid:true,
    reason:'ALL_REVIEWED_BOBBY_OVERDUE_GATES_CLOSED_FINAL_FRESH_STATE_RECHECK_STILL_REQUIRED',
    greenCandidate:true,
    independentReviewClosed:true,
    reviewStatus,
    stakeEUR:0.10,
    currentDailyJackpotEUR:finite(economicsScreen.currentDailyJackpotEUR),
    breakEvenFirstBetProbability:finite(economicsScreen.breakEvenFirstBetProbability),
    reviewedRaceProbabilityLowerBound:finite(raceEvidence.firstBetRaceProbabilityLowerBound),
    usableForExecution:false,
    finalFreshStateRecheckRequired:true,
    execution:execution(),
    scientificUse:'Fail-closed final review gate for the bet365 Spain Bobby George timed-overdue hypothesis. It does not trust caller booleans for session ownership, served stake, operator-rule adoption or race-ledger review. Each must be independently reviewed and its exact review commit explicitly allowlisted in code. The allowlists are deliberately empty until real prospective artifacts exist. Even after all reviews close, a final fresh same-binding state recheck is mandatory before any separate execution authority could be considered.',
    hardGuards:{onlineOnly:true,nonPromoOnly:true,codeOwnedReviewAllowlists:true,allReviewAllowlistsCurrentlyEmpty:true,callerCannotSelfAttestIndependentReview:true,prospectiveCalibrationRequired:true,validatedPassiveRaceLedgerRequired:true,reviewedRaceBoundMustBeatBreakEven:true,finalFreshStateRecheckRequired:true,thisRouteNeverDirectlyAuthorizesMoney:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false},
  };
}
