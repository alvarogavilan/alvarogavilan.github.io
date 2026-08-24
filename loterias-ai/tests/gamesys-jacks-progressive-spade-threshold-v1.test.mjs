import assert from 'node:assert/strict';
import {
  fixedStrategySpadeRoyalThreshold,
  HISTORICAL_BOTEMANIA_SCREEN_COMPARATOR,
} from '../casino/jackpots/gamesys-jacks-progressive-spade-threshold-v1.mjs';

const x = fixedStrategySpadeRoyalThreshold({
  qualifyingBetPerHandEUR: 2.5,
  currentJackpotEUR: 3448.25,
});
assert.equal(x.blocked, false);
assert.ok(Math.abs(x.breakEvenJackpotBetMultiples - 6991.00786755021) < 1e-9);
assert.ok(Math.abs(x.breakEvenJackpotEUR - 17477.519668875524) < 1e-9);
assert.ok(Math.abs(x.fixedStrategyRtpPctAtCurrent - 96.50771109734467) < 1e-9);
assert.equal(x.lineageComparatorVerdict, 'LINEAGE_COMPARATOR_BELOW_100');
assert.equal(x.execution.thresholdVerifiedForSpain, false);
assert.equal(x.execution.qualifyingStakeVerifiedForSpain, false);
assert.equal(x.execution.rulesFingerprintVerifiedForSpain, false);
assert.equal(x.execution.realMoneyAllowed, false);
assert.equal(x.execution.executable, false);
assert.equal(x.guards.externalLineageThresholdIsNotSpanishThreshold, true);

assert.equal(HISTORICAL_BOTEMANIA_SCREEN_COMPARATOR.execution.realMoneyAllowed, false);
assert.equal(HISTORICAL_BOTEMANIA_SCREEN_COMPARATOR.execution.executable, false);

const blocked = fixedStrategySpadeRoyalThreshold({ qualifyingBetPerHandEUR: null });
assert.equal(blocked.blocked, true);

console.log('gamesys-jacks-progressive-spade-threshold-v1.test.mjs: PASS');
