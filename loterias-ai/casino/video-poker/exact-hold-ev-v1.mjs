// Exact expected value (a return multiple - see hand-evaluator-v1.mjs's
// resolvePayout docstring for units) of a specific hold pattern on a
// specific dealt hand, via full enumeration of every possible draw for the
// discarded slots. This is exact (not approximated), and fast for a SINGLE
// hand+hold - it is only used to validate individual example hands, never
// run at the scale of a full population sweep or a large Monte Carlo loop
// (see jacks-or-better-strategy-v1.mjs for the fast heuristic used at
// scale, and monte-carlo-rtp-v1.mjs for the honestly-labeled statistical
// alternative).
//
// Enumeration is STREAMING: forEachCombination() below reuses one mutable
// scratch array and invokes a callback per combination rather than
// materializing every draw into an array first. Worst case (discard-5) is
// C(47,5)=1,533,939 combinations - streaming keeps peak memory bounded to a
// handful of small arrays regardless of that count, instead of one huge
// array of 1.5M 5-card hands. The mathematical result is identical either
// way (same combinations, same sum, same count) - see
// video-poker-optimal-hold-engine-v1.test.mjs for a direct comparison
// against a small independently-computed reference case.
//
// Fully paytable-parametric, and optionally progressive-parametric: pass
// `progressive` to make the exact EV react to the CURRENT jackpot amount,
// not just a fixed base paytable - see hand-evaluator-v1.mjs's
// resolvePayout() for the exact semantics (suit-gating, non-qualifying
// fallback to the ordinary fixed payout, REPLACE vs ADD_TO_BASE payoutMode).
import { resolvePayout } from './hand-evaluator-v1.mjs';

// Invokes `callback(combo)` once per k-combination of `arr`, reusing a
// single mutable array across all calls. The callback must consume `combo`
// synchronously (e.g. spread it into a fresh small array immediately) and
// must never retain a reference to it - it will be mutated on the next call.
export function forEachCombination(arr, k, callback) {
  const combo = new Array(k);
  let count = 0;
  (function recurse(start, depth) {
    if (depth === k) { callback(combo); count++; return; }
    // Prune: stop once there are no longer enough remaining elements to
    // fill the rest of the combination.
    const remainingSlots = k - depth;
    for (let i = start; i <= arr.length - remainingSlots; i++) {
      combo[depth] = arr[i];
      recurse(i + 1, depth + 1);
    }
  })(0, 0);
  return count;
}

export function cardsKey(cards) {
  return cards.map((c) => `${c.rank}-${c.suit}`).sort().join(',');
}

// heldIndices: indices (0-4) into `hand` to keep. remainingDeck: the other
// 47 cards not in `hand`. Returns { evReturnMultiple, distinctDraws }.
export function exactHoldEV(hand, heldIndices, remainingDeck, paytable, progressive) {
  const held = heldIndices.map((i) => hand[i]);
  const drawCount = 5 - held.length;
  if (drawCount === 0) {
    return { evReturnMultiple: resolvePayout(held, paytable, progressive), distinctDraws: 1 };
  }
  let total = 0;
  const distinctDraws = forEachCombination(remainingDeck, drawCount, (draw) => {
    const finalHand = [...held, ...draw];
    total += resolvePayout(finalHand, paytable, progressive);
  });
  return { evReturnMultiple: total / distinctDraws, distinctDraws };
}

// Evaluates every one of the 32 hold patterns for a dealt 5-card hand and
// returns the exact-EV-optimal one. Only safe to call for a handful of
// hands at a time (see module docstring) - each call does real combinatorial
// work up to C(47,5).
export function exactOptimalHold(hand, remainingDeck, paytable, progressive) {
  let best = null;
  for (let mask = 0; mask < 32; mask++) {
    const heldIndices = [0, 1, 2, 3, 4].filter((i) => (mask & (1 << i)) !== 0);
    const { evReturnMultiple } = exactHoldEV(hand, heldIndices, remainingDeck, paytable, progressive);
    if (!best || evReturnMultiple > best.evReturnMultiple) best = { mask, heldIndices, evReturnMultiple };
  }
  return best;
}
