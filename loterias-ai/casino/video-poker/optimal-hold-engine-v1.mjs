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
//
// chooseOptimalHold() NEVER throws for invalid input - every failure mode
// (a physically-impossible hand, an incomplete/corrupt paytable, an
// invalid live-progressive request) returns the SAME structured "blocked"
// shape (strategyAvailable:false, exact:false, blocked:true,
// configurationValid:false, blockReason:'<SPECIFIC_REASON>',
// heldIndices:null, evReturnMultiple:null), so a caller can never mistake
// a blocked result for a usable one by accident, and every failure is
// testable by asserting on a return value rather than a thrown exception.
import { buildDeck, CATEGORY_ORDER } from './hand-evaluator-v1.mjs';
import { exactOptimalHold } from './exact-hold-ev-v1.mjs';

// A progressive-eligible trigger must be a real, meaningfully-achievable
// hand category - "NOTHING" (no payout) can never sensibly be a jackpot
// trigger, and allowing it would be a silent nonsense configuration.
const VALID_TRIGGER_CATEGORIES = CATEGORY_ORDER.filter((cat) => cat !== 'NOTHING');

// Every non-NOTHING category must have an explicit paytable entry -
// ROYAL_FLUSH uses the dedicated royalFlushReturnMultiple field, everything
// else uses its own category name as the key. A MISSING key is never
// silently treated as a legitimate 0 payout - "unknown" and "zero" are
// different facts, and for a solver meant to eventually inform a live
// decision, treating them as the same thing is exactly the kind of
// fabricated-looking-but-wrong math this project's evidence rules forbid.
const REQUIRED_PAYTABLE_KEYS = ['royalFlushReturnMultiple', ...CATEGORY_ORDER.filter((cat) => cat !== 'NOTHING' && cat !== 'ROYAL_FLUSH')];

export const TRIGGER_SUIT_MODE = { ANY_SUIT: 'ANY_SUIT', SPECIFIC_SUIT: 'SPECIFIC_SUIT' };

function remainingDeckFor(hand) {
  const key = (c) => `${c.rank}-${c.suit}`;
  const used = new Set(hand.map(key));
  return buildDeck().filter((c) => !used.has(key(c)));
}

function isValidCard(c) {
  return !!c && Number.isInteger(c.rank) && c.rank >= 2 && c.rank <= 14 && Number.isInteger(c.suit) && c.suit >= 0 && c.suit <= 3;
}

// progressive (optional, but if supplied it is a REQUEST to use a live
// progressive - every field below is mandatory once an object is supplied,
// with no silent defaults, per the standing rule that missing trigger
// semantics must never be interpreted as "verified Royal, all suits":
//   jackpotEUR: number,
//   denominationEURPerCredit: number,
//   creditsBetPerHand: number,
//   qualifyingCreditsBetPerHand: number,       // minimum credits required to be jackpot-eligible
//   triggerCategory: string,                   // REQUIRED - a real hand category, no default
//   triggerSuitMode: 'ANY_SUIT' | 'SPECIFIC_SUIT', // REQUIRED - no default; ambiguity between "no restriction" and "unspecified" is exactly what this forbids
//   triggerSuit: number | null,                // REQUIRED to be a valid 0-3 integer when triggerSuitMode is SPECIFIC_SUIT; REQUIRED to be null/absent when ANY_SUIT
//   payoutMode: 'REPLACE' | 'ADD_TO_BASE',     // REQUIRED - no default, no silent choice
//
// ALL validation for a progressive lives here, once, upfront - never inside
// resolvePayout() itself, which is called up to ~1.5M times per exact-hold
// evaluation and must never branch on invalid-input handling in that hot
// path.
//
// Returns configurationValid:true in exactly two cases - no progressive was
// supplied at all (a deliberate base-game-only analysis request,
// applied:false), or a fully valid progressive was supplied and applied
// (applied:true). Any OTHER case returns configurationValid:false with a
// specific blockReason: a caller error / blocked live-progressive request,
// categorically different from "no progressive was requested".
export function resolveProgressiveConfig(progressive) {
  if (progressive === null || progressive === undefined) {
    return { applied: false, configurationValid: true, blockReason: null, reason: 'NO_PROGRESSIVE_SUPPLIED', effective: null };
  }
  const {
    jackpotEUR, denominationEURPerCredit, creditsBetPerHand, qualifyingCreditsBetPerHand,
    triggerCategory, triggerSuitMode, triggerSuit, payoutMode,
  } = progressive;
  const invalid = (reason) => ({ applied: false, configurationValid: false, blockReason: reason, reason, effective: null });

  if (!(jackpotEUR > 0) || !(denominationEURPerCredit > 0) || !(creditsBetPerHand > 0)) return invalid('INVALID_PROGRESSIVE_PARAMETERS');
  if (qualifyingCreditsBetPerHand != null && creditsBetPerHand < qualifyingCreditsBetPerHand) return invalid('BET_DOES_NOT_QUALIFY_FOR_JACKPOT');
  // payoutMode is mandatory and must be exactly one of these two values -
  // REPLACE vs ADD_TO_BASE is a real, meaningfully different payout
  // structure between real progressive variants, and silently defaulting to
  // either one would be exactly the kind of fabricated-looking-but-wrong
  // math this whole project's evidence discipline forbids.
  if (payoutMode !== 'REPLACE' && payoutMode !== 'ADD_TO_BASE') return invalid('PAYOUT_MODE_MISSING_OR_UNKNOWN');
  // triggerCategory must be explicit and a real, payable category - never
  // defaulted to ROYAL_FLUSH.
  if (!VALID_TRIGGER_CATEGORIES.includes(triggerCategory)) return invalid('TRIGGER_CATEGORY_MISSING_OR_UNKNOWN');
  // triggerSuitMode must be explicit - "unspecified" and "no restriction"
  // are different facts and must never be conflated.
  if (triggerSuitMode !== TRIGGER_SUIT_MODE.ANY_SUIT && triggerSuitMode !== TRIGGER_SUIT_MODE.SPECIFIC_SUIT) {
    return invalid('TRIGGER_SUIT_MODE_MISSING_OR_UNKNOWN');
  }
  let resolvedTriggerSuit = null;
  if (triggerSuitMode === TRIGGER_SUIT_MODE.SPECIFIC_SUIT) {
    if (!(Number.isInteger(triggerSuit) && triggerSuit >= 0 && triggerSuit <= 3)) return invalid('TRIGGER_SUIT_MISSING_FOR_SPECIFIC_SUIT_MODE');
    // Suit-gating is only implemented for ROYAL_FLUSH (royalFlushSuit() is
    // the only suit-extraction helper that exists). A specific triggerSuit
    // combined with any other category has no real suit-check behind it -
    // resolvePayout() would silently make the trigger permanently
    // unreachable rather than doing what was actually asked.
    if (triggerCategory !== 'ROYAL_FLUSH') return invalid('UNSUPPORTED_TRIGGER_SUIT_CATEGORY');
    resolvedTriggerSuit = triggerSuit;
  } else if (triggerSuit !== null && triggerSuit !== undefined) {
    // ANY_SUIT mode must not also carry a contradictory specific suit value.
    return invalid('TRIGGER_SUIT_MUST_BE_NULL_FOR_ANY_SUIT_MODE');
  }

  const totalHandBetEUR = denominationEURPerCredit * creditsBetPerHand;
  const jackpotReturnMultiple = jackpotEUR / totalHandBetEUR;
  return {
    applied: true,
    configurationValid: true,
    blockReason: null,
    reason: 'PROGRESSIVE_APPLIED',
    effective: { jackpotReturnMultiple, totalHandBetEUR, triggerCategory, triggerSuit: resolvedTriggerSuit, payoutMode },
  };
}

// Returns the exact-optimal hold for `hand` under `paytable`, with an
// optional `progressive` override. Deterministic: same inputs always
// produce the same output (no randomness anywhere in this path).
export function chooseOptimalHold({ hand, paytable, progressive }) {
  const blocked = (reason) => ({
    strategyAvailable: false,
    exact: false,
    blocked: true,
    configurationValid: false,
    blockReason: reason,
    heldIndices: null,
    evReturnMultiple: null,
    realMoneyAllowed: false,
  });

  if (!Array.isArray(hand) || hand.length !== 5) return blocked('HAND_WRONG_CARD_COUNT');
  for (const card of hand) if (!isValidCard(card)) return blocked('HAND_INVALID_CARD');
  const distinctCards = new Set(hand.map((card) => `${card.rank}-${card.suit}`));
  if (distinctCards.size !== 5) return blocked('HAND_DUPLICATE_CARD');

  if (!paytable || typeof paytable !== 'object') return blocked('PAYTABLE_MISSING_OR_INVALID_TYPE');
  for (const key of REQUIRED_PAYTABLE_KEYS) if (!(key in paytable)) return blocked('PAYTABLE_INCOMPLETE');
  for (const value of Object.values(paytable)) if (!Number.isFinite(value) || value < 0) return blocked('PAYTABLE_INVALID_VALUE');

  const progressiveResolution = resolveProgressiveConfig(progressive);
  if (progressiveResolution.configurationValid === false) return blocked(progressiveResolution.blockReason);

  const remainingDeck = remainingDeckFor(hand);
  const best = exactOptimalHold(hand, remainingDeck, paytable, progressiveResolution.effective);
  return {
    strategyAvailable: true,
    heldIndices: best.heldIndices,
    mask: best.mask,
    evReturnMultiple: best.evReturnMultiple,
    paytableUsed: paytable,
    progressiveApplied: progressiveResolution.applied,
    progressiveReason: progressiveResolution.reason,
    progressiveEffective: progressiveResolution.effective,
    method: 'EXACT_ENUMERATION_ALL_32_HOLDS',
    exact: true,
    blocked: false,
    configurationValid: true,
    realMoneyAllowed: false,
  };
}
