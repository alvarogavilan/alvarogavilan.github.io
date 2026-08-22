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

export function payoutCredits(category, paytable) {
  if (category === 'ROYAL_FLUSH') return paytable.royalFlushCredits ?? 0;
  return paytable[category] ?? 0;
}
