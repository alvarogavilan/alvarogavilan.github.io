import assert from 'node:assert/strict';
import { evaluateHand, payoutCredits } from '../casino/video-poker/hand-evaluator-v1.mjs';
import { STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE } from '../casino/video-poker/jacks-or-better-strategy-v1.mjs';

const c = (rank, suit) => ({ rank, suit });

assert.equal(evaluateHand([c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)]), 'ROYAL_FLUSH');
assert.equal(evaluateHand([c(5, 0), c(6, 0), c(7, 0), c(8, 0), c(9, 0)]), 'STRAIGHT_FLUSH');
// Ace-low straight flush (the "wheel"): A,2,3,4,5 same suit.
assert.equal(evaluateHand([c(14, 1), c(2, 1), c(3, 1), c(4, 1), c(5, 1)]), 'STRAIGHT_FLUSH');
assert.equal(evaluateHand([c(9, 0), c(9, 1), c(9, 2), c(9, 3), c(2, 0)]), 'FOUR_OF_A_KIND');
assert.equal(evaluateHand([c(9, 0), c(9, 1), c(9, 2), c(4, 0), c(4, 1)]), 'FULL_HOUSE');
assert.equal(evaluateHand([c(2, 0), c(6, 0), c(9, 0), c(11, 0), c(13, 0)]), 'FLUSH');
assert.equal(evaluateHand([c(4, 0), c(5, 1), c(6, 0), c(7, 1), c(8, 0)]), 'STRAIGHT');
// Ace-low straight (mixed suits): A,2,3,4,5.
assert.equal(evaluateHand([c(14, 0), c(2, 1), c(3, 0), c(4, 1), c(5, 0)]), 'STRAIGHT');
assert.equal(evaluateHand([c(7, 0), c(7, 1), c(7, 2), c(2, 0), c(9, 1)]), 'THREE_OF_A_KIND');
assert.equal(evaluateHand([c(7, 0), c(7, 1), c(3, 2), c(3, 0), c(9, 1)]), 'TWO_PAIR');
assert.equal(evaluateHand([c(11, 0), c(11, 1), c(3, 2), c(5, 0), c(9, 1)]), 'JACKS_OR_BETTER');
// Low pair (below Jack) does NOT qualify as Jacks-or-Better - must pay nothing.
assert.equal(evaluateHand([c(10, 0), c(10, 1), c(3, 2), c(5, 0), c(9, 1)]), 'NOTHING');
assert.equal(evaluateHand([c(2, 0), c(5, 1), c(9, 2), c(11, 0), c(14, 1)]), 'NOTHING');

// A flush beats a straight numerically in the standard paytable (6 > 4 for 9/6).
assert.ok(payoutCredits('FLUSH', STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE) > payoutCredits('STRAIGHT', STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE));
// Royal flush pays via the dedicated field, not a generic category entry.
assert.equal(payoutCredits('ROYAL_FLUSH', STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE), 800);
assert.equal(payoutCredits('NOTHING', STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE), 0);

assert.throws(() => evaluateHand([c(2, 0), c(3, 0)]));

console.log('video-poker-hand-evaluator-v1.test.mjs: PASS');
