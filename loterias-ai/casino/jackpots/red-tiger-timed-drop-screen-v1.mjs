// Fail-closed screening math for Red Tiger-style timed jackpots.
//
// This module does NOT infer a jackpot hazard curve from a countdown and it
// does NOT turn a network-level drop probability into a player's probability
// of winning.  It answers the narrower question we can solve exactly:
// given a verified base return, stake and timed-jackpot value, what minimum
// PLAYER-LEVEL probability of winning that jackpot on this spin is required
// to reach a target RTP?  A live recommendation is blocked unless every
// Spain-specific input and the player-level probability are independently
// verified.

function finite(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function blocked(reason, extra = {}) {
  return {
    blocked: true,
    reason,
    realMoneyAllowed: false,
    verdict: 'NO_PLAY',
    stakeEUR: 0,
    ...extra,
  };
}

export function requiredPlayerWinProbabilityForBreakeven({
  baseRtpExcludingTimedJackpot,
  otherVerifiedReturn = 0,
  stakeEUR,
  timedJackpotEUR,
  targetRtp = 1,
}) {
  if (![baseRtpExcludingTimedJackpot, otherVerifiedReturn, stakeEUR, timedJackpotEUR, targetRtp].every(finite)) {
    return blocked('MISSING_OR_INVALID_NUMERIC_INPUT');
  }
  if (baseRtpExcludingTimedJackpot < 0 || otherVerifiedReturn < 0 || stakeEUR <= 0 || timedJackpotEUR <= 0 || targetRtp <= 0) {
    return blocked('OUT_OF_RANGE_INPUT');
  }

  const returnGap = Math.max(0, targetRtp - baseRtpExcludingTimedJackpot - otherVerifiedReturn);
  const requiredPlayerWinProbability = (returnGap * stakeEUR) / timedJackpotEUR;
  if (requiredPlayerWinProbability > 1) {
    return blocked('BREAKEVEN_IMPOSSIBLE_EVEN_AT_CERTAIN_JACKPOT_WIN', {
      returnGap,
      requiredPlayerWinProbability,
    });
  }

  return {
    blocked: false,
    returnGap,
    requiredPlayerWinProbability,
    approximatelyOneIn: requiredPlayerWinProbability > 0 ? 1 / requiredPlayerWinProbability : Infinity,
    targetRtp,
    realMoneyAllowed: false,
    verdict: 'RESEARCH_THRESHOLD_ONLY',
  };
}

export function requiredJackpotRtpUpliftMultiple({
  baseRtpExcludingJackpots,
  referenceAverageJackpotRtp,
  targetRtp = 1,
}) {
  if (![baseRtpExcludingJackpots, referenceAverageJackpotRtp, targetRtp].every(finite)
      || baseRtpExcludingJackpots < 0 || referenceAverageJackpotRtp <= 0 || targetRtp <= 0) {
    return blocked('MISSING_OR_INVALID_RTP_INPUT');
  }
  const jackpotRtpNeeded = Math.max(0, targetRtp - baseRtpExcludingJackpots);
  return {
    blocked: false,
    jackpotRtpNeeded,
    requiredUpliftMultiple: jackpotRtpNeeded / referenceAverageJackpotRtp,
    realMoneyAllowed: false,
    verdict: 'RESEARCH_THRESHOLD_ONLY',
  };
}

export function evaluateVerifiedTimedDropState({
  baseRtpExcludingTimedJackpot,
  otherVerifiedReturn = 0,
  stakeEUR,
  timedJackpotEUR,
  playerWinProbabilityThisSpin,
  exactSpainGameAndNetworkVerified = false,
  baseRtpVerified = false,
  stakeEligibilityAndWeightingVerified = false,
  timedJackpotValueFreshAndSameNetwork = false,
  playerLevelWinProbabilityVerified = false,
  concurrencyAndWinnerSelectionIncluded = false,
}) {
  const verification = {
    exactSpainGameAndNetworkVerified,
    baseRtpVerified,
    stakeEligibilityAndWeightingVerified,
    timedJackpotValueFreshAndSameNetwork,
    playerLevelWinProbabilityVerified,
    concurrencyAndWinnerSelectionIncluded,
  };
  const missingVerification = Object.entries(verification).filter(([, v]) => v !== true).map(([k]) => k);
  if (missingVerification.length) return blocked('UNVERIFIED_LIVE_INPUTS', { missingVerification });

  if (!finite(playerWinProbabilityThisSpin) || playerWinProbabilityThisSpin < 0 || playerWinProbabilityThisSpin > 1) {
    return blocked('INVALID_PLAYER_LEVEL_WIN_PROBABILITY');
  }

  const threshold = requiredPlayerWinProbabilityForBreakeven({
    baseRtpExcludingTimedJackpot,
    otherVerifiedReturn,
    stakeEUR,
    timedJackpotEUR,
  });
  if (threshold.blocked) return threshold;

  const timedJackpotReturn = (playerWinProbabilityThisSpin * timedJackpotEUR) / stakeEUR;
  const conservativeTotalRtp = baseRtpExcludingTimedJackpot + otherVerifiedReturn + timedJackpotReturn;
  const aboveBreakeven = conservativeTotalRtp > 1;

  return {
    blocked: false,
    verification,
    requiredPlayerWinProbability: threshold.requiredPlayerWinProbability,
    playerWinProbabilityThisSpin,
    timedJackpotReturn,
    conservativeTotalRtp,
    conservativeTotalRtpPct: conservativeTotalRtp * 100,
    aboveBreakeven,
    // Even after a mathematical pass, execution remains disabled here.  A
    // separate real-money gate must additionally enforce freshness, stake,
    // bankroll/risk policy and manual human review.
    realMoneyAllowed: false,
    verdict: aboveBreakeven ? 'MATHEMATICAL_CANDIDATE_ONLY' : 'NO_PLAY',
    stakeEUR: 0,
  };
}
