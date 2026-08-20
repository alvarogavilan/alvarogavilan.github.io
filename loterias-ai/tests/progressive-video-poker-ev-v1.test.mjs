import assert from 'node:assert/strict';
import { progressiveVideoPokerEv, BOTEMANIA_VIDEO_POKER_TITLES } from '../casino/jackpots/progressive-video-poker-ev-v1.mjs';

// Hand-computed single-hand case: delta=1000, boost=0.00002*(1000/5)=0.004, total RTP=0.984.
{
  const r = progressiveVideoPokerEv({
    baseRtpAtSeedForFixedStrategy: 0.98,
    pRoyalFlushForFixedStrategy: 0.00002,
    seedJackpotCoinsPerWinningHand: 800,
    currentJackpotCoinsPerWinningHand: 1800,
    qualifyingCoinsBetPerHand: 5,
    handsPerSpin: 1,
    strategyInputsVerified: true,
  });
  assert.equal(r.blocked, false);
  assert.equal(r.jackpotDeltaCoinsPerWinningHand, 1000);
  assert.equal(r.totalCoinsBet, 5);
  assert.ok(Math.abs(r.jackpotEvBoost - 0.004) < 1e-9);
  assert.ok(Math.abs(r.totalRtp - 0.984) < 1e-9);
  assert.ok(Math.abs(r.breakEvenJackpotCoinsPerWinningHand - 5800) < 1e-6);
  assert.ok(Math.abs(r.currentDistanceToBreakEvenCoins - 4000) < 1e-6);
  assert.equal(r.verdict, 'NO_PLAY');
}

// A jackpot at/above break-even must clear CANDIDATE_PLAY for the verified fixed strategy.
{
  const r = progressiveVideoPokerEv({
    baseRtpAtSeedForFixedStrategy: 0.98,
    pRoyalFlushForFixedStrategy: 0.00002,
    seedJackpotCoinsPerWinningHand: 800,
    currentJackpotCoinsPerWinningHand: 6000,
    qualifyingCoinsBetPerHand: 5,
    handsPerSpin: 1,
    strategyInputsVerified: true,
  });
  assert.equal(r.verdict, 'CANDIDATE_PLAY');
  assert.ok(r.totalRtp >= 1);
}

// Multi-hand must scale COST as well as expected jackpot wins. Ten hands at 5 coins/hand cost 50 coins,
// so the jackpot RTP boost per euro/coin is the same as one hand, not 10x larger.
{
  const single = progressiveVideoPokerEv({
    baseRtpAtSeedForFixedStrategy: 0.98,
    pRoyalFlushForFixedStrategy: 0.00002,
    seedJackpotCoinsPerWinningHand: 800,
    currentJackpotCoinsPerWinningHand: 1800,
    qualifyingCoinsBetPerHand: 5,
    handsPerSpin: 1,
    strategyInputsVerified: true,
  });
  const ten = progressiveVideoPokerEv({
    baseRtpAtSeedForFixedStrategy: 0.98,
    pRoyalFlushForFixedStrategy: 0.00002,
    seedJackpotCoinsPerWinningHand: 800,
    currentJackpotCoinsPerWinningHand: 1800,
    qualifyingCoinsBetPerHand: 5,
    handsPerSpin: 10,
    strategyInputsVerified: true,
  });
  assert.equal(ten.totalCoinsBet, 50);
  assert.ok(Math.abs(ten.jackpotEvBoost - single.jackpotEvBoost) < 1e-9);
  assert.ok(Math.abs(ten.breakEvenJackpotCoinsPerWinningHand - single.breakEvenJackpotCoinsPerWinningHand) < 1e-9);
}

// Unverified strategy inputs must fail closed even when all numeric values exist.
{
  const r = progressiveVideoPokerEv({
    baseRtpAtSeedForFixedStrategy: 0.98,
    pRoyalFlushForFixedStrategy: 0.00002,
    seedJackpotCoinsPerWinningHand: 800,
    currentJackpotCoinsPerWinningHand: 6000,
    qualifyingCoinsBetPerHand: 5,
    strategyInputsVerified: false,
  });
  assert.equal(r.blocked, true);
  assert.equal(r.reason, 'STRATEGY_INPUTS_NOT_VERIFIED');
}

// Missing/invalid inputs must block rather than silently produce a verdict.
assert.equal(progressiveVideoPokerEv({
  baseRtpAtSeedForFixedStrategy: 0.98,
  pRoyalFlushForFixedStrategy: null,
  seedJackpotCoinsPerWinningHand: 800,
  currentJackpotCoinsPerWinningHand: 1800,
  qualifyingCoinsBetPerHand: 5,
  strategyInputsVerified: true,
}).blocked, true);

assert.equal(progressiveVideoPokerEv({
  baseRtpAtSeedForFixedStrategy: 0.98,
  pRoyalFlushForFixedStrategy: 0.00002,
  seedJackpotCoinsPerWinningHand: 800,
  currentJackpotCoinsPerWinningHand: 700,
  qualifyingCoinsBetPerHand: 5,
  strategyInputsVerified: true,
}).blocked, true);

// Registry must not carry fabricated royal probabilities.
for (const t of BOTEMANIA_VIDEO_POKER_TITLES) {
  assert.equal(t.pRoyalFlushForFixedStrategy, null, `${t.slug} must not carry a fabricated royal probability`);
}
assert.equal(BOTEMANIA_VIDEO_POKER_TITLES.length, 4);
assert.ok(BOTEMANIA_VIDEO_POKER_TITLES.every((t) => typeof t.slug === 'string' && t.url.startsWith('https://www.botemania.es/')));

// Ultimate Video Poker: manual-screenshot paytable is recorded but must NOT
// by itself unblock a verdict - pRoyalFlushForFixedStrategy stays null until
// independently sourced for this exact 7/5-shaped table, so the engine still
// refuses to compute a breakeven even though a paytable now exists.
{
  const uvp = BOTEMANIA_VIDEO_POKER_TITLES.find((t) => t.slug === 'ultimate-video-poker');
  assert.equal(uvp.exactPaytableRecovered, true);
  assert.equal(uvp.manualScreenshotEvidence.paytableCoinsPerCredit1.royalFlush, 800);
  assert.equal(uvp.manualScreenshotEvidence.observedHandsPerSpin, 10);
  assert.equal(uvp.manualScreenshotEvidence.observedBetPerHandEUR, 2.5);
  const r = progressiveVideoPokerEv({
    baseRtpAtSeedForFixedStrategy: 0.95, // illustrative only - not Botemania's real seed RTP
    pRoyalFlushForFixedStrategy: uvp.pRoyalFlushForFixedStrategy,
    seedJackpotCoinsPerWinningHand: 800,
    currentJackpotCoinsPerWinningHand: 3448.25,
    qualifyingCoinsBetPerHand: uvp.manualScreenshotEvidence.observedBetPerHandEUR,
    handsPerSpin: uvp.manualScreenshotEvidence.observedHandsPerSpin,
    strategyInputsVerified: true,
  });
  assert.equal(r.blocked, true, 'a real paytable alone must not be enough to compute a verdict without a sourced pRoyalFlush');
  assert.equal(r.reason, 'MISSING_REQUIRED_NUMERIC_INPUT');
}

console.log('progressive-video-poker-ev-v1.test.mjs: PASS');
