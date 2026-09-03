export function breakEvenHazardPerWagerEUR({baseRtpRatio,jackpotAwardEUR}){
  if(!(baseRtpRatio>=0&&baseRtpRatio<1)) throw new Error('BASE_RTP_RATIO_RANGE');
  if(!(jackpotAwardEUR>0)) throw new Error('POSITIVE_JACKPOT_REQUIRED');
  return (1-baseRtpRatio)/jackpotAwardEUR;
}

// Exact counterexample proof, not a real-hazard estimator.
// Published within-title proportionality implies p(stake|state)=q(state)*stake,
// but does not identify q(state). If both witnesses are valid probabilities at
// the largest candidate Total Bet, the same public qualitative constraints can
// admit opposite EV signs.
export function proportionalHazardIdentifiabilityWitness({baseRtpRatio,jackpotAwardEUR,maxCandidateTotalBetEUR}){
  if(!(maxCandidateTotalBetEUR>0)) throw new Error('POSITIVE_MAX_CANDIDATE_TOTAL_BET_REQUIRED');
  const qBreakEven=breakEvenHazardPerWagerEUR({baseRtpRatio,jackpotAwardEUR});
  const qLow=qBreakEven/2;
  const qHigh=qBreakEven*2;
  const pLowAtMax=qLow*maxCandidateTotalBetEUR;
  const pHighAtMax=qHigh*maxCandidateTotalBetEUR;
  const lowReturnRatio=baseRtpRatio+qLow*jackpotAwardEUR;
  const highReturnRatio=baseRtpRatio+qHigh*jackpotAwardEUR;
  const feasible=pHighAtMax<1;
  return {
    qBreakEven,
    lowWitness:{hazardPerWagerEUR:qLow,probabilityAtMaxCandidateTotalBet:pLowAtMax,returnRatio:lowReturnRatio},
    highWitness:{hazardPerWagerEUR:qHigh,probabilityAtMaxCandidateTotalBet:pHighAtMax,returnRatio:highReturnRatio},
    exactRelations:{lowReturnBelowOne:lowReturnRatio<1,highReturnAboveOne:highReturnRatio>1},
    feasible,
    conclusion:feasible?'ABSOLUTE_HAZARD_COEFFICIENT_NOT_IDENTIFIED_BY_QUALITATIVE_PUBLIC_RULES':'USE_SMALLER_WITNESS_MULTIPLIERS_OR_DIRECT_BOUND_ANALYSIS',
    execution:'NO_PLAY',
    hardGuard:'SYNTHETIC_WITNESSES_ARE_LOGICAL_COUNTEREXAMPLES_ONLY_NOT_EMPIRICAL_PROBABILITIES'
  };
}

// Logical counterexample for must-be-won-by systems.
// The public statements "chance increases with pot value" + "must be won by B"
// do not force any positive numerical hazard at an earlier state x<B. For every
// epsilon>0 small enough to be a valid probability per EUR at the candidate bet,
// a non-decreasing hazard curve can stay at epsilon through x and rise only in the
// final interval before B. Therefore proximity to B is not itself an EV lower bound.
export function mhbMonotonePreCapNonIdentificationWitness({
  currentAmountEUR,
  boundaryEUR,
  epsilonHazardPerWagerEUR=1e-12,
  maxCandidateTotalBetEUR=1
}){
  if(!(currentAmountEUR>0&&boundaryEUR>currentAmountEUR)) throw new Error('CURRENT_AMOUNT_BELOW_BOUNDARY_REQUIRED');
  if(!(epsilonHazardPerWagerEUR>0)) throw new Error('POSITIVE_EPSILON_REQUIRED');
  if(!(maxCandidateTotalBetEUR>0)) throw new Error('POSITIVE_MAX_CANDIDATE_TOTAL_BET_REQUIRED');
  const pAtCurrent=epsilonHazardPerWagerEUR*maxCandidateTotalBetEUR;
  if(!(pAtCurrent<1)) throw new Error('EPSILON_MUST_DEFINE_VALID_PROBABILITY');
  const gapEUR=boundaryEUR-currentAmountEUR;
  const fractionOfBoundary=currentAmountEUR/boundaryEUR;
  return {
    currentAmountEUR,
    boundaryEUR,
    gapEUR,
    fractionOfBoundary,
    witnessHazardPerWagerEURAtCurrent:epsilonHazardPerWagerEUR,
    probabilityAtMaxCandidateTotalBet:pAtCurrent,
    construction:'NONDECREASING_CURVE_MAY_REMAIN_AT_EPSILON_THROUGH_CURRENT_STATE_AND_INCREASE_ARBITRARILY_STEEPLY_ONLY_NEAR_MHB_BOUNDARY',
    satisfiesQualitativeIncreasingRule:true,
    compatibleWithMustBeWonByBoundary:true,
    conclusion:'NO_POSITIVE_PRE_CAP_HAZARD_LOWER_BOUND_FROM_MHB_PLUS_MONOTONICITY_ALONE',
    execution:'NO_PLAY',
    hardGuard:'SYNTHETIC_LOGICAL_WITNESS_ONLY_NOT_A_MODEL_OF_BLUEPRINT_OR_ANY_REAL_JACKPOT'
  };
}

export function executionIdentifiabilityGate({absoluteHazardPerWagerEURLowerBound=null}={}){
  if(!(Number.isFinite(absoluteHazardPerWagerEURLowerBound)&&absoluteHazardPerWagerEURLowerBound>0)){
    return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'ABSOLUTE_HAZARD_LOWER_BOUND_NOT_IDENTIFIED'};
  }
  return {decision:'HAZARD_BOUND_AVAILABLE_CONTINUE_OTHER_GATES',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0};
}
