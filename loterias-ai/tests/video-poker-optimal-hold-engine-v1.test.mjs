import assert from 'node:assert/strict';
import { chooseOptimalHold, resolveProgressiveConfig } from '../casino/video-poker/optimal-hold-engine-v1.mjs';
import { exactHoldEV, forEachCombination } from '../casino/video-poker/exact-hold-ev-v1.mjs';
import { STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE } from '../casino/video-poker/jacks-or-better-strategy-v1.mjs';
import { buildDeck, evaluateHand, payoutCredits } from '../casino/video-poker/hand-evaluator-v1.mjs';

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
  assert.ok(r.evReturnMultiple > 4, 'must exceed the made straight\'s guaranteed EV of 4');
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
    progressive: { jackpotEUR: 50, denomination: 1, creditsBet: 1, qualifyingBet: 1, payoutMode: 'REPLACE' },
  });
  const highJackpot = chooseOptimalHold({
    hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
    progressive: { jackpotEUR: 1000, denomination: 1, creditsBet: 1, qualifyingBet: 1, payoutMode: 'REPLACE' },
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
  assert.equal(a.evReturnMultiple, b.evReturnMultiple);
}

// resolveProgressiveConfig: a bet below the qualifying threshold must never
// apply the jackpot - this is a real, common video-poker rule (many
// progressives require max-bet to qualify) and getting it wrong would
// silently overstate EV.
{
  const notQualified = resolveProgressiveConfig({ jackpotEUR: 5000, denomination: 1, creditsBet: 1, qualifyingBet: 5, payoutMode: 'REPLACE' });
  assert.equal(notQualified.applied, false);
  assert.equal(notQualified.reason, 'BET_DOES_NOT_QUALIFY_FOR_JACKPOT');

  const qualified = resolveProgressiveConfig({ jackpotEUR: 5000, denomination: 1, creditsBet: 5, qualifyingBet: 5, payoutMode: 'REPLACE' });
  assert.equal(qualified.applied, true);
  assert.equal(qualified.effective.effectiveReturnMultiple, 1000);
}
assert.deepEqual(resolveProgressiveConfig(null), { applied: false, reason: 'NO_PROGRESSIVE_SUPPLIED', effective: null });

// A non-qualifying bet must fall back to the ordinary fixed payout, NOT
// silently drop the royal payout to zero.
{
  const hand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)]; // made royal flush
  const r = chooseOptimalHold({
    hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
    progressive: { jackpotEUR: 50000, denomination: 1, creditsBet: 1, qualifyingBet: 5, payoutMode: 'REPLACE' },
  });
  assert.equal(r.progressiveApplied, false);
  assert.equal(r.evReturnMultiple, STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE.royalFlushReturnMultiple);
}

// --- Second review on #297: payoutMode is mandatory, never silently
// defaulted, and REPLACE vs ADD_TO_BASE must produce genuinely different,
// mathematically correct EVs. ---

// An unknown/missing payoutMode must fail closed, never silently pick REPLACE.
{
  const missing = resolveProgressiveConfig({ jackpotEUR: 5000, denomination: 1, creditsBet: 1 });
  assert.equal(missing.applied, false);
  assert.equal(missing.reason, 'PAYOUT_MODE_MISSING_OR_UNKNOWN');

  const unknown = resolveProgressiveConfig({ jackpotEUR: 5000, denomination: 1, creditsBet: 1, payoutMode: 'DOUBLE_IT' });
  assert.equal(unknown.applied, false);
  assert.equal(unknown.reason, 'PAYOUT_MODE_MISSING_OR_UNKNOWN');
}

// REPLACE vs ADD_TO_BASE on the same hand/jackpot must differ by EXACTLY the
// base paytable's fixed payout for the triggering category - the
// mathematically correct relationship between the two modes.
{
  const hand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)]; // made royal flush
  const replaceResult = chooseOptimalHold({
    hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
    progressive: { jackpotEUR: 5000, denomination: 1, creditsBet: 1, payoutMode: 'REPLACE' },
  });
  const addToBaseResult = chooseOptimalHold({
    hand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
    progressive: { jackpotEUR: 5000, denomination: 1, creditsBet: 1, payoutMode: 'ADD_TO_BASE' },
  });
  assert.equal(replaceResult.evReturnMultiple, 5000);
  assert.equal(addToBaseResult.evReturnMultiple, 5000 + STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE.royalFlushReturnMultiple);
  assert.notEqual(replaceResult.evReturnMultiple, addToBaseResult.evReturnMultiple);
}

// triggerSuit combined with a category other than ROYAL_FLUSH has no real
// suit-check behind it (royalFlushSuit() only exists for royals) - must
// fail closed with a specific reason, never silently make the trigger
// permanently unreachable.
{
  const r = resolveProgressiveConfig({ jackpotEUR: 5000, denomination: 1, creditsBet: 1, payoutMode: 'REPLACE', triggerCategory: 'FOUR_OF_A_KIND', triggerSuit: 0 });
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'UNSUPPORTED_TRIGGER_SUIT_CATEGORY');
}
// The same combination on ROYAL_FLUSH (the only supported case) must apply normally.
{
  const r = resolveProgressiveConfig({ jackpotEUR: 5000, denomination: 1, creditsBet: 1, payoutMode: 'REPLACE', triggerCategory: 'ROYAL_FLUSH', triggerSuit: 0 });
  assert.equal(r.applied, true);
}

// --- Second review on #297: exact enumeration must be streaming (no large
// array materialization), with the identical mathematical result as a
// naive reference implementation for a small, independently-computable case. ---
{
  const hand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(9, 1)];
  const held = [hand[0], hand[1], hand[2], hand[3]]; // hold 4, draw 1 -> C(47,1)=47, cheap to also compute the naive way
  const used = new Set(hand.map((x) => `${x.rank}-${x.suit}`));
  const remainingDeck = buildDeck().filter((x) => !used.has(`${x.rank}-${x.suit}`));

  // Naive reference: materialize every single-card draw explicitly.
  let naiveTotal = 0, naiveCount = 0;
  for (const draw of remainingDeck) {
    naiveTotal += payoutCredits(evaluateHand([...held, draw]), STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE);
    naiveCount++;
  }
  const naiveEV = naiveTotal / naiveCount;

  const streaming = exactHoldEV(hand, [0, 1, 2, 3], remainingDeck, STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE);
  assert.equal(streaming.distinctDraws, naiveCount);
  assert.equal(streaming.evReturnMultiple, naiveEV);
}

// forEachCombination itself: count must match the exact binomial coefficient
// (C(47,5)=1,533,939 for a full discard-5), and it must never materialize a
// full results array - proven here by checking it returns only a count and
// invokes the callback the correct number of times, not by an array length.
{
  const deck47 = buildDeck().slice(0, 47);
  let calls = 0;
  const count = forEachCombination(deck47, 5, () => { calls++; });
  assert.equal(count, 1533939);
  assert.equal(calls, 1533939);
}
// A small, hand-checkable case: C(4,2) = 6.
{
  let calls = 0;
  const count = forEachCombination([1, 2, 3, 4], 2, () => { calls++; });
  assert.equal(count, 6);
  assert.equal(calls, 6);
}

console.log('video-poker-optimal-hold-engine-v1.test.mjs: PASS');
