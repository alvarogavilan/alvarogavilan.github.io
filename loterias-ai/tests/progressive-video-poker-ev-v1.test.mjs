import assert from 'node:assert/strict';
import { progressiveVideoPokerEv, BOTEMANIA_VIDEO_POKER_TITLES } from '../casino/jackpots/progressive-video-poker-ev-v1.mjs';

// Hand-computed: delta=1000, boost=1*0.00002*(1000/5)=0.004, totalRtp=0.984
{
  const r = progressiveVideoPokerEv({
    baseRtpAtSeedJackpot: 0.98,
    pRoyalFlush: 0.00002,
    seedJackpotCoins: 800,
    currentJackpotCoins: 1800,
    totalCoinsBet: 5,
  });
  assert.equal(r.blocked, false);
  assert.equal(r.jackpotDeltaCoins, 1000);
  assert.ok(Math.abs(r.jackpotEvBoost - 0.004) < 1e-9);
  assert.ok(Math.abs(r.totalRtp - 0.984) < 1e-9);
  assert.ok(Math.abs(r.breakEvenJackpotCoins - 5800) < 1e-6);
  assert.ok(Math.abs(r.currentDistanceToBreakEvenCoins - 4000) < 1e-6);
  assert.equal(r.verdict, 'NO_PLAY');
}

// A jackpot at/above break-even must clear CANDIDATE_PLAY
{
  const r = progressiveVideoPokerEv({
    baseRtpAtSeedJackpot: 0.98,
    pRoyalFlush: 0.00002,
    seedJackpotCoins: 800,
    currentJackpotCoins: 6000,
    totalCoinsBet: 5,
  });
  assert.equal(r.verdict, 'CANDIDATE_PLAY');
  assert.ok(r.totalRtp >= 1);
}

// handsPerSpin must scale the jackpot EV boost linearly, never silently assumed as 1
{
  const single = progressiveVideoPokerEv({ baseRtpAtSeedJackpot: 0.98, pRoyalFlush: 0.00002, seedJackpotCoins: 800, currentJackpotCoins: 1800, totalCoinsBet: 5, handsPerSpin: 1 });
  const ten = progressiveVideoPokerEv({ baseRtpAtSeedJackpot: 0.98, pRoyalFlush: 0.00002, seedJackpotCoins: 800, currentJackpotCoins: 1800, totalCoinsBet: 5, handsPerSpin: 10 });
  assert.ok(Math.abs(ten.jackpotEvBoost - single.jackpotEvBoost * 10) < 1e-9);
}

// Missing/invalid inputs must block rather than silently produce a verdict
assert.equal(progressiveVideoPokerEv({ baseRtpAtSeedJackpot: 0.98, pRoyalFlush: null, seedJackpotCoins: 800, currentJackpotCoins: 1800, totalCoinsBet: 5 }).blocked, true);
assert.equal(progressiveVideoPokerEv({ baseRtpAtSeedJackpot: 0.98, pRoyalFlush: 0, seedJackpotCoins: 800, currentJackpotCoins: 1800, totalCoinsBet: 5 }).blocked, true);
assert.equal(progressiveVideoPokerEv({ baseRtpAtSeedJackpot: 0.98, pRoyalFlush: 0.00002, seedJackpotCoins: 800, currentJackpotCoins: 700, totalCoinsBet: 5 }).blocked, true);

// The tracked Botemania title registry must not claim exact paytable/pRoyalFlush data it hasn't earned
for (const t of BOTEMANIA_VIDEO_POKER_TITLES) {
  assert.equal(t.pRoyalFlush, null, `${t.slug} must not carry a fabricated pRoyalFlush`);
}
assert.equal(BOTEMANIA_VIDEO_POKER_TITLES.length, 4);
assert.ok(BOTEMANIA_VIDEO_POKER_TITLES.every((t) => typeof t.slug === 'string' && t.url.startsWith('https://www.botemania.es/')));

console.log('progressive-video-poker-ev-v1.test.mjs: PASS');
