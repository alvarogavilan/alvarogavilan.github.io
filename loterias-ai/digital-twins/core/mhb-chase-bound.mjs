export const BINDING=Object.freeze({
  VERIFIED_OPERATOR_BOUND:'VERIFIED_OPERATOR_BOUND',
  VERIFIED_PROVIDER_BOUND:'VERIFIED_PROVIDER_BOUND',
  EMPIRICAL_OPERATOR_BOUND:'EMPIRICAL_OPERATOR_BOUND',
  UNKNOWN:'UNKNOWN'
});

function finitePositive(x){return Number.isFinite(Number(x))&&Number(x)>0;}
function acceptableBinding(x){return x===BINDING.VERIFIED_OPERATOR_BOUND||x===BINDING.VERIFIED_PROVIDER_BOUND;}

// CONDITIONAL theorem only.
// If jackpot-trigger exposure is proportional to eligible wager weight, our relative
// per-EUR weight is lower-bounded by r, and our wager-flow share is stable/non-adversarial
// throughout the chase, then the jackpot-return component per own EUR is bounded below by
// r * c * B/(B-p), where c is the tier's meter funding per total network EUR, p the current
// meter and B the MHB boundary. The worst hit amount is B; an earlier hit improves the ratio.
// This is NOT a distribution-free MHB theorem. Missing bindings force NO_PLAY.
export function conditionalChaseLowerReturn({
  baseRtpRatio,
  currentAmountEUR,
  boundaryEUR,
  tierFundingPerNetworkEUR,
  relativeHazardWeightLowerBound=0
}={}){
  if(!(Number.isFinite(baseRtpRatio)&&baseRtpRatio>=0&&baseRtpRatio<1)) throw new Error('VALID_BASE_RTP_RATIO_REQUIRED');
  if(!finitePositive(currentAmountEUR)||!finitePositive(boundaryEUR)||!(boundaryEUR>currentAmountEUR)) throw new Error('LIVE_AMOUNT_INSIDE_BOUNDARY_REQUIRED');
  if(!(Number.isFinite(tierFundingPerNetworkEUR)&&tierFundingPerNetworkEUR>0&&tierFundingPerNetworkEUR<1)) throw new Error('VALID_TIER_FUNDING_RATE_REQUIRED');
  if(!(Number.isFinite(relativeHazardWeightLowerBound)&&relativeHazardWeightLowerBound>=0)) throw new Error('NONNEGATIVE_RELATIVE_HAZARD_WEIGHT_REQUIRED');
  const gapEUR=boundaryEUR-currentAmountEUR;
  const jackpotReturnLower=relativeHazardWeightLowerBound*tierFundingPerNetworkEUR*boundaryEUR/gapEUR;
  return {baseRtpRatio,gapEUR,jackpotReturnLower,totalReturnLower:baseRtpRatio+jackpotReturnLower};
}

export function requiredRelativeHazardWeight({baseRtpRatio,currentAmountEUR,boundaryEUR,tierFundingPerNetworkEUR}={}){
  if(!(Number.isFinite(baseRtpRatio)&&baseRtpRatio>=0&&baseRtpRatio<1)) throw new Error('VALID_BASE_RTP_RATIO_REQUIRED');
  if(!finitePositive(currentAmountEUR)||!finitePositive(boundaryEUR)||!(boundaryEUR>currentAmountEUR)) throw new Error('LIVE_AMOUNT_INSIDE_BOUNDARY_REQUIRED');
  if(!(Number.isFinite(tierFundingPerNetworkEUR)&&tierFundingPerNetworkEUR>0&&tierFundingPerNetworkEUR<1)) throw new Error('VALID_TIER_FUNDING_RATE_REQUIRED');
  return (1-baseRtpRatio)*(boundaryEUR-currentAmountEUR)/(tierFundingPerNetworkEUR*boundaryEUR);
}

export function thresholdAmountForRelativeWeight({baseRtpRatio,boundaryEUR,tierFundingPerNetworkEUR,relativeHazardWeightLowerBound}={}){
  if(!(Number.isFinite(baseRtpRatio)&&baseRtpRatio>=0&&baseRtpRatio<1)) throw new Error('VALID_BASE_RTP_RATIO_REQUIRED');
  if(!finitePositive(boundaryEUR)) throw new Error('POSITIVE_BOUNDARY_REQUIRED');
  if(!(Number.isFinite(tierFundingPerNetworkEUR)&&tierFundingPerNetworkEUR>0&&tierFundingPerNetworkEUR<1)) throw new Error('VALID_TIER_FUNDING_RATE_REQUIRED');
  if(!(Number.isFinite(relativeHazardWeightLowerBound)&&relativeHazardWeightLowerBound>0)) throw new Error('POSITIVE_RELATIVE_WEIGHT_REQUIRED');
  return boundaryEUR-(relativeHazardWeightLowerBound*tierFundingPerNetworkEUR*boundaryEUR/(1-baseRtpRatio));
}

export function realizedChaseReturnAtHit({baseRtpRatio,startAmountEUR,hitAmountEUR,tierFundingPerNetworkEUR,relativeHazardWeight=1}={}){
  if(!(Number.isFinite(baseRtpRatio)&&baseRtpRatio>=0&&baseRtpRatio<1)) throw new Error('VALID_BASE_RTP_RATIO_REQUIRED');
  if(!finitePositive(startAmountEUR)||!finitePositive(hitAmountEUR)||!(hitAmountEUR>startAmountEUR)) throw new Error('HIT_AFTER_START_REQUIRED');
  if(!(Number.isFinite(tierFundingPerNetworkEUR)&&tierFundingPerNetworkEUR>0&&tierFundingPerNetworkEUR<1)) throw new Error('VALID_TIER_FUNDING_RATE_REQUIRED');
  if(!(Number.isFinite(relativeHazardWeight)&&relativeHazardWeight>=0)) throw new Error('NONNEGATIVE_RELATIVE_WEIGHT_REQUIRED');
  const jackpotReturn=relativeHazardWeight*tierFundingPerNetworkEUR*hitAmountEUR/(hitAmountEUR-startAmountEUR);
  return {hitAmountEUR,jackpotReturn,totalReturn:baseRtpRatio+jackpotReturn};
}

export function chaseExecutionGate({
  baseRtpRatio,currentAmountEUR,boundaryEUR,tierFundingPerNetworkEUR,
  relativeHazardWeightLowerBound,
  runtimeBinding=BINDING.UNKNOWN,
  tierFundingBinding=BINDING.UNKNOWN,
  stakeHazardProportionalityBinding=BINDING.UNKNOWN,
  crossGameRelativeWeightBinding=BINDING.UNKNOWN,
  stableFlowShareBinding=BINDING.UNKNOWN,
  acceptedWagerOrderingVerified=false,
  displayFreshnessVerified=false,
  conservativeMargin=0
}={}){
  if(!acceptableBinding(runtimeBinding)) return {decision:'NO_PLAY',reason:'LIVE_OPERATOR_RUNTIME_BINDING_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  if(!acceptableBinding(tierFundingBinding)) return {decision:'NO_PLAY',reason:'TIER_FUNDING_RATE_BINDING_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  if(!acceptableBinding(stakeHazardProportionalityBinding)) return {decision:'NO_PLAY',reason:'STAKE_TO_HAZARD_PROPORTIONALITY_NOT_BOUND',realMoneyAllowed:false,realStakeEUR:0};
  if(!acceptableBinding(crossGameRelativeWeightBinding)) return {decision:'NO_PLAY',reason:'CROSS_GAME_RELATIVE_HAZARD_WEIGHT_NOT_BOUND',realMoneyAllowed:false,realStakeEUR:0};
  if(!acceptableBinding(stableFlowShareBinding)) return {decision:'NO_PLAY',reason:'STABLE_NON_ADVERSARIAL_WAGER_FLOW_NOT_BOUND',realMoneyAllowed:false,realStakeEUR:0};
  if(!(Number.isFinite(relativeHazardWeightLowerBound)&&relativeHazardWeightLowerBound>0)) return {decision:'NO_PLAY',reason:'POSITIVE_RELATIVE_HAZARD_WEIGHT_LOWER_BOUND_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  if(!acceptedWagerOrderingVerified) return {decision:'NO_PLAY',reason:'ACCEPTED_WAGER_ORDERING_NOT_VERIFIED',realMoneyAllowed:false,realStakeEUR:0};
  if(!displayFreshnessVerified) return {decision:'NO_PLAY',reason:'LIVE_DISPLAY_FRESHNESS_NOT_VERIFIED',realMoneyAllowed:false,realStakeEUR:0};
  const bound=conditionalChaseLowerReturn({baseRtpRatio,currentAmountEUR,boundaryEUR,tierFundingPerNetworkEUR,relativeHazardWeightLowerBound});
  const required=1+Math.max(0,Number(conservativeMargin)||0);
  if(!(bound.totalReturnLower>required)) return {decision:'NO_PLAY',reason:'CHASE_LOWER_BOUND_NOT_POSITIVE_EV',...bound,requiredReturnRatio:required,realMoneyAllowed:false,realStakeEUR:0};
  return {decision:'GREEN_MATH_ONLY_REQUIRES_SESSION_RISK_CAP',reason:'CONDITIONAL_CHASE_LOWER_BOUND_GT_REQUIRED_RETURN',...bound,requiredReturnRatio:required,realMoneyAllowed:false,realStakeEUR:0};
}
