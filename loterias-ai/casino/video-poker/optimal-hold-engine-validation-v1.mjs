#!/usr/bin/env node
// Real, persisted evidence that chooseOptimalHold() is genuinely
// paytable/progressive-parametric AND fails closed correctly - on an
// invalid live-progressive request, an incomplete/corrupt paytable, an
// unknown or mismatched credits-bet basis, and a physically-impossible hand
// - rather than silently downgrading to a plausible-looking base-game
// "exact" answer. Zero network, deterministic, reproducible.
import fs from 'node:fs';
import { chooseOptimalHold, resolveProgressiveConfig, TRIGGER_SUIT_MODE } from './optimal-hold-engine-v1.mjs';
import { STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE } from './jacks-or-better-strategy-v1.mjs';

const OUT = 'loterias-ai/casino/video-poker/evidence/optimal-hold-engine-validation-v1.json';
const c = (rank, suit) => ({ rank, suit });

// STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE declares basisCreditsBetPerHand:5
// (its numbers are the real max-coin paytable divided by 5 credits - see
// its own module docstring), so every live-progressive request below uses
// creditsBetPerHand:5 to match it - a mismatched basis is deliberately
// demonstrated on its own further down. qualifyingCreditsBetPerHand is
// mandatory on every progressive object (no field is optional once a
// progressive is supplied at all). denominationEURPerCredit:0.2 keeps
// totalHandBetEUR at exactly 1 (0.2*5), so jackpotReturnMultiple ===
// jackpotEUR directly, keeping every EV figure below easy to verify by hand.
const ANY_SUIT_PROGRESSIVE_FIELDS = {
  denominationEURPerCredit: 0.2,
  creditsBetPerHand: 5,
  qualifyingCreditsBetPerHand: 5,
  triggerCategory: 'ROYAL_FLUSH',
  triggerSuitMode: TRIGGER_SUIT_MODE.ANY_SUIT,
};

const withPayouts = (overrides) => ({
  ...STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  payouts: { ...STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE.payouts, ...overrides },
});

// Demonstration A: same hand, same paytable except FLUSH payout, decision flips.
const paytableHand = [c(4, 0), c(7, 0), c(9, 0), c(13, 0), c(4, 1)]; // 4s,7s,9s,Ks + 4h
const lowFlushPaytable = withPayouts({ FLUSH: 1 });
const highFlushPaytable = withPayouts({ FLUSH: 10 });
const lowFlushResult = chooseOptimalHold({ hand: paytableHand, paytable: lowFlushPaytable });
const highFlushResult = chooseOptimalHold({ hand: paytableHand, paytable: highFlushPaytable });

// Demonstration B: same hand, same base paytable, only the live progressive
// jackpot amount changes, decision flips. Every progressive field is
// explicit - no silent defaults for triggerCategory/triggerSuitMode/payoutMode.
const jackpotHand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(9, 1)]; // made straight, also 4-to-royal
const lowJackpotResult = chooseOptimalHold({
  hand: jackpotHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 50, payoutMode: 'REPLACE', ...ANY_SUIT_PROGRESSIVE_FIELDS },
});
const highJackpotResult = chooseOptimalHold({
  hand: jackpotHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 1000, payoutMode: 'REPLACE', ...ANY_SUIT_PROGRESSIVE_FIELDS },
});

// Demonstration C: same hand, same base paytable, same jackpot amount -
// only payoutMode changes (REPLACE vs ADD_TO_BASE), and the exact EV
// differs by precisely the base paytable's fixed royal payout.
const royalHand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)]; // made royal flush
const replaceResult = chooseOptimalHold({
  hand: royalHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 5000, payoutMode: 'REPLACE', ...ANY_SUIT_PROGRESSIVE_FIELDS },
});
const addToBaseResult = chooseOptimalHold({
  hand: royalHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 5000, payoutMode: 'ADD_TO_BASE', ...ANY_SUIT_PROGRESSIVE_FIELDS },
});

// Demonstration D: a caller who SUPPLIES a progressive object that fails
// validation must get back an explicit blocked/invalid result, never a
// plausible-looking exact:true answer computed silently without the
// jackpot. This is categorically different from not supplying a
// progressive at all (which legitimately produces a normal base-game exact
// result).
const noProgressiveResult = chooseOptimalHold({ hand: royalHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
const invalidProgressiveResult = chooseOptimalHold({
  hand: royalHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 5000, denominationEURPerCredit: 0.2, creditsBetPerHand: 5 }, // missing qualifyingCreditsBetPerHand/payoutMode/triggerCategory/triggerSuitMode
});

// Demonstration E: the max-coin cross-check this guard exists for. The
// SAME 5-credit-basis paytable applied to a live progressive bet of only 1
// credit must BLOCK - a 1-credit bet does not pay the 5-credit max-coin
// Royal bonus rate, so silently computing an "exact" EV against it would be
// exactly the fabricated-looking-but-wrong math this project's evidence
// discipline forbids. The same paytable at creditsBetPerHand:5 (matching
// its declared basis) remains valid.
const basisMismatchResult = chooseOptimalHold({
  hand: royalHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 4000, payoutMode: 'REPLACE', ...ANY_SUIT_PROGRESSIVE_FIELDS, creditsBetPerHand: 1, denominationEURPerCredit: 1, qualifyingCreditsBetPerHand: 1 },
});
const basisMatchedResult = chooseOptimalHold({
  hand: royalHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 4000, payoutMode: 'REPLACE', ...ANY_SUIT_PROGRESSIVE_FIELDS },
});
const missingBasisResult = chooseOptimalHold({
  hand: royalHand,
  paytable: (() => { const { basisCreditsBetPerHand: _omitted, ...noBasis } = STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE; return noBasis; })(),
});

// Fail-closed rejections at the resolveProgressiveConfig level.
const unknownPayoutModeRejection = resolveProgressiveConfig({ jackpotEUR: 5000, payoutMode: 'DOUBLE_IT', ...ANY_SUIT_PROGRESSIVE_FIELDS });
const missingTriggerCategoryRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 0.2, creditsBetPerHand: 5, qualifyingCreditsBetPerHand: 5, payoutMode: 'REPLACE', triggerSuitMode: TRIGGER_SUIT_MODE.ANY_SUIT });
const missingTriggerSuitModeRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 0.2, creditsBetPerHand: 5, qualifyingCreditsBetPerHand: 5, payoutMode: 'REPLACE', triggerCategory: 'ROYAL_FLUSH' });
const specificSuitModeMissingSuitRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 0.2, creditsBetPerHand: 5, qualifyingCreditsBetPerHand: 5, payoutMode: 'REPLACE', triggerCategory: 'ROYAL_FLUSH', triggerSuitMode: TRIGGER_SUIT_MODE.SPECIFIC_SUIT });
const unsupportedTriggerSuitCategoryRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 0.2, creditsBetPerHand: 5, qualifyingCreditsBetPerHand: 5, payoutMode: 'REPLACE', triggerCategory: 'FOUR_OF_A_KIND', triggerSuitMode: TRIGGER_SUIT_MODE.SPECIFIC_SUIT, triggerSuit: 0 });
const anySuitModeValid = resolveProgressiveConfig({ jackpotEUR: 5000, payoutMode: 'REPLACE', ...ANY_SUIT_PROGRESSIVE_FIELDS });
const specificSuitModeValid = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 0.2, creditsBetPerHand: 5, qualifyingCreditsBetPerHand: 5, payoutMode: 'REPLACE', triggerCategory: 'ROYAL_FLUSH', triggerSuitMode: TRIGGER_SUIT_MODE.SPECIFIC_SUIT, triggerSuit: 2 });

// qualifyingCreditsBetPerHand is mandatory - missing/null/zero/negative/
// decimal/string must all fail closed with the same specific reason.
const qualifyingMissingRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 0.2, creditsBetPerHand: 5, payoutMode: 'REPLACE', triggerCategory: 'ROYAL_FLUSH', triggerSuitMode: TRIGGER_SUIT_MODE.ANY_SUIT });
const qualifyingStringRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 0.2, creditsBetPerHand: 5, qualifyingCreditsBetPerHand: '5', payoutMode: 'REPLACE', triggerCategory: 'ROYAL_FLUSH', triggerSuitMode: TRIGGER_SUIT_MODE.ANY_SUIT });

// No numeric coercion: a string amount must fail exactly like a missing one.
const jackpotStringRejection = resolveProgressiveConfig({ jackpotEUR: '5000', payoutMode: 'REPLACE', ...ANY_SUIT_PROGRESSIVE_FIELDS });
const creditsBetStringRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 0.2, creditsBetPerHand: '5', qualifyingCreditsBetPerHand: 5, payoutMode: 'REPLACE', triggerCategory: 'ROYAL_FLUSH', triggerSuitMode: TRIGGER_SUIT_MODE.ANY_SUIT });

// Hand/paytable input validation: an impossible hand or a corrupt/incomplete
// paytable must return the blocked shape, never a bogus exact result.
const duplicateCardResult = chooseOptimalHold({ hand: [c(10, 0), c(10, 0), c(12, 0), c(13, 0), c(14, 0)], paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
const invalidRankResult = chooseOptimalHold({ hand: [c(15, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)], paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
const decimalRankResult = chooseOptimalHold({ hand: [c(10.5, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)], paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
const invalidSuitResult = chooseOptimalHold({ hand: [c(10, 4), c(11, 0), c(12, 0), c(13, 0), c(14, 0)], paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
const negativePaytableResult = chooseOptimalHold({ hand: royalHand, paytable: withPayouts({ FLUSH: -1 }) });
const incompletePaytableResult = chooseOptimalHold({
  hand: royalHand,
  paytable: (() => {
    const { FLUSH: _omitted, ...incompletePayouts } = STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE.payouts;
    return { ...STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE, payouts: incompletePayouts };
  })(),
});

const paytableDemonstratesDifference = JSON.stringify([...lowFlushResult.heldIndices].sort()) !== JSON.stringify([...highFlushResult.heldIndices].sort());
const jackpotDemonstratesDifference = JSON.stringify([...lowJackpotResult.heldIndices].sort()) !== JSON.stringify([...highJackpotResult.heldIndices].sort());
const payoutModeDemonstratesDifference = addToBaseResult.evReturnMultiple - replaceResult.evReturnMultiple === STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE.payouts.royalFlushReturnMultiple;
const blockedVsNoProgressiveDistinguished = noProgressiveResult.exact === true && noProgressiveResult.blocked === false
  && invalidProgressiveResult.exact === false && invalidProgressiveResult.blocked === true && invalidProgressiveResult.configurationValid === false
  && invalidProgressiveResult.heldIndices === null;
const basisGuardCorrect = basisMismatchResult.blocked === true && basisMismatchResult.blockReason === 'PAYTABLE_BET_BASIS_MISMATCH'
  && basisMatchedResult.blocked === false && basisMatchedResult.paytableBasisCreditsBetPerHand === 5
  && missingBasisResult.blocked === true && missingBasisResult.blockReason === 'PAYTABLE_BET_BASIS_UNKNOWN';
const progressiveRejectionsCorrect = unknownPayoutModeRejection.blockReason === 'PAYOUT_MODE_MISSING_OR_UNKNOWN'
  && missingTriggerCategoryRejection.blockReason === 'TRIGGER_CATEGORY_MISSING_OR_UNKNOWN'
  && missingTriggerSuitModeRejection.blockReason === 'TRIGGER_SUIT_MODE_MISSING_OR_UNKNOWN'
  && specificSuitModeMissingSuitRejection.blockReason === 'TRIGGER_SUIT_MISSING_FOR_SPECIFIC_SUIT_MODE'
  && unsupportedTriggerSuitCategoryRejection.blockReason === 'UNSUPPORTED_TRIGGER_SUIT_CATEGORY'
  && anySuitModeValid.configurationValid === true && specificSuitModeValid.configurationValid === true
  && qualifyingMissingRejection.blockReason === 'QUALIFYING_CREDITS_BET_MISSING_OR_INVALID'
  && qualifyingStringRejection.blockReason === 'QUALIFYING_CREDITS_BET_MISSING_OR_INVALID'
  && jackpotStringRejection.blockReason === 'INVALID_PROGRESSIVE_PARAMETERS'
  && creditsBetStringRejection.blockReason === 'INVALID_PROGRESSIVE_PARAMETERS';
const handAndPaytableRejectionsCorrect = duplicateCardResult.blockReason === 'HAND_DUPLICATE_CARD'
  && invalidRankResult.blockReason === 'HAND_INVALID_CARD'
  && decimalRankResult.blockReason === 'HAND_INVALID_CARD'
  && invalidSuitResult.blockReason === 'HAND_INVALID_CARD'
  && negativePaytableResult.blockReason === 'PAYTABLE_INVALID_VALUE'
  && incompletePaytableResult.blockReason === 'PAYTABLE_INCOMPLETE';

const out = {
  version: 'optimal-hold-engine-validation-v1',
  generatedAt: new Date().toISOString(),
  purpose: 'Real, persisted proof that chooseOptimalHold() is genuinely paytable- and progressive-parametric, fails closed on an invalid live-progressive request or a mismatched credits-bet basis rather than silently downgrading, and rejects physically-impossible hand/incomplete-or-corrupt paytable inputs - all via a structured return value, never a thrown exception.',
  demonstrationA_differentPaytables: {
    hand: paytableHand,
    lowFlushPaytable: { FLUSH: lowFlushPaytable.payouts.FLUSH },
    highFlushPaytable: { FLUSH: highFlushPaytable.payouts.FLUSH },
    lowFlushHeldIndices: lowFlushResult.heldIndices,
    highFlushHeldIndices: highFlushResult.heldIndices,
    decisionDiffers: paytableDemonstratesDifference,
  },
  demonstrationB_differentJackpotAmounts: {
    hand: jackpotHand,
    lowJackpotEUR: 50,
    highJackpotEUR: 1000,
    lowJackpotHeldIndices: lowJackpotResult.heldIndices,
    highJackpotHeldIndices: highJackpotResult.heldIndices,
    lowJackpotEvReturnMultiple: lowJackpotResult.evReturnMultiple,
    highJackpotEvReturnMultiple: highJackpotResult.evReturnMultiple,
    decisionDiffers: jackpotDemonstratesDifference,
  },
  demonstrationC_replaceVsAddToBase: {
    hand: royalHand,
    jackpotEUR: 5000,
    replaceEvReturnMultiple: replaceResult.evReturnMultiple,
    addToBaseEvReturnMultiple: addToBaseResult.evReturnMultiple,
    fixedRoyalReturnMultiple: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE.payouts.royalFlushReturnMultiple,
    differenceMatchesFixedRoyalPayout: payoutModeDemonstratesDifference,
  },
  demonstrationD_blockedVsNoProgressive: {
    noProgressiveResult: { exact: noProgressiveResult.exact, blocked: noProgressiveResult.blocked, heldIndices: noProgressiveResult.heldIndices },
    invalidProgressiveResult: { exact: invalidProgressiveResult.exact, blocked: invalidProgressiveResult.blocked, configurationValid: invalidProgressiveResult.configurationValid, heldIndices: invalidProgressiveResult.heldIndices, blockReason: invalidProgressiveResult.blockReason },
    correctlyDistinguished: blockedVsNoProgressiveDistinguished,
  },
  demonstrationE_paytableBetBasisGuard: {
    hand: royalHand,
    paytableBasisCreditsBetPerHand: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE.basisCreditsBetPerHand,
    mismatchedResult: { creditsBetPerHand: 1, blocked: basisMismatchResult.blocked, blockReason: basisMismatchResult.blockReason },
    matchedResult: { creditsBetPerHand: 5, blocked: basisMatchedResult.blocked, paytableBasisCreditsBetPerHand: basisMatchedResult.paytableBasisCreditsBetPerHand },
    missingBasisResult: { blocked: missingBasisResult.blocked, blockReason: missingBasisResult.blockReason },
    guardCorrect: basisGuardCorrect,
  },
  failClosedRejections: {
    progressive: {
      unknownPayoutMode: unknownPayoutModeRejection.blockReason,
      missingTriggerCategory: missingTriggerCategoryRejection.blockReason,
      missingTriggerSuitMode: missingTriggerSuitModeRejection.blockReason,
      specificSuitModeMissingSuit: specificSuitModeMissingSuitRejection.blockReason,
      unsupportedTriggerSuitCategory: unsupportedTriggerSuitCategoryRejection.blockReason,
      anySuitModeValid: anySuitModeValid.configurationValid,
      specificSuitModeValid: specificSuitModeValid.configurationValid,
      qualifyingMissing: qualifyingMissingRejection.blockReason,
      qualifyingString: qualifyingStringRejection.blockReason,
      jackpotString: jackpotStringRejection.blockReason,
      creditsBetString: creditsBetStringRejection.blockReason,
    },
    handAndPaytable: {
      duplicateCard: duplicateCardResult.blockReason,
      invalidRank: invalidRankResult.blockReason,
      decimalRank: decimalRankResult.blockReason,
      invalidSuit: invalidSuitResult.blockReason,
      negativePaytableValue: negativePaytableResult.blockReason,
      incompletePaytable: incompletePaytableResult.blockReason,
    },
    allRejectedCorrectly: progressiveRejectionsCorrect && handAndPaytableRejectionsCorrect,
  },
  decision: {
    exactPerHandOptimizerValidated: paytableDemonstratesDifference && jackpotDemonstratesDifference && payoutModeDemonstratesDifference
      && blockedVsNoProgressiveDistinguished && basisGuardCorrect && progressiveRejectionsCorrect && handAndPaytableRejectionsCorrect,
    scope: 'This validates the ENGINE responds correctly to changing inputs on individual example hands via exact enumeration, and fails closed on invalid requests (including a mismatched or unknown credits-bet basis). It does NOT establish a global exact RTP, does NOT verify any Spain-specific paytable, and does NOT authorize real money.',
    globalExactRtpValidated: false,
    spainPaytableVerified: false,
    realMoneyAllowed: false,
  },
  guards: {
    zeroNetwork: true,
    deterministic: true,
    economicPromotionAllowed: false,
    realMoneyAllowed: false,
  },
};
fs.mkdirSync('loterias-ai/casino/video-poker/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out.decision, null, 2));
