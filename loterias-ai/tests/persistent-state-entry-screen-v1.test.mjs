import assert from 'node:assert/strict';
import { persistentStateEntryScreen } from '../casino/jackpots/persistent-state-entry-screen-v1.mjs';

const common = {
  baseRtpPct: 94.53,
  minStakeEUR: 0.80,
  observedState: { peanutState: 'HIGH_RESEARCH_EXAMPLE_ONLY' },
  stateVisibleBeforeWager: true,
  stateAffectsProbabilityVerified: true,
  survivesCashoutVerified: true,
  inheritedByNextPlayerVerified: true,
  stateScopeVerified: true,
  resetConditionVerified: true,
  exactGameFingerprintVerified: true,
  exactDenominationVerified: true,
  conditionalEvModelVerified: true,
  prospectiveValidationPassed: true,
};

const unknown = persistentStateEntryScreen({
  baseRtpPct: 94.53,
  minStakeEUR: 0.80,
  stateAffectsProbabilityVerified: true,
});
assert.equal(unknown.breakEvenUpliftPct, 5.47);
assert.equal(unknown.stateConditionalUpliftPct, null);
assert.equal(unknown.positiveConditionalEv, false);
assert.equal(unknown.executable, false);
assert.equal(unknown.verdict, 'NO_PLAY');

const inheritanceMissing = persistentStateEntryScreen({
  ...common,
  stateConditionalUpliftPct: 6,
  inheritedByNextPlayerVerified: false,
});
assert.equal(inheritanceMissing.conditionalRtpPct, 100.53);
assert.equal(inheritanceMissing.positiveConditionalEv, true);
assert.equal(inheritanceMissing.executable, false);
assert.ok(inheritanceMissing.missingGates.includes('inheritedByNextPlayerVerified'));

const exactBreakEven = persistentStateEntryScreen({
  ...common,
  stateConditionalUpliftPct: 5.47,
});
assert.equal(exactBreakEven.conditionalRtpPct, 100);
assert.equal(exactBreakEven.atBreakEven, true);
assert.equal(exactBreakEven.positiveConditionalEv, false);
assert.equal(exactBreakEven.executable, false);

const provenHypothetical = persistentStateEntryScreen({
  ...common,
  stateConditionalUpliftPct: 5.48,
});
assert.equal(provenHypothetical.conditionalRtpPct, 100.01);
assert.equal(provenHypothetical.positiveConditionalEv, true);
assert.equal(provenHypothetical.allGatesPassed, true);
assert.equal(provenHypothetical.executable, true);
assert.equal(provenHypothetical.verdict, 'CANDIDATE_PLAY');

console.log('persistent-state-entry-screen-v1.test.mjs: PASS');
