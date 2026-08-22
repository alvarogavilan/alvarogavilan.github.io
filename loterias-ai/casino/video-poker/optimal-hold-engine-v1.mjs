// The real, paytable/progressive-parametric exact optimal-hold engine.
// This is the ONLY function that should ever be used to determine strategy
// for an actual progressive jackpot decision - jacks-or-better-strategy-v1.mjs's
// chooseHold() is a fixed heuristic tied to one specific (9/6-shaped)
// payout ordering and must never be used for that purpose (see its own
// module docstring for the explicit warning).
//
// For a given dealt hand, tries all 32 hold patterns and computes the EXACT
// expected value (a return multiple - see hand-evaluator-v1.mjs's
// resolvePayout docstring for units) of each via full draw enumeration
// (exact-hold-ev-v1.mjs), under the exact paytable given - including, when
// a progressive is supplied, the exact CURRENT jackpot amount. This means
// the chosen hold can genuinely change as the jackpot grows: a small
// jackpot may not be worth breaking a made full house for a
// 4-to-royal-flush draw, while a large one clearly is - the whole point of
// a real progressive-aware optimizer, as opposed to a fixed hold-priority
// heuristic.
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
//   triggerSuit: number | null,  // if set, only this suit's triggerCategory pays the jackpot - ONLY supported when triggerCategory is 'ROYAL_FLUSH' (see below)
//   payoutMode: 'REPLACE' | 'ADD_TO_BASE', // REQUIRED - no default, no silent choice
// }
//
// ALL validation for a progressive lives here, once, upfront - never inside
// resolvePayout() itself, which is called up to ~1.5M times per exact-hold
// evaluation and must never branch on invalid-input handling in that hot
// path. This function is the single fail-closed gate: anything it doesn't
// explicitly accept comes back as `applied: false` with a specific reason,
// and the caller falls back to ordinary (non-progressive) paytable payouts.
export function resolveProgressiveConfig(progressive) {
  if (!progressive) return { applied: false, reason: 'NO_PROGRESSIVE_SUPPLIED', effective: null };
  const { jackpotEUR, denomination, creditsBet, qualifyingBet, triggerCategory = 'ROYAL_FLUSH', triggerSuit = null, payoutMode } = progressive;
  if (!(jackpotEUR > 0) || !(denomination > 0) || !(creditsBet > 0)) {
    return { applied: false, reason: 'INVALID_PROGRESSIVE_PARAMETERS', effective: null };
  }
  if (qualifyingBet != null && creditsBet < qualifyingBet) {
    return { applied: false, reason: 'BET_DOES_NOT_QUALIFY_FOR_JACKPOT', effective: null };
  }
  // payoutMode is mandatory and must be exactly one of these two values -
  // REPLACE vs ADD_TO_BASE is a real, meaningfully different payout
  // structure between real progressive variants, and silently defaulting to
  // either one would be exactly the kind of fabricated-looking-but-wrong
  // math this whole project's evidence discipline forbids. Missing, null,
  // unrecognized, or not-yet-verified-for-Spain must all fail closed here.
  if (payoutMode !== 'REPLACE' && payoutMode !== 'ADD_TO_BASE') {
    return { applied: false, reason: 'PAYOUT_MODE_MISSING_OR_UNKNOWN', effective: null };
  }
  // Suit-gating is only implemented for ROYAL_FLUSH (royalFlushSuit() is the
  // only suit-extraction helper that exists). A triggerSuit combined with
  // any other category has no real suit-check behind it - resolvePayout()
  // would silently make the trigger permanently unreachable (always
  // "wrong suit") rather than doing what was actually asked. Fail closed
  // instead of shipping that silent bug.
  if (triggerSuit != null && triggerCategory !== 'ROYAL_FLUSH') {
    return { applied: false, reason: 'UNSUPPORTED_TRIGGER_SUIT_CATEGORY', effective: null };
  }
  const betAmountEUR = denomination * creditsBet;
  const effectiveReturnMultiple = jackpotEUR / betAmountEUR;
  return {
    applied: true,
    reason: 'PROGRESSIVE_APPLIED',
    effective: { effectiveReturnMultiple, triggerCategory, triggerSuit, payoutMode },
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
    evReturnMultiple: best.evReturnMultiple,
    paytableUsed: paytable,
    progressiveApplied: progressiveResolution.applied,
    progressiveReason: progressiveResolution.reason,
    progressiveEffective: progressiveResolution.effective,
    method: 'EXACT_ENUMERATION_ALL_32_HOLDS',
    exact: true,
  };
}
