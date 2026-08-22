import assert from 'node:assert/strict';
import {
  requiredPlayerWinProbabilityForBreakeven,
  requiredJackpotRtpUpliftMultiple,
  evaluateVerifiedTimedDropState,
} from '../casino/jackpots/red-tiger-timed-drop-screen-v1.mjs';

{
  const r = requiredJackpotRtpUpliftMultiple({
    baseRtpExcludingJackpots: 0.9028,
    referenceAverageJackpotRtp: 0.06,
  });
  assert.equal(r.blocked, false);
  assert.ok(Math.abs(r.jackpotRtpNeeded - 0.0972) < 1e-12);
  assert.ok(Math.abs(r.requiredUpliftMultiple - 1.62) < 1e-12);
  assert.equal(r.realMoneyAllowed, false);
}

{
  const r = requiredPlayerWinProbabilityForBreakeven({
    baseRtpExcludingTimedJackpot: 0.9028,
    stakeEUR: 0.20,
    timedJackpotEUR: 100,
  });
  assert.equal(r.blocked, false);
  assert.ok(Math.abs(r.requiredPlayerWinProbability - 0.0001944) < 1e-15);
  assert.ok(Math.abs(r.approximatelyOneIn - 5144.0329218107) < 1e-9);
}

{
  const r = requiredPlayerWinProbabilityForBreakeven({
    baseRtpExcludingTimedJackpot: 0.9028,
    stakeEUR: 0.20,
    timedJackpotEUR: 50,
  });
  assert.ok(Math.abs(r.requiredPlayerWinProbability - 0.0003888) < 1e-15);
}

{
  const r = evaluateVerifiedTimedDropState({
    baseRtpExcludingTimedJackpot: 0.9028,
    stakeEUR: 0.20,
    timedJackpotEUR: 100,
    playerWinProbabilityThisSpin: 0.001,
  });
  assert.equal(r.blocked, true);
  assert.equal(r.reason, 'UNVERIFIED_LIVE_INPUTS');
  assert.equal(r.realMoneyAllowed, false);
}

{
  const verified = {
    exactSpainGameAndNetworkVerified: true,
    baseRtpVerified: true,
    stakeEligibilityAndWeightingVerified: true,
    timedJackpotValueFreshAndSameNetwork: true,
    playerLevelWinProbabilityVerified: true,
    concurrencyAndWinnerSelectionIncluded: true,
  };
  const noPlay = evaluateVerifiedTimedDropState({
    baseRtpExcludingTimedJackpot: 0.9028,
    stakeEUR: 0.20,
    timedJackpotEUR: 100,
    playerWinProbabilityThisSpin: 0.0001,
    ...verified,
  });
  assert.equal(noPlay.blocked, false);
  assert.equal(noPlay.aboveBreakeven, false);
  assert.equal(noPlay.verdict, 'NO_PLAY');
  assert.equal(noPlay.realMoneyAllowed, false);

  const candidate = evaluateVerifiedTimedDropState({
    baseRtpExcludingTimedJackpot: 0.9028,
    stakeEUR: 0.20,
    timedJackpotEUR: 100,
    playerWinProbabilityThisSpin: 0.0002,
    ...verified,
  });
  assert.equal(candidate.blocked, false);
  assert.equal(candidate.aboveBreakeven, true);
  assert.equal(candidate.verdict, 'MATHEMATICAL_CANDIDATE_ONLY');
  assert.equal(candidate.realMoneyAllowed, false);
  assert.equal(candidate.stakeEUR, 0);
}

assert.equal(requiredPlayerWinProbabilityForBreakeven({ baseRtpExcludingTimedJackpot: 0.9, stakeEUR: -1, timedJackpotEUR: 100 }).blocked, true);
assert.equal(requiredPlayerWinProbabilityForBreakeven({ baseRtpExcludingTimedJackpot: 0.9, stakeEUR: 1, timedJackpotEUR: 0 }).blocked, true);

console.log('red-tiger-timed-drop-screen-v1.test.mjs: PASS');
