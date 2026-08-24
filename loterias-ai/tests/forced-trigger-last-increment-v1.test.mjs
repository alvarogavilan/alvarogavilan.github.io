import assert from 'node:assert/strict';
import {
  forcedTriggerLastIncrement,
  forcedRouletteCoverageScreen,
} from '../casino/jackpots/forced-trigger-last-increment-v1.mjs';

// A large pot / close-to-cap state must NEVER be enough by itself.
{
  const r = forcedTriggerLastIncrement({
    currentTriggerBasis: 999.99,
    maxTriggerBasis: 1000,
    guaranteedIncrementFromNextWager: 0.02,
    stake: 1,
    jackpotAwardLowerBound: 1000,
    baseGameReturnLowerBound: 0,
  });
  assert.equal(r.crossesHardMax, true);
  assert.equal(r.forcedTriggerProven, false);
  assert.equal(r.positiveEvLowerBound, false);
  assert.equal(r.executable, false);
  assert.equal(r.verdict, 'NO_PLAY');
  assert.ok(r.missingGates.includes('crossingWagerOwnsAwardVerified'));
  assert.ok(r.missingGates.includes('prospectiveValidationPassed'));
}

// Synthetic theorem-control only: when every required fact is independently
// verified, crossing a hard max is distribution-free. This is NOT a real game.
{
  const r = forcedTriggerLastIncrement({
    currentTriggerBasis: 999.99,
    maxTriggerBasis: 1000,
    minTriggerBasis: 900,
    guaranteedIncrementFromNextWager: 0.02,
    stake: 1,
    jackpotAwardLowerBound: 100,
    baseGameReturnLowerBound: 0,
    stateVisibleToPlayer: true,
    maxTriggerVerified: true,
    sameTriggerBasisVerified: true,
    wagerIncrementVerified: true,
    qualifyingWagerVerified: true,
    crossingWagerOwnsAwardVerified: true,
    noInterveningEligibleWagerVerified: true,
    rulesFingerprintVerified: true,
    prospectiveValidationPassed: true,
  });
  assert.equal(r.blocked, false);
  assert.equal(r.forcedTriggerProven, true);
  assert.equal(r.positiveEvLowerBound, true);
  assert.equal(r.executable, true);
  assert.equal(r.verdict, 'CANDIDATE_PLAY');
  assert.equal(r.netProfitLowerBound, 99);
  assert.equal(r.assumptions.noUniformTriggerAssumption, true);
}

// If the next wager does not reach the hard max, no amount of gate closure can
// make the distribution-free theorem claim a forced trigger.
{
  const r = forcedTriggerLastIncrement({
    currentTriggerBasis: 950,
    maxTriggerBasis: 1000,
    guaranteedIncrementFromNextWager: 1,
    stake: 1,
    jackpotAwardLowerBound: 100,
    baseGameReturnLowerBound: 0,
    stateVisibleToPlayer: true,
    maxTriggerVerified: true,
    sameTriggerBasisVerified: true,
    wagerIncrementVerified: true,
    qualifyingWagerVerified: true,
    crossingWagerOwnsAwardVerified: true,
    noInterveningEligibleWagerVerified: true,
    rulesFingerprintVerified: true,
    prospectiveValidationPassed: true,
  });
  assert.equal(r.crossesHardMax, false);
  assert.equal(r.forcedTriggerProven, false);
  assert.equal(r.executable, false);
  assert.equal(r.verdict, 'NO_PLAY');
}

// Roulette trigger != jackpot ownership. Without winner/split/sole-bettor proof
// it must remain blocked even if trigger-on-next-game is otherwise known.
{
  const r = forcedRouletteCoverageScreen({
    wheelNumbers: 37,
    straightStakePerNumber: 1,
    jackpotAwardLowerBound: 100,
    exactSingleGamePayoutMultiple: 36,
    triggerOnNextGameProven: true,
  });
  assert.equal(r.totalStake, 37);
  assert.equal(r.ordinaryNet, -1);
  assert.equal(r.blocked, true);
  assert.equal(r.executable, false);
  assert.equal(r.verdict, 'NO_PLAY');
  assert.ok(r.missingGates.includes('jackpotPaidToWinningNumberStraightBettorsVerified'));
  assert.ok(r.missingGates.includes('soleEligibleJackpotBettorVerified'));
}

console.log('forced-trigger-last-increment-v1.test.mjs: PASS');
