import assert from 'node:assert/strict';
import {
  clampUnit,
  positionFraction,
  hazardShape,
  evPerBet,
  monetaryCapScenarioGrid,
  timedDeadlineHazardGrid,
  impliedMaxConcurrentPlayersForBreakeven,
} from '../casino/jackpots/must-drop-ev-engine-v1.mjs';

// clampUnit / positionFraction
assert.equal(clampUnit(0), 1e-5);
assert.equal(clampUnit(1), 0.9998);
assert.equal(positionFraction({ current: 50, start: 0, end: 100 }), 0.5);
assert.equal(positionFraction({ current: 50, start: 0, end: 0 }), null);
assert.equal(positionFraction({ current: NaN, start: 0, end: 100 }), null);

// hazardShape: alpha=1 (uniform) must reduce to the classic uniform hazard f/(1-F)=1/(1-q)
{
  const { F, f, hazard } = hazardShape(0.5, 1);
  assert.equal(F, 0.5);
  assert.equal(f, 1);
  assert.equal(hazard, 2);
}

// hazardShape must be monotonically increasing in q for any alpha>=1 (hazard grows as deadline approaches)
{
  const alpha = 2;
  const hs = [0.1, 0.3, 0.5, 0.7, 0.9].map((q) => hazardShape(q, alpha).hazard);
  for (let i = 1; i < hs.length; i++) assert.ok(hs[i] > hs[i - 1], 'hazard must increase monotonically toward the deadline');
}

// evPerBet: hand-computed value
{
  const ev = evPerBet({ q: 0.5, alpha: 1, meterPerBet: 0.01, distanceToEnd: 100, awardValue: 50 });
  assert.ok(Math.abs(ev - 0.01) < 1e-9);
}

// evPerBet returns null on missing inputs instead of silently producing NaN/Infinity
assert.equal(evPerBet({ q: null, alpha: 1, meterPerBet: 0.01, distanceToEnd: 100, awardValue: 50 }), null);
assert.equal(evPerBet({ q: 0.5, alpha: 1, meterPerBet: 0.01, distanceToEnd: 0, awardValue: 50 }), null);

// monetaryCapScenarioGrid: single deterministic scenario must match evPerBet's hand-computed value
{
  const grid = monetaryCapScenarioGrid({
    baseRtp: 0.95,
    potEUR: 50,
    cap: 100,
    seedScenarios: [{ name: 'ZERO', value: 0 }],
    networkShare: 1,
    activeFractionsOfPublishedPct: [1],
    publishedExtraPct: 1,
    alphaGrid: [1],
  });
  assert.equal(grid.blocked, false);
  assert.equal(grid.scenarios.length, 1);
  assert.ok(Math.abs(grid.scenarios[0].totalRtp - 0.96) < 1e-9);
  assert.equal(grid.scenarios[0].totalRtp >= 1, false);
}

// monetaryCapScenarioGrid: blocked when a required numeric input is missing (never silently proceed)
{
  const grid = monetaryCapScenarioGrid({
    baseRtp: 0.95,
    potEUR: 50,
    cap: NaN,
    seedScenarios: [{ name: 'ZERO', value: 0 }],
    networkShare: 1,
    activeFractionsOfPublishedPct: [1],
  });
  assert.equal(grid.blocked, true);
  assert.equal(grid.reason, 'MISSING_REQUIRED_NUMERIC_INPUT');
}

// timedDeadlineHazardGrid: without an award mechanism, must refuse to fabricate a PLAY verdict
{
  const grid = timedDeadlineHazardGrid({ elapsedSeconds: 30, windowTotalSeconds: 60, alphaGrid: [1] });
  assert.equal(grid.blocked, false);
  assert.equal(grid.q, 0.5);
  assert.equal(grid.remainingSeconds, 30);
  assert.equal(grid.awardMechanismKnown, false);
  assert.equal(grid.evByAlpha, null);
  assert.equal(grid.decision.verdict, 'NO_PLAY');
  assert.equal(grid.decision.reason, 'AWARD_MECHANISM_UNKNOWN_CANNOT_CONVERT_TIME_HAZARD_TO_PER_SPIN_PROBABILITY_WITHOUT_FABRICATING_ASSUMPTION');
}

// timedDeadlineHazardGrid: with a supplied NETWORK_RANDOM_ACTIVE_SPIN mechanism, computes a concrete EV
{
  const grid = timedDeadlineHazardGrid({
    elapsedSeconds: 30,
    windowTotalSeconds: 60,
    alphaGrid: [1],
    awardMechanism: { type: 'NETWORK_RANDOM_ACTIVE_SPIN', concurrentActivePlayers: 10 },
    mySecondsPerSpin: 3,
    potEUR: 1,
    myStakePerSpin: 1,
    baseRtp: 0.95,
  });
  assert.equal(grid.awardMechanismKnown, true);
  assert.equal(grid.evByAlpha.length, 1);
  const row = grid.evByAlpha[0];
  assert.ok(Math.abs(row.pMySpinWins - 0.01) < 1e-9);
  assert.ok(Math.abs(row.totalRtp - 0.96) < 1e-9);
  assert.equal(grid.decision.verdict, 'NO_PLAY');
}

// timedDeadlineHazardGrid: blocked on an invalid window instead of dividing by zero
{
  const grid = timedDeadlineHazardGrid({ elapsedSeconds: 30, windowTotalSeconds: 0 });
  assert.equal(grid.blocked, true);
  assert.equal(grid.reason, 'MISSING_OR_INVALID_TIME_WINDOW');
}

// impliedMaxConcurrentPlayersForBreakeven: hand-computed inversion
{
  const result = impliedMaxConcurrentPlayersForBreakeven({
    elapsedSeconds: 30,
    windowTotalSeconds: 60,
    alpha: 1,
    mySecondsPerSpin: 3,
    potEUR: 1,
    myStakePerSpin: 1,
    baseRtp: 0.95,
    targetRtp: 1,
  });
  assert.ok(Math.abs(result.maxConcurrentPlayers - 2) < 1e-6);
}

// impliedMaxConcurrentPlayersForBreakeven: already above target without any jackpot contribution
{
  const result = impliedMaxConcurrentPlayersForBreakeven({
    elapsedSeconds: 30,
    windowTotalSeconds: 60,
    alpha: 1,
    mySecondsPerSpin: 3,
    potEUR: 1,
    myStakePerSpin: 1,
    baseRtp: 1.02,
    targetRtp: 1,
  });
  assert.equal(result.maxConcurrentPlayers, Infinity);
  assert.equal(result.alreadyAboveTargetWithoutJackpot, true);
}

console.log('must-drop-ev-engine-v1.test.mjs: PASS');
