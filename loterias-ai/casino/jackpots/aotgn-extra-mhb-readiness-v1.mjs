const finiteNonNegative = (v) => v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) >= 0;

export function evaluateAotgnExtraMhbReadiness({
  rulesSourceVerified = false,
  extraActiveVerified = false,
  spanishMarketNetworkBindingVerified = false,
  currentAognjp3EurGlobalRowVerified = false,
  sameSessionFreshnessVerified = false,
  currentExtraJackpotEUR = null,
  guaranteedHitAmountEUR = null,
  thresholdWinnerAllocationVerified = false,
  prospectivePassiveValidationPassed = false,
} = {}) {
  const current = finiteNonNegative(currentExtraJackpotEUR) ? Number(currentExtraJackpotEUR) : null;
  const cap = finiteNonNegative(guaranteedHitAmountEUR) ? Number(guaranteedHitAmountEUR) : null;
  const numericReady = current !== null && cap !== null && cap > 0;
  const distanceToGuaranteedHitAmountEUR = numericReady ? cap - current : null;
  const stateBeforeGuaranteedHit = distanceToGuaranteedHitAmountEUR !== null && distanceToGuaranteedHitAmountEUR > 0;
  const proximityPct = numericReady && current >= 0 ? (current / cap) * 100 : null;

  const stateIdentityReady =
    rulesSourceVerified === true &&
    extraActiveVerified === true &&
    spanishMarketNetworkBindingVerified === true &&
    currentAognjp3EurGlobalRowVerified === true &&
    sameSessionFreshnessVerified === true &&
    numericReady &&
    stateBeforeGuaranteedHit;

  const readyForEconomicModel =
    stateIdentityReady &&
    thresholdWinnerAllocationVerified === true &&
    prospectivePassiveValidationPassed === true;

  return {
    version: 'aotgn-extra-mhb-readiness-v1',
    model: 'AMOUNT_GUARANTEE_STATE_READINESS_ONLY',
    stateIdentityReady,
    numericReady,
    currentExtraJackpotEUR: current,
    guaranteedHitAmountEUR: cap,
    distanceToGuaranteedHitAmountEUR,
    proximityPct,
    thresholdWinnerAllocationVerified: thresholdWinnerAllocationVerified === true,
    prospectivePassiveValidationPassed: prospectivePassiveValidationPassed === true,
    readyForEconomicModel,
    positiveEvProven: false,
    executionCandidate: false,
    decision: 'NO_PLAY',
    blockers: [
      ...(rulesSourceVerified ? [] : ['SPANISH_EXTRA_RULE_NOT_VERIFIED']),
      ...(extraActiveVerified ? [] : ['EXTRA_NOT_VERIFIED_ACTIVE']),
      ...(spanishMarketNetworkBindingVerified ? [] : ['SPANISH_MARKET_NETWORK_BINDING_NOT_VERIFIED']),
      ...(currentAognjp3EurGlobalRowVerified ? [] : ['CURRENT_AOGNJP3_EUR_GLOBAL_ROW_NOT_VERIFIED']),
      ...(sameSessionFreshnessVerified ? [] : ['CURRENT_SAME_SESSION_STATE_NOT_VERIFIED']),
      ...(numericReady ? [] : ['CURRENT_EXTRA_OR_GUARANTEED_HIT_AMOUNT_MISSING']),
      ...(numericReady && !stateBeforeGuaranteedHit ? ['CAP_ALREADY_REACHED_OR_STALE_STATE'] : []),
      ...(thresholdWinnerAllocationVerified ? [] : ['THRESHOLD_WINNER_ALLOCATION_NOT_VERIFIED']),
      ...(prospectivePassiveValidationPassed ? [] : ['PROSPECTIVE_PASSIVE_VALIDATION_MISSING']),
      'ECONOMIC_MODEL_NOT_IMPLEMENTED',
    ],
    guards: {
      observationalDistanceOnly: true,
      proximityIsNotProbability: true,
      distanceIsNotEv: true,
      capCrossingWinnerCannotBeAssumed: true,
      foreignTickerStateTransferBlocked: true,
      spanishMarketNetworkBindingRequired: true,
      noBetting: true,
      realMoneyAllowed: false,
    },
  };
}
