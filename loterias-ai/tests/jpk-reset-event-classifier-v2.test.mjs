import assert from 'node:assert/strict';
import {
  classifyWindows,
  runSelfTest,
  MIN_CLEAN_RESETS_PER_TIER
} from '../casino/jackpots/botemania-jpk-reset-event-classifier-v2.mjs';

assert.equal(runSelfTest().selfTest, 'PASS');
assert.equal(MIN_CLEAN_RESETS_PER_TIER, 10);

const currentLike = [
  {
    source: 'OBS',
    tier: 'ROYAL',
    fromObservedAt: '2026-08-21T18:04:21.552Z',
    toObservedAt: '2026-08-21T18:04:37.728Z',
    fromEUR: 1760.29,
    toEUR: 1760.28,
    siblingGrowthEUR: -0.01,
    jackpotKingGrowthEUR: -0.01,
    observedDropEUR: 0.01
  },
  {
    source: 'OBS',
    tier: 'REGAL',
    fromObservedAt: '2026-08-21T18:04:21.552Z',
    toObservedAt: '2026-08-21T18:04:37.728Z',
    fromEUR: 15591.72,
    toEUR: 15591.71,
    siblingGrowthEUR: -0.01,
    jackpotKingGrowthEUR: -0.01,
    observedDropEUR: 0.01
  }
];

const classified = classifyWindows(currentLike);
assert.equal(classified.summary.rawTierDownRecords, 2);
assert.equal(classified.summary.uniqueTransitionsWithNegativeTierMove, 1);
assert.equal(classified.summary.coordinatedNetworkNegativeTransitions, 1);
assert.equal(classified.summary.strictResetCandidates, 0);
assert.equal(classified.summary.pooledHazardFitReady, false);

console.log('jpk-reset-event-classifier-v2 tests: PASS');
