import assert from 'node:assert/strict';
import {
  clampUnit,
  positionFraction,
  hazardShape,
  conditionalDropProbability,
  evPerBet,
  monetaryCapScenarioGrid,
  timedDeadlineHazardGrid,
  impliedMaxConcurrentPlayersForBreakeven,
} from '../casino/jackpots/must-drop-ev-engine-v1.mjs';

assert.equal(clampUnit(0), 1e-5);
assert.equal(clampUnit(1), 0.9998);
assert.equal(positionFraction({ current: 50, start: 0, end: 100 }), 0.5);
assert.equal(positionFraction({ current: 50, start: 0, end: 0 }), null);
assert.equal(positionFraction({ current: NaN, start: 0, end: 100 }), null);

{
  const { F, f, hazard } = hazardShape(0.5, 1);
  assert.equal(F, 0.5);
  assert.equal(f, 1);
  assert.equal(hazard, 2);
}

{
  const alpha = 2;
  const hs = [0.1, 0.3, 0.5, 0.7, 0.9].map((q) => hazardShape(q, alpha).hazard);
  for (let i = 1; i < hs.length; i++) assert.ok(hs[i] > hs[i - 1]);
}

// Exact finite-interval conditional probability under F(q)=q^alpha.
// q1=.5, q2=.6, alpha=2 -> (.36-.25)/(1-.25)=.1466666...
{
  const p = conditionalDropProbability({ q1: 0.5, q2: 0.6, alpha: 2 });
  assert.ok(Math.abs(p - (0.11 / 0.75)) < 1e-12);
}

// Small uniform increment reproduces the previous hand result exactly.
{
  const ev = evPerBet({ q: 0.5, alpha: 1, meterPerBet: 0.01, distanceToEnd: 100, awardValue: 50 });
  assert.ok(Math.abs(ev - 0.01) < 1e-9);
}

// Regression against infinitesimal hazard*dq approximation: finite alpha=2
// interval must use exact CDF difference.
{
  const ev = evPerBet({ q: 0.5, alpha: 2, meterPerBet: 10, distanceToEnd: 100, awardValue: 50 });
  assert.ok(Math.abs(ev - (50 * 0.11 / 0.75)) < 1e-12);
}

assert.equal(evPerBet({ q: null, alpha: 1, meterPerBet: 0.01, distanceToEnd: 100, awardValue: 50 }), null);
assert.equal(evPerBet({ q: 0.5, alpha: 1, meterPerBet: 0.01, distanceToEnd: 0, awardValue: 50 }), null);

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

{
  const grid = timedDeadlineHazardGrid({ elapsedSeconds: 30, windowTotalSeconds: 60, alphaGrid: [1] });
  assert.equal(grid.blocked, false);
  assert.equal(grid.q, 0.5);
  assert.equal(grid.remainingSeconds, 30);
  assert.equal(grid.awardMechanismKnown, false);
  assert.equal(grid.evByAlpha, null);
  assert.equal(grid.decision.verdict, 'NO_PLAY');
}

// Uniform: exact conditional chance over next 3 sec from t=30 in a 60-sec
// window is (.55-.5)/(1-.5)=.1; divided across 10 equal active players=.01.
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
  assert.ok(Math.abs(row.pMySpinWins - 0.01) < 1e-12);
  assert.ok(Math.abs(row.totalRtp - 0.96) < 1e-12);
  assert.equal(grid.decision.verdict, 'NO_PLAY');
}

// Alpha=2 regression: exact p(drop in next spin)=((.55^2)-(.5^2))/(1-.5^2)=.07.
{
  const grid = timedDeadlineHazardGrid({
    elapsedSeconds: 30,
    windowTotalSeconds: 60,
    alphaGrid: [2],
    awardMechanism: { type: 'NETWORK_RANDOM_ACTIVE_SPIN', concurrentActivePlayers: 10 },
    mySecondsPerSpin: 3,
    potEUR: 1,
    myStakePerSpin: 1,
    baseRtp: 0.95,
  });
  assert.ok(Math.abs(grid.hazardByAlpha[0].pDropDuringSpin - 0.07) < 1e-12);
  assert.ok(Math.abs(grid.evByAlpha[0].pMySpinWins - 0.007) < 1e-12);
  assert.ok(Math.abs(grid.evByAlpha[0].totalRtp - 0.957) < 1e-12);
}

{
  const grid = timedDeadlineHazardGrid({ elapsedSeconds: 30, windowTotalSeconds: 0 });
  assert.equal(grid.blocked, true);
}

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
