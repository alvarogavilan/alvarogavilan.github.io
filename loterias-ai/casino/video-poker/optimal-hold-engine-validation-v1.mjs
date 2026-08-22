#!/usr/bin/env node
// Real, persisted evidence that chooseOptimalHold() is genuinely
// paytable/progressive-parametric AND fails closed correctly - on an
// invalid live-progressive request, an incomplete/corrupt paytable, and a
// physically-impossible hand - rather than silently downgrading to a
// plausible-looking base-game "exact" answer. Zero network, deterministic,
// reproducible.
import fs from 'node:fs';
import { chooseOptimalHold, resolveProgressiveConfig, TRIGGER_SUIT_MODE } from './optimal-hold-engine-v1.mjs';
import { STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE } from './jacks-or-better-strategy-v1.mjs';

const OUT = 'loterias-ai/casino/video-poker/evidence/optimal-hold-engine-validation-v1.json';
const c = (rank, suit) => ({ rank, suit });
const ANY_SUIT_PROGRESSIVE_FIELDS = { triggerCategory: 'ROYAL_FLUSH', triggerSuitMode: TRIGGER_SUIT_MODE.ANY_SUIT };

// Demonstration A: same hand, same paytable except FLUSH payout, decision flips.
const paytableHand = [c(4, 0), c(7, 0), c(9, 0), c(13, 0), c(4, 1)]; // 4s,7s,9s,Ks + 4h
const lowFlushPaytable = { ...STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE, FLUSH: 1 };
const highFlushPaytable = { ...STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE, FLUSH: 10 };
const lowFlushResult = chooseOptimalHold({ hand: paytableHand, paytable: lowFlushPaytable });
const highFlushResult = chooseOptimalHold({ hand: paytableHand, paytable: highFlushPaytable });

// Demonstration B: same hand, same base paytable, only the live progressive
// jackpot amount changes, decision flips. Every progressive field is
// explicit - no silent defaults for triggerCategory/triggerSuitMode/payoutMode.
const jackpotHand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(9, 1)]; // made straight, also 4-to-royal
const lowJackpotResult = chooseOptimalHold({
  hand: jackpotHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 50, denominationEURPerCredit: 1, creditsBetPerHand: 1, qualifyingCreditsBetPerHand: 1, payoutMode: 'REPLACE', ...ANY_SUIT_PROGRESSIVE_FIELDS },
});
const highJackpotResult = chooseOptimalHold({
  hand: jackpotHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 1000, denominationEURPerCredit: 1, creditsBetPerHand: 1, qualifyingCreditsBetPerHand: 1, payoutMode: 'REPLACE', ...ANY_SUIT_PROGRESSIVE_FIELDS },
});

// Demonstration C: same hand, same base paytable, same jackpot amount -
// only payoutMode changes (REPLACE vs ADD_TO_BASE), and the exact EV
// differs by precisely the base paytable's fixed royal payout.
const royalHand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)]; // made royal flush
const replaceResult = chooseOptimalHold({
  hand: royalHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 5000, denominationEURPerCredit: 1, creditsBetPerHand: 1, qualifyingCreditsBetPerHand: 1, payoutMode: 'REPLACE', ...ANY_SUIT_PROGRESSIVE_FIELDS },
});
const addToBaseResult = chooseOptimalHold({
  hand: royalHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 5000, denominationEURPerCredit: 1, creditsBetPerHand: 1, qualifyingCreditsBetPerHand: 1, payoutMode: 'ADD_TO_BASE', ...ANY_SUIT_PROGRESSIVE_FIELDS },
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
  progressive: { jackpotEUR: 5000, denominationEURPerCredit: 1, creditsBetPerHand: 1 }, // missing payoutMode/triggerCategory/triggerSuitMode
});

// Fail-closed rejections at the resolveProgressiveConfig level.
const unknownPayoutModeRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 1, creditsBetPerHand: 1, payoutMode: 'DOUBLE_IT', ...ANY_SUIT_PROGRESSIVE_FIELDS });
const missingTriggerCategoryRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 1, creditsBetPerHand: 1, payoutMode: 'REPLACE', triggerSuitMode: TRIGGER_SUIT_MODE.ANY_SUIT });
const missingTriggerSuitModeRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 1, creditsBetPerHand: 1, payoutMode: 'REPLACE', triggerCategory: 'ROYAL_FLUSH' });
const specificSuitModeMissingSuitRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 1, creditsBetPerHand: 1, payoutMode: 'REPLACE', triggerCategory: 'ROYAL_FLUSH', triggerSuitMode: TRIGGER_SUIT_MODE.SPECIFIC_SUIT });
const unsupportedTriggerSuitCategoryRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 1, creditsBetPerHand: 1, payoutMode: 'REPLACE', triggerCategory: 'FOUR_OF_A_KIND', triggerSuitMode: TRIGGER_SUIT_MODE.SPECIFIC_SUIT, triggerSuit: 0 });
const anySuitModeValid = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 1, creditsBetPerHand: 1, payoutMode: 'REPLACE', ...ANY_SUIT_PROGRESSIVE_FIELDS });
const specificSuitModeValid = resolveProgressiveConfig({ jackpotEUR: 5000, denominationEURPerCredit: 1, creditsBetPerHand: 1, payoutMode: 'REPLACE', triggerCategory: 'ROYAL_FLUSH', triggerSuitMode: TRIGGER_SUIT_MODE.SPECIFIC_SUIT, triggerSuit: 2 });

// Hand/paytable input validation: an impossible hand or a corrupt/incomplete
// paytable must return the blocked shape, never a bogus exact result.
const duplicateCardResult = chooseOptimalHold({ hand: [c(10, 0), c(10, 0), c(12, 0), c(13, 0), c(14, 0)], paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
const invalidRankResult = chooseOptimalHold({ hand: [c(15, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)], paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
const decimalRankResult = chooseOptimalHold({ hand: [c(10.5, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)], paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
const invalidSuitResult = chooseOptimalHold({ hand: [c(10, 4), c(11, 0), c(12, 0), c(13, 0), c(14, 0)], paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE });
const negativePaytableResult = chooseOptimalHold({ hand: royalHand, paytable: { ...STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE, FLUSH: -1 } });
const { FLUSH: _omitted, ...incompletePaytable } = STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE;
const incompletePaytableResult = chooseOptimalHold({ hand: royalHand, paytable: incompletePaytable });

const paytableDemonstratesDifference = JSON.stringify([...lowFlushResult.heldIndices].sort()) !== JSON.stringify([...highFlushResult.heldIndices].sort());
const jackpotDemonstratesDifference = JSON.stringify([...lowJackpotResult.heldIndices].sort()) !== JSON.stringify([...highJackpotResult.heldIndices].sort());
const payoutModeDemonstratesDifference = addToBaseResult.evReturnMultiple - replaceResult.evReturnMultiple === STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE.royalFlushReturnMultiple;
const blockedVsNoProgressiveDistinguished = noProgressiveResult.exact === true && noProgressiveResult.blocked === false
  && invalidProgressiveResult.exact === false && invalidProgressiveResult.blocked === true && invalidProgressiveResult.configurationValid === false
  && invalidProgressiveResult.heldIndices === null;
const progressiveRejectionsCorrect = unknownPayoutModeRejection.blockReason === 'PAYOUT_MODE_MISSING_OR_UNKNOWN'
  && missingTriggerCategoryRejection.blockReason === 'TRIGGER_CATEGORY_MISSING_OR_UNKNOWN'
  && missingTriggerSuitModeRejection.blockReason === 'TRIGGER_SUIT_MODE_MISSING_OR_UNKNOWN'
  && specificSuitModeMissingSuitRejection.blockReason === 'TRIGGER_SUIT_MISSING_FOR_SPECIFIC_SUIT_MODE'
  && unsupportedTriggerSuitCategoryRejection.blockReason === 'UNSUPPORTED_TRIGGER_SUIT_CATEGORY'
  && anySuitModeValid.configurationValid === true && specificSuitModeValid.configurationValid === true;
const handAndPaytableRejectionsCorrect = duplicateCardResult.blockReason === 'HAND_DUPLICATE_CARD'
  && invalidRankResult.blockReason === 'HAND_INVALID_CARD'
  && decimalRankResult.blockReason === 'HAND_INVALID_CARD'
  && invalidSuitResult.blockReason === 'HAND_INVALID_CARD'
  && negativePaytableResult.blockReason === 'PAYTABLE_INVALID_VALUE'
  && incompletePaytableResult.blockReason === 'PAYTABLE_INCOMPLETE';

const out = {
  version: 'optimal-hold-engine-validation-v1',
  generatedAt: new Date().toISOString(),
  purpose: 'Real, persisted proof that chooseOptimalHold() is genuinely paytable- and progressive-parametric, fails closed on an invalid live-progressive request rather than silently downgrading, and rejects physically-impossible hand/incomplete-or-corrupt paytable inputs - all via a structured return value, never a thrown exception.',
  demonstrationA_differentPaytables: {
    hand: paytableHand,
    lowFlushPaytable: { FLUSH: lowFlushPaytable.FLUSH },
    highFlushPaytable: { FLUSH: highFlushPaytable.FLUSH },
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
    fixedRoyalReturnMultiple: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE.royalFlushReturnMultiple,
    differenceMatchesFixedRoyalPayout: payoutModeDemonstratesDifference,
  },
  demonstrationD_blockedVsNoProgressive: {
    noProgressiveResult: { exact: noProgressiveResult.exact, blocked: noProgressiveResult.blocked, heldIndices: noProgressiveResult.heldIndices },
    invalidProgressiveResult: { exact: invalidProgressiveResult.exact, blocked: invalidProgressiveResult.blocked, configurationValid: invalidProgressiveResult.configurationValid, heldIndices: invalidProgressiveResult.heldIndices, blockReason: invalidProgressiveResult.blockReason },
    correctlyDistinguished: blockedVsNoProgressiveDistinguished,
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
      && blockedVsNoProgressiveDistinguished && progressiveRejectionsCorrect && handAndPaytableRejectionsCorrect,
    scope: 'This validates the ENGINE responds correctly to changing inputs on individual example hands via exact enumeration, and fails closed on invalid requests. It does NOT establish a global exact RTP, does NOT verify any Spain-specific paytable, and does NOT authorize real money.',
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
