// Monte Carlo RTP estimator for a Jacks-or-Better-style video poker
// paytable, using the standard hold-priority strategy and REAL simulated
// card draws (each simulated hand's payout is computed exactly via
// evaluateHand - only the AGGREGATE RTP over many hands is a statistical
// estimate, never a single simulated hand's own payout). Honestly labeled
// as a Monte Carlo estimate with a reported standard error and 95% CI -
// never presented as an exact combinatorial RTP. An exact combinatorial
// sweep over all C(52,5) hands is not attempted here because doing it
// CORRECTLY (via suit/rank-class reduction) is a much larger, higher-risk
// undertaking than this repo's evidence-integrity rules allow to ship
// without extensive independent verification; see exact-hold-ev-v1.mjs for
// the exact (but only per-example-hand) alternative used to validate
// individual hands from published strategy tables instead.
import { buildDeck, evaluateHand, payoutCredits } from './hand-evaluator-v1.mjs';
import { chooseHold } from './jacks-or-better-strategy-v1.mjs';

// Deterministic PRNG (mulberry32) so a run is exactly reproducible from its
// seed - required for any prospective-vs-discovery split later, and so a
// reported result can be independently re-derived from this same seed.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(deck, rng) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function simulateRTP({ paytable, trials, seed = 1 }) {
  if (!Number.isInteger(trials) || trials <= 0) throw new Error('trials must be a positive integer');
  const rng = mulberry32(seed);
  const deck = buildDeck();
  let totalCredits = 0;
  const payouts = [];
  const categoryCounts = {};

  for (let t = 0; t < trials; t++) {
    const shuffled = shuffle(deck, rng);
    const hand = shuffled.slice(0, 5);
    const rest = shuffled.slice(5);
    const holdIdx = chooseHold(hand);
    const held = holdIdx.map((i) => hand[i]);
    const drawCount = 5 - held.length;
    const finalHand = drawCount > 0 ? [...held, ...rest.slice(0, drawCount)] : held;
    const category = evaluateHand(finalHand);
    const credits = payoutCredits(category, paytable);
    totalCredits += credits;
    payouts.push(credits);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  }

  const meanCreditsPerHand = totalCredits / trials;
  const variance = payouts.reduce((acc, x) => acc + (x - meanCreditsPerHand) ** 2, 0) / (trials - 1 || 1);
  const standardError = Math.sqrt(variance / trials);
  const rtpEstimate = meanCreditsPerHand; // paytable convention: RTP == mean return multiple of the total hand bet at the paytable's declared basisCreditsBetPerHand (see hand-evaluator-v1.mjs's payoutCredits docstring)
  const ci95 = { low: rtpEstimate - 1.96 * standardError, high: rtpEstimate + 1.96 * standardError };

  return {
    trials,
    seed,
    meanCreditsPerHand,
    rtpEstimatePct: +(rtpEstimate * 100).toFixed(4),
    standardErrorPct: +(standardError * 100).toFixed(4),
    ci95Pct: { low: +(ci95.low * 100).toFixed(4), high: +(ci95.high * 100).toFixed(4) },
    categoryCounts,
    categoryFrequencyPct: Object.fromEntries(Object.entries(categoryCounts).map(([k, v]) => [k, +((v / trials) * 100).toFixed(4)])),
    method: 'MONTE_CARLO_STANDARD_STRATEGY_REAL_SIMULATED_DRAWS',
    exactCombinatorialRTP: false,
  };
}

// Progressive variant: replace the fixed royal flush payout with an
// incremental jackpot value, and report break-even (the jackpot credits at
// which conservative RTP crosses 100%) given the non-royal base game RTP
// already estimated (baseRtpExcludingRoyal) and the known royal-flush hit
// probability estimated from the same simulation's categoryFrequencyPct.
export function breakEvenJackpotCredits({ baseRtpExcludingRoyalPct, royalFlushProbability, betCredits }) {
  if (!(royalFlushProbability > 0)) return null;
  const neededPctFromRoyal = 100 - baseRtpExcludingRoyalPct;
  const neededCreditsPerHandFromRoyal = neededPctFromRoyal / 100;
  const neededRoyalPayoutCredits = neededCreditsPerHandFromRoyal / royalFlushProbability;
  return {
    breakEvenRoyalPayoutCredits: +neededRoyalPayoutCredits.toFixed(2),
    breakEvenRoyalPayoutAmount: betCredits ? +(neededRoyalPayoutCredits * betCredits).toFixed(2) : null,
    note: 'Credits are a return multiple of the total hand bet at the paytable\'s declared basisCreditsBetPerHand; multiply by that total hand bet (denomination x basis credits) to get a currency amount. This is NOT Spain-specific - it requires the real Spain paytable and real jackpot amount to become an actionable figure.',
  };
}
