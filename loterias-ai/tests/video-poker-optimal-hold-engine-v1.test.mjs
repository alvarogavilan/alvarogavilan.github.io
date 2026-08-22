import assert from 'node:assert/strict';
import { chooseOptimalHold, resolveProgressiveConfig } from '../casino/video-poker/optimal-hold-engine-v1.mjs';
import { STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE } from '../casino/video-poker/jacks-or-better-strategy-v1.mjs';

const c = (rank, suit) => ({ rank, suit });
const sortedIdx = (a) => [...a].sort();

// 1. A hand with a trivially optimal hold: made royal flush - hold everything.
{
  const hand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)];
  const r = chooseOptimalHold({ hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
  assert.deepEqual(sortedIdx(r.heldIndices), [0, 1, 2, 3, 4]);
  assert.equal(r.exact, true);
}

// 2. Four to a royal flush vs a made straight - the exact real bug caught
// during development of the (now-fixed) heuristic strategy. This engine
// must get it right too, independently, via full exact enumeration.
{
  const hand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(9, 1)];
  const r = chooseOptimalHold({ hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
  assert.deepEqual(sortedIdx(r.heldIndices), [0, 1, 2, 3]);
  assert.ok(r.evCredits > 4, 'must exceed the made straight\'s guaranteed EV of 4');
}

// 3. A high pair (Jacks or better) alone - hold just the pair.
{
  const hand = [c(12, 0), c(12, 1), c(2, 2), c(9, 0), c(5, 1)];
  const r = chooseOptimalHold({ hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
  assert.deepEqual(sortedIdx(r.heldIndices), [0, 1]);
}

// 4. Four cards to a flush, no better option available.
{
  const hand = [c(4, 0), c(5, 0), c(6, 0), c(7, 0), c(13, 1)];
  const r = chooseOptimalHold({ hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
  assert.deepEqual(sortedIdx(r.heldIndices), [0, 1, 2, 3]);
}

// 5. Different paytables genuinely change the optimal decision: a hand with
// BOTH a low pair and a 4-to-flush embedded. At a low flush payout, keep
// the pair; at a high flush payout, break it for the flush draw. Verified
// empirically (not asserted from theory) via this same exact engine.
{
  const hand = [c(4, 0), c(7, 0), c(9, 0), c(13, 0), c(4, 1)]; // 4s,7s,9s,Ks + 4h
  const lowFlushPaytable = { ...STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE, FLUSH: 1 };
  const highFlushPaytable = { ...STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE, FLUSH: 10 };
  const lowResult = chooseOptimalHold({ hand, paytable: lowFlushPaytable });
  const highResult = chooseOptimalHold({ hand, paytable: highFlushPaytable });
  assert.deepEqual(sortedIdx(lowResult.heldIndices), [0, 4], 'low flush payout: keep the pair of 4s');
  assert.deepEqual(sortedIdx(highResult.heldIndices), [0, 1, 2, 3], 'high flush payout: break the pair for the flush draw');
  assert.notDeepEqual(sortedIdx(lowResult.heldIndices), sortedIdx(highResult.heldIndices));
}

// 6. A low jackpot vs a high jackpot changes the hold decision on the exact
// same hand and base paytable - the whole point of a real progressive-aware
// optimizer. Verified empirically via this exact engine, not asserted from
// theory: made straight (10-J-Q-K suited + off-suit 9) is worth keeping
// when the royal jackpot is small, but must be broken for the royal draw
// once the jackpot is large enough.
{
  const hand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(9, 1)];
  const lowJackpot = chooseOptimalHold({
    hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
    progressive: { jackpotEUR: 50, denomination: 1, creditsBet: 1, qualifyingBet: 1 },
  });
  const highJackpot = chooseOptimalHold({
    hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
    progressive: { jackpotEUR: 1000, denomination: 1, creditsBet: 1, qualifyingBet: 1 },
  });
  assert.deepEqual(sortedIdx(lowJackpot.heldIndices), [0, 1, 2, 3, 4], 'small jackpot: keep the made straight');
  assert.deepEqual(sortedIdx(highJackpot.heldIndices), [0, 1, 2, 3], 'large jackpot: break it for the royal draw');
  assert.ok(lowJackpot.progressiveApplied && highJackpot.progressiveApplied);
}

// 7. Determinism: identical inputs must always produce an identical result
// - no randomness anywhere in the exact-enumeration path.
{
  const hand = [c(6, 0), c(6, 1), c(9, 2), c(13, 3), c(2, 0)];
  const a = chooseOptimalHold({ hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
  const b = chooseOptimalHold({ hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
  assert.deepEqual(a.heldIndices, b.heldIndices);
  assert.equal(a.evCredits, b.evCredits);
}

// resolveProgressiveConfig: a bet below the qualifying threshold must never
// apply the jackpot - this is a real, common video-poker rule (many
// progressives require max-bet to qualify) and getting it wrong would
// silently overstate EV.
{
  const notQualified = resolveProgressiveConfig({ jackpotEUR: 5000, denomination: 1, creditsBet: 1, qualifyingBet: 5 });
  assert.equal(notQualified.applied, false);
  assert.equal(notQualified.reason, 'BET_DOES_NOT_QUALIFY_FOR_JACKPOT');

  const qualified = resolveProgressiveConfig({ jackpotEUR: 5000, denomination: 1, creditsBet: 5, qualifyingBet: 5 });
  assert.equal(qualified.applied, true);
  assert.equal(qualified.effective.effectiveCredits, 1000);
}
assert.deepEqual(resolveProgressiveConfig(null), { applied: false, reason: 'NO_PROGRESSIVE_SUPPLIED', effective: null });

// A non-qualifying bet must fall back to the ordinary fixed payout, NOT
// silently drop the royal payout to zero.
{
  const hand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)]; // made royal flush
  const r = chooseOptimalHold({
    hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
    progressive: { jackpotEUR: 50000, denomination: 1, creditsBet: 1, qualifyingBet: 5 },
  });
  assert.equal(r.progressiveApplied, false);
  assert.equal(r.evCredits, STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE.royalFlushCredits);
}

console.log('video-poker-optimal-hold-engine-v1.test.mjs: PASS');
