import assert from 'node:assert/strict';
import {
  laneStatus, pickTopLane, buildRadarCards, radarSummary, unmappedLiveRows,
  laneAmountEUR, laneDistanceToThresholdEUR, laneStakeDisplayEUR,
} from '../edge-live/edge-radar-lanes-v1.mjs';

function lane(overrides) {
  return {
    id: 'lane-x', type: 'PROGRESSIVE_SLOT_SCORE_RESEARCH',
    game: { id: 'x', name: 'Lane X', url: 'https://www.botemania.es/juegos/slots-online/lane-x' },
    monitor: { network: 'generic', feedId: 'laneXId', key: 'generic:laneXId' },
    current: { observedAt: '2026-08-21T06:00:00.000Z', jackpotEUR: 100, dynamicFreshnessVerified: false, stasisSeconds: 10 },
    economic: { breakEvenJackpotEUR: null, creditValueVerified: false },
    executionReady: false, prepareOnly: false,
    blockers: ['LIVE_COUNTER_IDENTITY_NOT_VERIFIED'],
    order: { action: 'DO_NOT_PLAY', stakePerSpinEUR: 0 },
    ...overrides,
  };
}

// (a) six lanes tracked in the plan must produce exactly six rendered cards.
{
  const lanes = Array.from({ length: 6 }, (_, i) => lane({ id: `lane-${i}` }));
  const cards = buildRadarCards(lanes);
  assert.equal(cards.length, 6);
  assert.deepEqual(cards.map((c) => c.id), lanes.map((l) => l.id));
  assert.equal(radarSummary(lanes).total, 6);
}

// (b) a RED lane must never disappear from the radar, whatever its neighbors do.
{
  const green = lane({ id: 'green-1', executionReady: true, blockers: [] });
  const red = lane({ id: 'red-1', executionReady: false, prepareOnly: false });
  const cards = buildRadarCards([green, red]);
  assert.equal(cards.length, 2);
  assert.ok(cards.some((c) => c.id === 'red-1' && c.status === 'RED'));
}

// (c) one lane's GREEN must never convert another lane's RED into GREEN.
{
  const green = lane({ id: 'green-2', executionReady: true, blockers: [], economic: { breakEvenJackpotEUR: 50, creditValueVerified: true } });
  const red = lane({ id: 'red-2', executionReady: false, prepareOnly: false });
  const [cardGreen, cardRed] = buildRadarCards([green, red]);
  assert.equal(cardGreen.status, 'GREEN');
  assert.equal(cardRed.status, 'RED');
  assert.equal(laneStatus(red), 'RED');
}

// (d) null never renders as 0 unless the lane's own order is an explicit DO_NOT_PLAY.
{
  const missingAmount = lane({ current: { observedAt: null, jackpotEUR: null, dynamicFreshnessVerified: null, stasisSeconds: null } });
  assert.equal(laneAmountEUR(missingAmount), null);

  const notDoNotPlay = lane({ order: { action: 'OPEN_GAME_ONLY_NO_BET', stakePerSpinEUR: undefined } });
  assert.equal(laneStakeDisplayEUR(notDoNotPlay), null);

  const explicitDoNotPlay = lane({ order: { action: 'DO_NOT_PLAY', stakePerSpinEUR: 0 } });
  assert.equal(laneStakeDisplayEUR(explicitDoNotPlay), 0);
}

// (e) jackpots/thresholds must never mix between games: each lane's distance
// uses only that lane's own current amount and that lane's own threshold.
{
  const hasThresholdOnly = lane({ id: 'threshold-only', current: { jackpotEUR: null }, economic: { breakEvenJackpotEUR: 500, creditValueVerified: true } });
  const hasAmountOnly = lane({ id: 'amount-only', current: { jackpotEUR: 300 }, economic: { breakEvenJackpotEUR: null, creditValueVerified: false } });
  assert.equal(laneDistanceToThresholdEUR(hasThresholdOnly), null, 'no current amount on this lane means no distance, even though another lane has one');
  assert.equal(laneDistanceToThresholdEUR(hasAmountOnly), null, 'no threshold on this lane means no distance, even though another lane has one');

  const laneA = lane({ id: 'a', current: { jackpotEUR: 900 }, economic: { breakEvenJackpotEUR: 1000 } });
  const laneB = lane({ id: 'b', current: { jackpotEUR: 50 }, economic: { breakEvenJackpotEUR: 5000 } });
  assert.equal(laneDistanceToThresholdEUR(laneA), 100);
  assert.equal(laneDistanceToThresholdEUR(laneB), 4950);
}

// pickTopLane: GREEN beats YELLOW beats the plan's own pinned selection.
{
  const red = lane({ id: 'r' });
  const yellow = lane({ id: 'y', prepareOnly: true });
  const green = lane({ id: 'g', executionReady: true });
  assert.equal(pickTopLane([red, yellow, green], 'r').id, 'g');
  assert.equal(pickTopLane([red, yellow], 'r').id, 'y');
  assert.equal(pickTopLane([red], 'r').id, 'r');
  assert.equal(pickTopLane([red, lane({ id: 'other' })], 'other').id, 'other');
  assert.equal(pickTopLane([], 'x'), null);
}

// unmappedLiveRows: only live rows outside every known lane monitor key and
// the Jackpot King blueprint pot IDs are surfaced as unmapped.
{
  const lanes = [
    lane({ id: 'jpk', monitor: null }),
    lane({ id: 'bubbles', monitor: { network: 'generic', feedId: 'bouncy_bubbles_id', key: 'generic:bouncy_bubbles_id' } }),
  ];
  const directByKey = {
    'blueprint:JACKPOTKING': { amountEUR: 1 },
    'generic:bouncy_bubbles_id': { amountEUR: 2 },
    'generic:classicwildsprogressive': { amountEUR: 3 },
    'generic:progressivealice1': { amountEUR: 4 },
  };
  const unmapped = unmappedLiveRows(directByKey, lanes);
  assert.equal(unmapped.length, 2);
  const keys = unmapped.map((x) => x.key).sort();
  assert.deepEqual(keys, ['generic:classicwildsprogressive', 'generic:progressivealice1']);
}

console.log('edge-radar-lanes-v1.test.mjs: PASS');
