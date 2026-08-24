// Fail-closed conditional-EV screen for observable persistent-state games.
//
// This module is deliberately generic. A manufacturer calling a game
// "persistent" or showing a meter is not enough. Execution requires proof that
// the displayed state is economically relevant, visible before the first paid
// wager, survives the prior player's cashout/exit, is inherited by the next
// player, belongs to the exact game/denomination/cabinet configuration, and has
// a prospectively validated conditional-EV model.

export function persistentStateEntryScreen({
  baseRtpPct,
  stateConditionalUpliftPct = null,
  minStakeEUR,
  observedState = null,
  stateVisibleBeforeWager = false,
  stateAffectsProbabilityVerified = false,
  survivesCashoutVerified = false,
  inheritedByNextPlayerVerified = false,
  stateScopeVerified = false,
  resetConditionVerified = false,
  exactGameFingerprintVerified = false,
  exactDenominationVerified = false,
  conditionalEvModelVerified = false,
  prospectiveValidationPassed = false,
} = {}) {
  if (!Number.isFinite(baseRtpPct) || baseRtpPct <= 0 || baseRtpPct > 200) {
    return { blocked: true, reason: 'INVALID_BASE_RTP', executable: false };
  }
  if (!Number.isFinite(minStakeEUR) || minStakeEUR <= 0) {
    return { blocked: true, reason: 'INVALID_MIN_STAKE', executable: false };
  }

  const breakEvenUpliftPct = Math.max(0, 100 - baseRtpPct);
  const upliftKnown = Number.isFinite(stateConditionalUpliftPct);
  const conditionalRtpPct = upliftKnown ? baseRtpPct + stateConditionalUpliftPct : null;

  const gates = {
    stateVisibleBeforeWager,
    stateAffectsProbabilityVerified,
    survivesCashoutVerified,
    inheritedByNextPlayerVerified,
    stateScopeVerified,
    resetConditionVerified,
    exactGameFingerprintVerified,
    exactDenominationVerified,
    conditionalEvModelVerified,
    prospectiveValidationPassed,
  };
  const missingGates = Object.entries(gates).filter(([, value]) => value !== true).map(([key]) => key);

  const positiveConditionalEv = upliftKnown && conditionalRtpPct > 100;
  const atBreakEven = upliftKnown && Math.abs(conditionalRtpPct - 100) < 1e-12;
  const allGatesPassed = missingGates.length === 0;
  const executable = allGatesPassed && positiveConditionalEv;

  return {
    model: 'PERSISTENT_STATE_CONDITIONAL_EV_FAIL_CLOSED',
    baseRtpPct,
    minStakeEUR,
    observedState,
    breakEvenUpliftPct,
    stateConditionalUpliftPct: upliftKnown ? stateConditionalUpliftPct : null,
    conditionalRtpPct,
    positiveConditionalEv,
    atBreakEven,
    missingGates,
    allGatesPassed,
    verdict: executable ? 'CANDIDATE_PLAY' : 'NO_PLAY',
    executable,
    realMoneyAllowed: executable,
    guards: {
      manufacturerPersistenceLabelIsNotInheritanceProof: true,
      visibleMeterIsNotConditionalEvProof: true,
      probabilityIncreaseIsNotEnoughWithoutMagnitude: true,
      sameCabinetFamilyIsNotExactConfigurationProof: true,
      noPaidStateCreationForResearch: true,
    },
  };
}
