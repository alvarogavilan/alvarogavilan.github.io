import assert from 'node:assert/strict';
import {
  classifyWindows,
  runSelfTest,
  MIN_CLEAN_RESETS_PER_TIER
} from '../casino/jackpots/botemania-jpk-reset-event-classifier-v2.mjs';

assert.equal(runSelfTest().selfTest, 'PASS');
assert.equal(MIN_CLEAN_RESETS_PER_TIER, 10);

const actualCurrentArtifactFixture = [
  {source:'PERSISTED_OBSERVER_WINDOWS',tier:'ROYAL',fromObservedAt:'2026-08-19T17:56:00.697Z',toObservedAt:'2026-08-19T17:56:45.622Z',fromEUR:1634.12,toEUR:1633.76,siblingGrowthEUR:-0.36,jackpotKingGrowthEUR:-1.11,observedDropEUR:0.36},
  {source:'PERSISTED_OBSERVER_WINDOWS',tier:'REGAL',fromObservedAt:'2026-08-19T17:56:00.697Z',toObservedAt:'2026-08-19T17:56:45.622Z',fromEUR:15491.22,toEUR:15490.86,siblingGrowthEUR:-0.36,jackpotKingGrowthEUR:-1.11,observedDropEUR:0.36},
  {source:'PERSISTED_OBSERVER_WINDOWS',tier:'ROYAL',fromObservedAt:'2026-08-19T22:02:54.735Z',toObservedAt:'2026-08-19T22:03:25.168Z',fromEUR:1656.94,toEUR:1656.91,siblingGrowthEUR:-0.02,jackpotKingGrowthEUR:-0.08,observedDropEUR:0.03},
  {source:'PERSISTED_OBSERVER_WINDOWS',tier:'REGAL',fromObservedAt:'2026-08-19T22:02:54.735Z',toObservedAt:'2026-08-19T22:03:25.168Z',fromEUR:15514.03,toEUR:15514.01,siblingGrowthEUR:-0.03,jackpotKingGrowthEUR:-0.08,observedDropEUR:0.02},
  {source:'PERSISTED_OBSERVER_WINDOWS',tier:'ROYAL',fromObservedAt:'2026-08-19T23:32:51.095Z',toObservedAt:'2026-08-19T23:55:52.657Z',fromEUR:1665.76,toEUR:1663.47,siblingGrowthEUR:-46.69,jackpotKingGrowthEUR:-402.14,observedDropEUR:2.29},
  {source:'PERSISTED_OBSERVER_WINDOWS',tier:'REGAL',fromObservedAt:'2026-08-19T23:32:51.095Z',toObservedAt:'2026-08-19T23:55:52.657Z',fromEUR:15522.86,toEUR:15476.17,siblingGrowthEUR:-2.29,jackpotKingGrowthEUR:-402.14,observedDropEUR:46.69},
  {source:'PERSISTED_OBSERVER_WINDOWS',tier:'ROYAL',fromObservedAt:'2026-08-21T18:04:21.552Z',toObservedAt:'2026-08-21T18:04:37.728Z',fromEUR:1760.29,toEUR:1760.28,siblingGrowthEUR:-0.01,jackpotKingGrowthEUR:-0.01,observedDropEUR:0.01},
  {source:'PERSISTED_OBSERVER_WINDOWS',tier:'REGAL',fromObservedAt:'2026-08-21T18:04:21.552Z',toObservedAt:'2026-08-21T18:04:37.728Z',fromEUR:15591.72,toEUR:15591.71,siblingGrowthEUR:-0.01,jackpotKingGrowthEUR:-0.01,observedDropEUR:0.01}
];

const classified = classifyWindows(actualCurrentArtifactFixture);
assert.equal(classified.summary.rawTierDownRecords, 8);
assert.equal(classified.summary.uniqueTransitionsWithNegativeTierMove, 4);
assert.equal(classified.summary.coordinatedNetworkNegativeTransitions, 4);
assert.equal(classified.summary.strictResetCandidates, 0);
assert.equal(classified.summary.royalStrictResetCandidates, 0);
assert.equal(classified.summary.regalStrictResetCandidates, 0);
assert.equal(classified.summary.pooledHazardFitReady, false);
assert.ok(classified.transitions.every((x) => x.classification === 'COORDINATED_NETWORK_NEGATIVE_MOVE'));

console.log('jpk-reset-event-classifier-v2 tests: PASS');
