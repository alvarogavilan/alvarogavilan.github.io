// The real, paytable/progressive-parametric exact optimal-hold engine.
// This is the ONLY function that should ever be used to determine strategy
// for an actual progressive jackpot decision - jacks-or-better-strategy-v1.mjs's
// chooseHold() is a fixed heuristic tied to one specific (9/6-shaped)
// payout ordering and must never be used for that purpose (see its own
// module docstring for the explicit warning).
//
// For a given dealt hand, tries all 32 hold patterns and computes the EXACT
// expected value of each via full draw enumeration (exact-hold-ev-v1.mjs),
// under the exact paytable given - including, when a progressive is
// supplied, the exact CURRENT jackpot amount. This means the chosen hold
// can genuinely change as the jackpot grows: a small jackpot may not be
// worth breaking a made full house for a 4-to-royal-flush draw, while a
// large one clearly is - the whole point of a real progressive-aware
// optimizer, as opposed to a fixed hold-priority heuristic.
import { buildDeck } from './hand-evaluator-v1.mjs';
import { exactOptimalHold } from './exact-hold-ev-v1.mjs';

function remainingDeckFor(hand) {
  const key = (c) => `${c.rank}-${c.suit}`;
  const used = new Set(hand.map(key));
  return buildDeck().filter((c) => !used.has(key(c)));
}

// progressive (optional): {
//   jackpotEUR: number,          // current live jackpot amount
//   denomination: number,        // EUR per credit
//   creditsBet: number,          // credits actually being wagered this hand
//   qualifyingBet: number,       // minimum credits required to be jackpot-eligible
//   triggerCategory: string,     // defaults to 'ROYAL_FLUSH'
//   triggerSuit: number | null,  // if set, only this suit's triggerCategory pays the jackpot
// }
export function resolveProgressiveConfig(progressive) {
  if (!progressive) return { applied: false, reason: 'NO_PROGRESSIVE_SUPPLIED', effective: null };
  const { jackpotEUR, denomination, creditsBet, qualifyingBet, triggerCategory = 'ROYAL_FLUSH', triggerSuit = null } = progressive;
  if (!(jackpotEUR > 0) || !(denomination > 0) || !(creditsBet > 0)) {
    return { applied: false, reason: 'INVALID_PROGRESSIVE_PARAMETERS', effective: null };
  }
  if (qualifyingBet != null && creditsBet < qualifyingBet) {
    return { applied: false, reason: 'BET_DOES_NOT_QUALIFY_FOR_JACKPOT', effective: null };
  }
  const betAmountEUR = denomination * creditsBet;
  const effectiveCredits = jackpotEUR / betAmountEUR;
  return {
    applied: true,
    reason: 'PROGRESSIVE_APPLIED',
    effective: { effectiveCredits, triggerCategory, triggerSuit },
  };
}

// Returns the exact-optimal hold for `hand` under `paytable`, with an
// optional `progressive` override. Deterministic: same inputs always
// produce the same output (no randomness anywhere in this path).
export function chooseOptimalHold({ hand, paytable, progressive }) {
  if (!Array.isArray(hand) || hand.length !== 5) throw new Error('chooseOptimalHold requires exactly 5 cards');
  if (!paytable) throw new Error('chooseOptimalHold requires a paytable');
  const progressiveResolution = resolveProgressiveConfig(progressive);
  const remainingDeck = remainingDeckFor(hand);
  const best = exactOptimalHold(hand, remainingDeck, paytable, progressiveResolution.effective);
  return {
    heldIndices: best.heldIndices,
    mask: best.mask,
    evCredits: best.evCredits,
    paytableUsed: paytable,
    progressiveApplied: progressiveResolution.applied,
    progressiveReason: progressiveResolution.reason,
    progressiveEffective: progressiveResolution.effective,
    method: 'EXACT_ENUMERATION_ALL_32_HOLDS',
    exact: true,
  };
}
