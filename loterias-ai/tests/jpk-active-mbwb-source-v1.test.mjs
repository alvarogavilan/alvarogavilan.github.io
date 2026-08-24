import assert from 'node:assert/strict';
import { selectActiveJpkMbwb } from '../casino/jackpots/jpk-active-mbwb-source-v1.mjs';

const exact = selectActiveJpkMbwb({
  spanishEvidence: {
    decision: { exactSpainMbwbKnown: true },
    mustBeWonBeforeEUR: { ROYAL: 4078.97, REGAL: 40789.77 },
  },
  legacyHypothesis: { ROYAL: 3500, REGAL: 35000 },
});
assert.deepEqual(exact.capEUR, { ROYAL: 4078.97, REGAL: 40789.77 });
assert.equal(exact.sourceClass, 'EXACT_SPAIN_IN_GAME_MBWB');
assert.equal(exact.exactSpainMbwbKnown, true);
assert.equal(exact.legacyHypothesisSuperseded, true);
assert.equal(exact.realMoneyAllowed, false);

const legacy = selectActiveJpkMbwb({
  spanishEvidence: { decision: { exactSpainMbwbKnown: false } },
  legacyHypothesis: { ROYAL: 3500, REGAL: 35000 },
});
assert.deepEqual(legacy.capEUR, { ROYAL: 3500, REGAL: 35000 });
assert.equal(legacy.sourceClass, 'LEGACY_CROSS_MARKET_HYPOTHESIS_ONLY');
assert.equal(legacy.exactSpainMbwbKnown, false);

const none = selectActiveJpkMbwb({});
assert.equal(none.capEUR.ROYAL, null);
assert.equal(none.capEUR.REGAL, null);
assert.equal(none.sourceClass, 'NO_USABLE_MBWB');

console.log('jpk-active-mbwb-source-v1.test.mjs: PASS');
