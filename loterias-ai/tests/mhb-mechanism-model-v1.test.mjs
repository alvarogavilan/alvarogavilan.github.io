import assert from 'node:assert/strict';
import {
  MHB_MECHANISM,
  uniformHiddenThresholdConditionalProbability,
  evaluateUniformHiddenThresholdRtp,
  evaluateStagedHazardRtp,
  mechanismRequirements,
} from '../casino/jackpots/mhb-mechanism-model-v1.mjs';

{
  const r = uniformHiddenThresholdConditionalProbability({ currentValue: 4900, mustHitByValue: 5000, meterIncrementFromThisWager: 1 });
  assert.equal(r.blocked, false);
  assert.equal(r.remainingToCap, 100);
  assert.equal(r.conditionalAwardProbability, 0.01);
}

{
  const r = uniformHiddenThresholdConditionalProbability({ currentValue: 4900, mustHitByValue: 5000, meterIncrementFromThisWager: 200 });
  assert.equal(r.conditionalAwardProbability, 1);
}

assert.equal(uniformHiddenThresholdConditionalProbability({ currentValue: 5000, mustHitByValue: 5000, meterIncrementFromThisWager: 1 }).blocked, true);

{
  const r = evaluateUniformHiddenThresholdRtp({
    baseRtpExcludingMhb: 0.95,
    jackpotValueEUR: 4900,
    stakeEUR: 1,
    currentValue: 4900,
    mustHitByValue: 5000,
    meterIncrementFromThisWager: 0.005,
  });
  assert.equal(r.blocked, true);
  assert.equal(r.reason, 'UNVERIFIED_MECHANISM_INPUTS');
}

{
  const r = evaluateUniformHiddenThresholdRtp({
    baseRtpExcludingMhb: 0.95,
    jackpotValueEUR: 4900,
    stakeEUR: 1,
    currentValue: 4900,
    mustHitByValue: 5000,
    meterIncrementFromThisWager: 0.005,
    thresholdDistributionVerified: true,
    crossingWagerWinsVerified: true,
    meterIncrementFromThisWagerVerified: true,
    baseRtpExcludesMhbVerified: true,
  });
  assert.equal(r.blocked, false);
  assert.ok(Math.abs(r.conditionalAwardProbability - 0.00005) < 1e-15);
  assert.ok(Math.abs(r.jackpotReturnMultiple - 0.245) < 1e-12);
  assert.ok(Math.abs(r.totalRtp - 1.195) < 1e-12);
  assert.equal(r.realMoneyAllowed, false);
}

{
  const r = evaluateStagedHazardRtp({
    baseRtpExcludingMhb: 0.95,
    jackpotValueEUR: 100,
    stakeEUR: 1,
    currentStageWinProbabilityForThisWager: 0.001,
  });
  assert.equal(r.blocked, true);
  assert.equal(r.reason, 'UNVERIFIED_STAGE_INPUTS');
}

// A legacy/raw stage-qualification flag is deliberately insufficient. The
// model requires the player-level WIN probability after multi-player winner
// selection/concurrency have already been incorporated.
{
  const r = evaluateStagedHazardRtp({
    baseRtpExcludingMhb: 0.95,
    jackpotValueEUR: 100,
    stakeEUR: 1,
    currentStageWinProbabilityForThisWager: 0.001,
    stageProbabilityVerified: true,
    awardEligibilityVerified: true,
    baseRtpExcludesMhbVerified: true,
  });
  assert.equal(r.blocked, true);
  assert.equal(r.reason, 'UNVERIFIED_STAGE_INPUTS');
}

{
  const r = evaluateStagedHazardRtp({
    baseRtpExcludingMhb: 0.95,
    jackpotValueEUR: 100,
    stakeEUR: 1,
    currentStageWinProbabilityForThisWager: 0.001,
    winProbabilityForThisWagerVerified: true,
    awardEligibilityVerified: true,
    baseRtpExcludesMhbVerified: true,
  });
  assert.equal(r.blocked, false);
  assert.ok(Math.abs(r.totalRtp - 1.05) < 1e-12);
  assert.equal(r.realMoneyAllowed, false);
}

assert.equal(mechanismRequirements(MHB_MECHANISM.UNKNOWN).forbiddenAssumption, 'NO_EV_WITH_UNKNOWN_MHB_MECHANISM');
assert.equal(mechanismRequirements(MHB_MECHANISM.UNIFORM_HIDDEN_THRESHOLD).required.includes('thresholdDistributionVerified'), true);
assert.equal(mechanismRequirements(MHB_MECHANISM.STAGED_HAZARD).required.includes('currentStageWinProbabilityForThisWagerVerified'), true);

console.log('mhb-mechanism-model-v1.test.mjs: PASS');
