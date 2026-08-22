// Exact 5-card video poker hand evaluator. Pure, deterministic, no I/O.
// Ranks: 2-14 (Ace high = 14). Suits: 0-3 (arbitrary labels).
export function buildDeck() {
  const deck = [];
  for (let suit = 0; suit < 4; suit++) for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
  return deck;
}

export const CATEGORY_ORDER = [
  'ROYAL_FLUSH', 'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND', 'FULL_HOUSE', 'FLUSH',
  'STRAIGHT', 'THREE_OF_A_KIND', 'TWO_PAIR', 'JACKS_OR_BETTER', 'NOTHING',
];

function rankCounts(cards) {
  const m = new Map();
  for (const c of cards) m.set(c.rank, (m.get(c.rank) || 0) + 1);
  return m;
}

function isFlush(cards) {
  return cards.every((c) => c.suit === cards[0].suit);
}

// Returns the high card of the straight if cards form one (Ace can be low,
// A-2-3-4-5 => high card reported as 5), otherwise null.
function straightHigh(cards) {
  const ranks = [...new Set(cards.map((c) => c.rank))];
  if (ranks.length !== 5) return null;
  ranks.sort((a, b) => a - b);
  if (ranks[4] - ranks[0] === 4) return ranks[4];
  // wheel: A,2,3,4,5
  if (JSON.stringify(ranks) === JSON.stringify([2, 3, 4, 5, 14])) return 5;
  return null;
}

export function evaluateHand(cards) {
  if (!Array.isArray(cards) || cards.length !== 5) throw new Error('evaluateHand requires exactly 5 cards');
  const flush = isFlush(cards);
  const sHigh = straightHigh(cards);
  if (flush && sHigh === 14 && cards.some((c) => c.rank === 10)) {
    // A straight flush with high card Ace and containing a 10 is exactly T-J-Q-K-A.
    return 'ROYAL_FLUSH';
  }
  if (flush && sHigh !== null) return 'STRAIGHT_FLUSH';

  const counts = [...rankCounts(cards).entries()];
  const byCount = counts.map(([rank, n]) => ({ rank, n })).sort((a, b) => b.n - a.n || b.rank - a.rank);
  const top = byCount[0];

  if (top.n === 4) return 'FOUR_OF_A_KIND';
  if (top.n === 3 && byCount[1]?.n === 2) return 'FULL_HOUSE';
  if (flush) return 'FLUSH';
  if (sHigh !== null) return 'STRAIGHT';
  if (top.n === 3) return 'THREE_OF_A_KIND';
  if (top.n === 2 && byCount[1]?.n === 2) return 'TWO_PAIR';
  if (top.n === 2 && top.rank >= 11) return 'JACKS_OR_BETTER';
  return 'NOTHING';
}

// Units, unambiguously: every number this module returns or accepts as a
// paytable/payout value is a RETURN MULTIPLE of a single 1-credit bet -
// dimensionless, not a currency amount (25 means "25x your 1-credit bet
// back", not "25 EUR"). A paytable's fixed entries (FOUR_OF_A_KIND: 25,
// etc.) already follow this convention throughout this codebase; this
// comment exists so a future progressive/currency calculation is never
// blended with a raw paytable multiple without first converting units
// explicitly (see optimal-hold-engine-v1.mjs's resolveProgressiveConfig for
// exactly that conversion: jackpotEUR / (denominationEURPerCredit *
// creditsBetPerHand)).
export function payoutCredits(category, paytable) {
  if (category === 'ROYAL_FLUSH') return paytable.royalFlushReturnMultiple ?? 0;
  return paytable[category] ?? 0;
}

// The suit a royal flush was made in (null for any other category, or a
// non-flush hand). Needed for suit-gated progressive jackpots (some real
// cabinets pay the progressive only for a specific suit's royal, with any
// other suit's royal paying the ordinary fixed royal amount instead).
export function royalFlushSuit(cards) {
  return evaluateHand(cards) === 'ROYAL_FLUSH' ? cards[0].suit : null;
}

// Resolves the exact payout (return multiple) for a finished hand, applying
// a progressive jackpot override when applicable. `progressive` (optional)
// must already be a FULLY VALIDATED effective config - this function trusts
// it completely and never itself validates payoutMode, staking eligibility,
// or trigger-suit/category combinations; all of that validation (including
// the fail-closed rejections) happens once, upfront, in
// optimal-hold-engine-v1.mjs's resolveProgressiveConfig(), specifically so
// this function - called once per enumerated draw, up to ~1.5M times per
// hand - never has to branch on invalid-input handling in its hot path.
// Shape: { jackpotReturnMultiple, totalHandBetEUR, triggerCategory,
// triggerSuit, payoutMode } where payoutMode is 'REPLACE' (payout =
// jackpotReturnMultiple only) or 'ADD_TO_BASE' (payout = the ordinary fixed
// paytable value PLUS jackpotReturnMultiple) - resolveProgressiveConfig
// guarantees payoutMode is always one of exactly these two values, and
// triggerCategory/triggerSuit are always explicit (never defaulted), before
// this function ever sees them.
export function resolvePayout(cards, paytable, progressive) {
  const category = evaluateHand(cards);
  const baseReturnMultiple = payoutCredits(category, paytable);
  if (!progressive) return baseReturnMultiple;
  if (category !== progressive.triggerCategory) return baseReturnMultiple;
  if (progressive.triggerSuit != null && royalFlushSuit(cards) !== progressive.triggerSuit) {
    // Made the triggering category but in the wrong suit for this
    // progressive - falls back to the ordinary fixed payout, never the
    // jackpot amount.
    return baseReturnMultiple;
  }
  return progressive.payoutMode === 'ADD_TO_BASE' ? baseReturnMultiple + progressive.jackpotReturnMultiple : progressive.jackpotReturnMultiple;
}
