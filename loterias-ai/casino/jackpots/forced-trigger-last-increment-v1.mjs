// Distribution-free final-increment screen for must-hit-by / bounded-trigger jackpots.
//
// This is intentionally stricter than a normal MHB EV model. It does NOT assume
// the hidden trigger is uniform (or even continuous). It only asks whether the
// next qualifying wager is guaranteed to cross a verified hard trigger ceiling.
//
// A GREEN result is impossible unless the displayed/current state, trigger basis,
// wager increment, award ownership and concurrency semantics all belong to the
// exact playable configuration. Research or manufacturer documentation alone can
// never satisfy those gates.

export function forcedTriggerLastIncrement({
  currentTriggerBasis,
  maxTriggerBasis,
  minTriggerBasis = null,
  guaranteedIncrementFromNextWager,
  stake,
  jackpotAwardLowerBound,
  baseGameReturnLowerBound = 0,
  stateVisibleToPlayer = false,
  maxTriggerVerified = false,
  sameTriggerBasisVerified = false,
  wagerIncrementVerified = false,
  qualifyingWagerVerified = false,
  crossingWagerOwnsAwardVerified = false,
  noInterveningEligibleWagerVerified = false,
  rulesFingerprintVerified = false,
  prospectiveValidationPassed = false,
} = {}) {
  const nums = [
    currentTriggerBasis,
    maxTriggerBasis,
    guaranteedIncrementFromNextWager,
    stake,
    jackpotAwardLowerBound,
    baseGameReturnLowerBound,
  ];
  if (!nums.every(Number.isFinite)) {
    return { blocked: true, reason: 'MISSING_REQUIRED_NUMERIC_INPUT', executable: false };
  }
  if (
    currentTriggerBasis < 0 ||
    maxTriggerBasis <= 0 ||
    guaranteedIncrementFromNextWager <= 0 ||
    stake <= 0 ||
    jackpotAwardLowerBound < 0 ||
    baseGameReturnLowerBound < 0
  ) {
    return { blocked: true, reason: 'INVALID_NUMERIC_INPUT', executable: false };
  }
  if (minTriggerBasis != null && (!Number.isFinite(minTriggerBasis) || minTriggerBasis < 0 || minTriggerBasis >= maxTriggerBasis)) {
    return { blocked: true, reason: 'INVALID_TRIGGER_RANGE', executable: false };
  }

  const gates = {
    stateVisibleToPlayer,
    maxTriggerVerified,
    sameTriggerBasisVerified,
    wagerIncrementVerified,
    qualifyingWagerVerified,
    crossingWagerOwnsAwardVerified,
    noInterveningEligibleWagerVerified,
    rulesFingerprintVerified,
    prospectiveValidationPassed,
  };
  const missingGates = Object.entries(gates).filter(([, v]) => v !== true).map(([k]) => k);

  const distanceToMax = maxTriggerBasis - currentTriggerBasis;
  const nextBasisLowerBound = currentTriggerBasis + guaranteedIncrementFromNextWager;
  const crossesHardMax = nextBasisLowerBound >= maxTriggerBasis;

  // If the exact mechanism guarantees that every trigger lies at or below max,
  // then crossing max on the next eligible wager forces the event irrespective
  // of the unknown trigger distribution. This theorem says nothing about states
  // further from max.
  const forcedTriggerProven = crossesHardMax && missingGates.length === 0;

  const grossReturnLowerBound = baseGameReturnLowerBound + jackpotAwardLowerBound;
  const netProfitLowerBound = grossReturnLowerBound - stake;
  const returnOnStakeLowerBound = grossReturnLowerBound / stake;

  return {
    blocked: missingGates.length > 0,
    model: 'DISTRIBUTION_FREE_HARD_MAX_NEXT_WAGER_CROSSING',
    assumptions: {
      noUniformTriggerAssumption: true,
      noParametricHazardAssumption: true,
      requiresAwardToCrossingWager: true,
      requiresNoInterveningEligibleWager: true,
    },
    distanceToMax,
    nextBasisLowerBound,
    crossesHardMax,
    forcedTriggerProven,
    grossReturnLowerBound,
    netProfitLowerBound,
    returnOnStakeLowerBound,
    returnOnStakeLowerBoundPct: returnOnStakeLowerBound * 100,
    positiveEvLowerBound: forcedTriggerProven && netProfitLowerBound > 0,
    verdict: forcedTriggerProven && netProfitLowerBound > 0 ? 'CANDIDATE_PLAY' : 'NO_PLAY',
    missingGates,
    executable: forcedTriggerProven && netProfitLowerBound > 0,
  };
}

// Roulette jackpots such as EGT Diamond Number require a different treatment:
// crossing the trigger threshold starts a jackpot game, but does not prove that
// the bettor who caused the crossing receives the jackpot. A straight-number
// coverage strategy can only be evaluated after the trigger-game winner and
// split semantics are verified for the exact installation.
export function forcedRouletteCoverageScreen({
  wheelNumbers,
  straightStakePerNumber,
  jackpotAwardLowerBound,
  triggerOnNextGameProven = false,
  fullStraightCoverageAllowedVerified = false,
  jackpotPaidToWinningNumberStraightBettorsVerified = false,
  soleEligibleJackpotBettorVerified = false,
  exactSingleGamePayoutMultiple,
  rulesFingerprintVerified = false,
  prospectiveValidationPassed = false,
} = {}) {
  const nums = [wheelNumbers, straightStakePerNumber, jackpotAwardLowerBound, exactSingleGamePayoutMultiple];
  if (!nums.every(Number.isFinite)) return { blocked: true, reason: 'MISSING_REQUIRED_NUMERIC_INPUT', executable: false };
  if (!Number.isInteger(wheelNumbers) || wheelNumbers < 2 || straightStakePerNumber <= 0 || jackpotAwardLowerBound < 0 || exactSingleGamePayoutMultiple <= 0) {
    return { blocked: true, reason: 'INVALID_NUMERIC_INPUT', executable: false };
  }

  const gates = {
    triggerOnNextGameProven,
    fullStraightCoverageAllowedVerified,
    jackpotPaidToWinningNumberStraightBettorsVerified,
    soleEligibleJackpotBettorVerified,
    rulesFingerprintVerified,
    prospectiveValidationPassed,
  };
  const missingGates = Object.entries(gates).filter(([, v]) => v !== true).map(([k]) => k);

  const totalStake = wheelNumbers * straightStakePerNumber;
  // payout multiple is gross return including the winning straight stake.
  const ordinaryGrossReturn = exactSingleGamePayoutMultiple * straightStakePerNumber;
  const ordinaryNet = ordinaryGrossReturn - totalStake;
  const guaranteedGrossReturn = ordinaryGrossReturn + jackpotAwardLowerBound;
  const guaranteedNet = guaranteedGrossReturn - totalStake;

  const proven = missingGates.length === 0;
  return {
    blocked: !proven,
    model: 'FORCED_TRIGGER_FULL_STRAIGHT_COVERAGE',
    totalStake,
    ordinaryGrossReturn,
    ordinaryNet,
    guaranteedGrossReturn,
    guaranteedNet,
    positiveEvLowerBound: proven && guaranteedNet > 0,
    verdict: proven && guaranteedNet > 0 ? 'CANDIDATE_PLAY' : 'NO_PLAY',
    missingGates,
    executable: proven && guaranteedNet > 0,
  };
}
