// Mechanism-specific Must-Hit-By / Must-Win-By research model.
//
// Critical rule: NEVER assume every posted-cap progressive has a uniform
// hidden threshold. Public regulatory/manufacturer evidence shows materially
// different mechanisms exist, including value-dependent/staged award odds.
// This module therefore fails closed unless the mechanism-specific inputs
// needed for an EV calculation are independently verified.

export const MHB_MECHANISM = Object.freeze({
  UNIFORM_HIDDEN_THRESHOLD: 'UNIFORM_HIDDEN_THRESHOLD',
  VALUE_DEPENDENT_HAZARD: 'VALUE_DEPENDENT_HAZARD',
  STAGED_HAZARD: 'STAGED_HAZARD',
  UNKNOWN: 'UNKNOWN',
});

function finiteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function blocked(reason, extra = {}) {
  return {
    blocked: true,
    reason,
    economicEvaluationAllowed: false,
    realMoneyAllowed: false,
    ...extra,
  };
}

export function uniformHiddenThresholdConditionalProbability({
  currentValue,
  mustHitByValue,
  meterIncrementFromThisWager,
}) {
  if (![currentValue, mustHitByValue, meterIncrementFromThisWager].every(finiteNumber)) {
    return blocked('MISSING_OR_INVALID_NUMERIC_INPUT');
  }
  if (mustHitByValue <= currentValue) return blocked('CURRENT_AT_OR_ABOVE_MUST_HIT_BY');
  if (meterIncrementFromThisWager < 0) return blocked('NEGATIVE_METER_INCREMENT');

  const remainingToCap = mustHitByValue - currentValue;
  const conditionalAwardProbability = Math.max(0, Math.min(1, meterIncrementFromThisWager / remainingToCap));
  return {
    blocked: false,
    mechanism: MHB_MECHANISM.UNIFORM_HIDDEN_THRESHOLD,
    currentValue,
    mustHitByValue,
    remainingToCap,
    meterIncrementFromThisWager,
    conditionalAwardProbability,
    realMoneyAllowed: false,
  };
}

export function evaluateUniformHiddenThresholdRtp({
  baseRtpExcludingMhb,
  jackpotValueEUR,
  stakeEUR,
  currentValue,
  mustHitByValue,
  meterIncrementFromThisWager,
  thresholdDistributionVerified = false,
  crossingWagerWinsVerified = false,
  meterIncrementFromThisWagerVerified = false,
  baseRtpExcludesMhbVerified = false,
}) {
  const verification = {
    thresholdDistributionVerified,
    crossingWagerWinsVerified,
    meterIncrementFromThisWagerVerified,
    baseRtpExcludesMhbVerified,
  };
  const missing = Object.entries(verification).filter(([, v]) => v !== true).map(([k]) => k);
  if (missing.length) return blocked('UNVERIFIED_MECHANISM_INPUTS', { missingVerification: missing });

  if (![baseRtpExcludingMhb, jackpotValueEUR, stakeEUR].every(finiteNumber) || baseRtpExcludingMhb < 0 || jackpotValueEUR < 0 || stakeEUR <= 0) {
    return blocked('MISSING_OR_INVALID_ECONOMIC_INPUT');
  }

  const p = uniformHiddenThresholdConditionalProbability({ currentValue, mustHitByValue, meterIncrementFromThisWager });
  if (p.blocked) return p;

  const jackpotReturnMultiple = (p.conditionalAwardProbability * jackpotValueEUR) / stakeEUR;
  const totalRtp = baseRtpExcludingMhb + jackpotReturnMultiple;
  return {
    blocked: false,
    mechanism: MHB_MECHANISM.UNIFORM_HIDDEN_THRESHOLD,
    conditionalAwardProbability: p.conditionalAwardProbability,
    jackpotReturnMultiple,
    totalRtp,
    totalRtpPct: totalRtp * 100,
    verification,
    verdict: 'RESEARCH_ONLY',
    realMoneyAllowed: false,
  };
}

// For staged/value-dependent systems the input must already be the WIN
// probability for THIS wager/player, after any qualification threshold,
// multi-player tie/winner-selection rule, and concurrency effect have been
// incorporated. A raw probability that a wager merely qualifies is not
// sufficient (e.g. a table system can have multiple qualifying players and
// award only the lowest RNG value among them).
export function evaluateStagedHazardRtp({
  baseRtpExcludingMhb,
  jackpotValueEUR,
  stakeEUR,
  currentStageWinProbabilityForThisWager,
  winProbabilityForThisWagerVerified = false,
  awardEligibilityVerified = false,
  baseRtpExcludesMhbVerified = false,
}) {
  const verification = { winProbabilityForThisWagerVerified, awardEligibilityVerified, baseRtpExcludesMhbVerified };
  const missing = Object.entries(verification).filter(([, v]) => v !== true).map(([k]) => k);
  if (missing.length) return blocked('UNVERIFIED_STAGE_INPUTS', { missingVerification: missing });

  if (![baseRtpExcludingMhb, jackpotValueEUR, stakeEUR, currentStageWinProbabilityForThisWager].every(finiteNumber)
    || baseRtpExcludingMhb < 0 || jackpotValueEUR < 0 || stakeEUR <= 0
    || currentStageWinProbabilityForThisWager < 0 || currentStageWinProbabilityForThisWager > 1) {
    return blocked('MISSING_OR_INVALID_STAGE_ECONOMIC_INPUT');
  }

  const jackpotReturnMultiple = (currentStageWinProbabilityForThisWager * jackpotValueEUR) / stakeEUR;
  const totalRtp = baseRtpExcludingMhb + jackpotReturnMultiple;
  return {
    blocked: false,
    mechanism: MHB_MECHANISM.STAGED_HAZARD,
    currentStageWinProbabilityForThisWager,
    jackpotReturnMultiple,
    totalRtp,
    totalRtpPct: totalRtp * 100,
    verification,
    verdict: 'RESEARCH_ONLY',
    realMoneyAllowed: false,
  };
}

export function mechanismRequirements(mechanism) {
  if (mechanism === MHB_MECHANISM.UNIFORM_HIDDEN_THRESHOLD) {
    return {
      mechanism,
      required: [
        'thresholdDistributionVerified',
        'crossingWagerWinsVerified',
        'meterIncrementFromThisWagerVerified',
        'baseRtpExcludesMhbVerified',
      ],
      forbiddenAssumption: 'DO_NOT_INFER_UNIFORM_THRESHOLD_FROM_MUST_HIT_BY_LABEL_ALONE',
      realMoneyAllowed: false,
    };
  }
  if (mechanism === MHB_MECHANISM.STAGED_HAZARD || mechanism === MHB_MECHANISM.VALUE_DEPENDENT_HAZARD) {
    return {
      mechanism,
      required: [
        'currentStageWinProbabilityForThisWagerVerified',
        'winnerSelectionAndConcurrencyAlreadyIncorporated',
        'awardEligibilityVerified',
        'baseRtpExcludesMhbVerified',
      ],
      forbiddenAssumption: 'DO_NOT_USE_QUALIFICATION_THRESHOLD_AS_PLAYER_WIN_PROBABILITY_OR_IGNORE_MULTI_PLAYER_WINNER_SELECTION',
      realMoneyAllowed: false,
    };
  }
  return {
    mechanism: MHB_MECHANISM.UNKNOWN,
    required: ['exactMechanismIdentification'],
    forbiddenAssumption: 'NO_EV_WITH_UNKNOWN_MHB_MECHANISM',
    realMoneyAllowed: false,
  };
}
