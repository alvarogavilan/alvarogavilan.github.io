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

export function executionIdentifiabilityGate({absoluteHazardPerWagerEURLowerBound=null}={}){
  if(!(Number.isFinite(absoluteHazardPerWagerEURLowerBound)&&absoluteHazardPerWagerEURLowerBound>0)){
    return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'ABSOLUTE_HAZARD_LOWER_BOUND_NOT_IDENTIFIED'};
  }
  return {decision:'HAZARD_BOUND_AVAILABLE_CONTINUE_OTHER_GATES',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0};
}
