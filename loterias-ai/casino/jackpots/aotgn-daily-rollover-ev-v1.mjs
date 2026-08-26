const finitePositive = (v) => v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) > 0;

export function evaluateAotgnDailyRolloverWindow({
  rulesSourceVerified = false,
  dailyActiveVerified = false,
  rolloverWithoutActivationVerified = false,
  firstNetworkContributionPrecommitAttainableVerified = false,
  currentDailyJackpotEUR = null,
  stakeEUR = null,
  sameSessionFreshnessVerified = false,
  prospectivePassiveValidationPassed = false,
} = {}) {
  const numericReady = finitePositive(currentDailyJackpotEUR) && finitePositive(stakeEUR);
  const deterministicConditionVerified =
    rulesSourceVerified === true &&
    dailyActiveVerified === true &&
    rolloverWithoutActivationVerified === true &&
    firstNetworkContributionPrecommitAttainableVerified === true &&
    sameSessionFreshnessVerified === true;

  // Deliberately ignore every possible base-game return. If the first
  // contribution is guaranteed to win the displayed Daily jackpot, the
  // worst-case net lower bound is simply jackpot minus stake.
  const worstCaseNetLowerBoundEUR = deterministicConditionVerified && numericReady
    ? Number(currentDailyJackpotEUR) - Number(stakeEUR)
    : null;
  const positiveEvLowerBoundProven = worstCaseNetLowerBoundEUR !== null && worstCaseNetLowerBoundEUR > 0;
  const executionCandidate = positiveEvLowerBoundProven && prospectivePassiveValidationPassed === true;

  return {
    version: 'aotgn-daily-rollover-ev-v1',
    model: 'DETERMINISTIC_FIRST_CONTRIBUTION_WORST_CASE_LOWER_BOUND',
    deterministicConditionVerified,
    numericReady,
    currentDailyJackpotEUR: finitePositive(currentDailyJackpotEUR) ? Number(currentDailyJackpotEUR) : null,
    stakeEUR: finitePositive(stakeEUR) ? Number(stakeEUR) : null,
    conditionalJackpotWinProbability: deterministicConditionVerified ? 1 : null,
    assumedBaseGameReturnEUR: 0,
    worstCaseNetLowerBoundEUR,
    positiveEvLowerBoundProven,
    prospectivePassiveValidationPassed: prospectivePassiveValidationPassed === true,
    executionCandidate,
    decision: executionCandidate ? 'CONDITIONAL_EXECUTION_CANDIDATE_REQUIRES_EXECUTION_CONTRACT' : 'NO_PLAY',
    blockers: [
      ...(rulesSourceVerified ? [] : ['SPANISH_ROLLOVER_RULE_NOT_VERIFIED']),
      ...(dailyActiveVerified ? [] : ['DAILY_NOT_VERIFIED_ACTIVE']),
      ...(rolloverWithoutActivationVerified ? [] : ['ROLLOVER_WITHOUT_ACTIVATION_NOT_VERIFIED']),
      ...(firstNetworkContributionPrecommitAttainableVerified ? [] : ['FIRST_NETWORK_CONTRIBUTION_PRECOMMIT_ATTAINABILITY_NOT_VERIFIED']),
      ...(sameSessionFreshnessVerified ? [] : ['CURRENT_SAME_SESSION_STATE_NOT_VERIFIED']),
      ...(numericReady ? [] : ['CURRENT_DAILY_OR_STAKE_MISSING']),
      ...(prospectivePassiveValidationPassed ? [] : ['PROSPECTIVE_PASSIVE_VALIDATION_MISSING']),
    ],
    guards: {
      baseRtpNotNeededForLowerBound: true,
      normalJackpotHazardNotNeededInsideVerifiedDeterministicWindow: true,
      firstContributionCannotBeAssumed: true,
      externalExecutionContractRequired: true,
      realMoneyAllowed: false,
    },
  };
}
