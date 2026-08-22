// Exact expected value of a specific hold pattern on a specific dealt hand,
// via full enumeration of every possible draw for the discarded slots. This
// is exact (not approximated), and fast for a SINGLE hand+hold (worst case
// C(47,5)=1,533,939 combinations, well under a second in JS) - it is only
// used to validate individual example hands, never run at the scale of a
// full population sweep or a large Monte Carlo loop (see
// jacks-or-better-strategy-v1.mjs for why that full sweep is not attempted
// here, and monte-carlo-rtp-v1.mjs for the honestly-labeled statistical
// alternative used at scale).
import { evaluateHand, payoutCredits } from './hand-evaluator-v1.mjs';

function combinations(arr, k, start, current, out) {
  if (current.length === k) { out.push(current.slice()); return; }
  for (let i = start; i < arr.length; i++) {
    current.push(arr[i]);
    combinations(arr, k, i + 1, current, out);
    current.pop();
  }
}

export function cardsKey(cards) {
  return cards.map((c) => `${c.rank}-${c.suit}`).sort().join(',');
}

// heldIndices: indices (0-4) into `hand` to keep. remainingDeck: the other
// 47 cards not in `hand`. Returns { evCredits, distinctDraws }.
export function exactHoldEV(hand, heldIndices, remainingDeck, paytable) {
  const held = heldIndices.map((i) => hand[i]);
  const drawCount = 5 - held.length;
  if (drawCount === 0) {
    const category = evaluateHand(held);
    return { evCredits: payoutCredits(category, paytable), distinctDraws: 1 };
  }
  const draws = [];
  combinations(remainingDeck, drawCount, 0, [], draws);
  let total = 0;
  for (const draw of draws) {
    const finalHand = [...held, ...draw];
    total += payoutCredits(evaluateHand(finalHand), paytable);
  }
  return { evCredits: total / draws.length, distinctDraws: draws.length };
}

// Evaluates every one of the 32 hold patterns for a dealt 5-card hand and
// returns the exact-EV-optimal one. Only safe to call for a handful of
// hands at a time (see module docstring) - each call does real combinatorial
// work up to C(47,5).
export function exactOptimalHold(hand, remainingDeck, paytable) {
  let best = null;
  for (let mask = 0; mask < 32; mask++) {
    const heldIndices = [0, 1, 2, 3, 4].filter((i) => (mask & (1 << i)) !== 0);
    const { evCredits } = exactHoldEV(hand, heldIndices, remainingDeck, paytable);
    if (!best || evCredits > best.evCredits) best = { mask, heldIndices, evCredits };
  }
  return best;
}
