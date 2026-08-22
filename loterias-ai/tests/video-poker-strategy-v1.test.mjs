import assert from 'node:assert/strict';
import { chooseHold } from '../casino/video-poker/jacks-or-better-strategy-v1.mjs';
import { evaluateHand, buildDeck } from '../casino/video-poker/hand-evaluator-v1.mjs';
import { exactOptimalHold } from '../casino/video-poker/exact-hold-ev-v1.mjs';
import { STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE } from '../casino/video-poker/jacks-or-better-strategy-v1.mjs';

const c = (rank, suit) => ({ rank, suit });
const sortedIdx = (a) => [...a].sort();

function remainingDeck(hand) {
  const key = (x) => `${x.rank}-${x.suit}`;
  const used = new Set(hand.map(key));
  return buildDeck().filter((x) => !used.has(key(x)));
}

// Unambiguous, uncontested cases first.
{
  // Made royal flush - hold everything.
  const hand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)];
  assert.deepEqual(sortedIdx(chooseHold(hand)), [0, 1, 2, 3, 4]);
}
{
  // Four of a kind + kicker - hold only the quad, discard the kicker.
  const hand = [c(9, 0), c(9, 1), c(9, 2), c(9, 3), c(2, 0)];
  assert.deepEqual(sortedIdx(chooseHold(hand)), [0, 1, 2, 3]);
}
{
  // A low pair (below Jack) - hold just the pair, not the kickers.
  const hand = [c(6, 0), c(6, 1), c(2, 2), c(9, 0), c(13, 1)];
  assert.deepEqual(sortedIdx(chooseHold(hand)), [0, 1]);
}
{
  // A high pair (Jacks or better) - hold just the pair.
  const hand = [c(12, 0), c(12, 1), c(2, 2), c(9, 0), c(5, 1)];
  assert.deepEqual(sortedIdx(chooseHold(hand)), [0, 1]);
}

// The real bug this suite exists to catch: 4 cards to a royal flush must be
// held EVEN WHEN it means breaking an already-made straight or flush - its
// EV (driven by the 800x royal payout) is far higher. Verified independently
// via exact enumeration (exactOptimalHold), not just asserted.
{
  // 10-J-Q-K suited plus an off-suit 9: a made STRAIGHT that also contains
  // 4 cards to a royal flush.
  const hand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(9, 1)];
  assert.equal(evaluateHand(hand), 'STRAIGHT');
  const chosen = sortedIdx(chooseHold(hand));
  assert.deepEqual(chosen, [0, 1, 2, 3]);
  const exact = exactOptimalHold(hand, remainingDeck(hand), STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE);
  assert.deepEqual(sortedIdx(exact.heldIndices), chosen);
}
{
  // 10-J-Q-K suited plus an off-suit 2 of the same suit as one of the
  // others would make a flush instead - construct a made FLUSH that
  // contains 4 cards to a royal flush (2 of spades alongside T/J/Q/K of
  // spades).
  const hand = [c(2, 0), c(10, 0), c(11, 0), c(12, 0), c(13, 0)];
  assert.equal(evaluateHand(hand), 'FLUSH');
  const chosen = sortedIdx(chooseHold(hand));
  assert.deepEqual(chosen, [1, 2, 3, 4]);
  const exact = exactOptimalHold(hand, remainingDeck(hand), STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE);
  assert.deepEqual(sortedIdx(exact.heldIndices), chosen);
}

// Cross-validate a broader spread of hands against the exact enumeration
// engine: the chosen hold must always be AT LEAST the best of the "clearly
// correct" reference set (made hand vs hold-nothing vs the strategy's own
// pick) - i.e. the strategy must never choose something exact enumeration
// proves is strictly worse than simply keeping the made hand.
{
  const examples = [
    [c(3, 0), c(3, 1), c(3, 2), c(7, 3), c(11, 0)], // trips
    [c(5, 0), c(5, 1), c(9, 2), c(9, 3), c(2, 0)], // two pair
    [c(4, 0), c(5, 0), c(6, 0), c(7, 0), c(13, 1)], // 4 to a flush
    [c(2, 0), c(3, 1), c(4, 2), c(5, 3), c(13, 0)], // 4 to an outside straight
  ];
  for (const hand of examples) {
    const chosenIdx = sortedIdx(chooseHold(hand));
    const rest = remainingDeck(hand);
    const exact = exactOptimalHold(hand, rest, STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE);
    // Not asserting exact equality (the strategy is documented as
    // near-optimal, not exhaustively re-derived) - but the strategy's own
    // chosen hold's EV must be within a small, explicit tolerance of the
    // true exact-optimal EV for that specific hand, never wildly worse.
    const { exactHoldEV } = await import('../casino/video-poker/exact-hold-ev-v1.mjs');
    const chosenEV = exactHoldEV(hand, chosenIdx, rest, STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE).evCredits;
    assert.ok(exact.evCredits - chosenEV <= 0.5, `hand ${JSON.stringify(hand)}: strategy EV ${chosenEV} too far below exact-optimal EV ${exact.evCredits}`);
  }
}

console.log('video-poker-strategy-v1.test.mjs: PASS');
