#!/usr/bin/env node
// Real, persisted evidence that chooseOptimalHold() is genuinely
// paytable/progressive-parametric: three independent demonstrations that
// changing ONLY the paytable, ONLY the live jackpot amount, or ONLY the
// payoutMode, on the exact same dealt hand/config, changes the result. Zero
// network, deterministic, reproducible.
import fs from 'node:fs';
import { chooseOptimalHold, resolveProgressiveConfig } from './optimal-hold-engine-v1.mjs';
import { STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE } from './jacks-or-better-strategy-v1.mjs';

const OUT = 'loterias-ai/casino/video-poker/evidence/optimal-hold-engine-validation-v1.json';
const c = (rank, suit) => ({ rank, suit });

// Demonstration A: same hand, same paytable except FLUSH payout, decision flips.
const paytableHand = [c(4, 0), c(7, 0), c(9, 0), c(13, 0), c(4, 1)]; // 4s,7s,9s,Ks + 4h
const lowFlushPaytable = { ...STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE, FLUSH: 1 };
const highFlushPaytable = { ...STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE, FLUSH: 10 };
const lowFlushResult = chooseOptimalHold({ hand: paytableHand, paytable: lowFlushPaytable });
const highFlushResult = chooseOptimalHold({ hand: paytableHand, paytable: highFlushPaytable });

// Demonstration B: same hand, same base paytable, only the live progressive
// jackpot amount changes, decision flips. payoutMode must be explicit -
// there is no silent default.
const jackpotHand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(9, 1)]; // made straight, also 4-to-royal
const lowJackpotResult = chooseOptimalHold({
  hand: jackpotHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 50, denomination: 1, creditsBet: 1, qualifyingBet: 1, payoutMode: 'REPLACE' },
});
const highJackpotResult = chooseOptimalHold({
  hand: jackpotHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 1000, denomination: 1, creditsBet: 1, qualifyingBet: 1, payoutMode: 'REPLACE' },
});

// Demonstration C: same hand, same base paytable, same jackpot amount -
// only payoutMode changes (REPLACE vs ADD_TO_BASE), and the exact EV
// differs by precisely the base paytable's fixed royal payout, which is
// exactly the mathematically-correct difference between the two modes
// (ADD_TO_BASE = REPLACE's payout plus the ordinary fixed payout the
// REPLACE mode discards).
const royalHand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(14, 0)]; // made royal flush
const replaceResult = chooseOptimalHold({
  hand: royalHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 5000, denomination: 1, creditsBet: 1, qualifyingBet: 1, payoutMode: 'REPLACE' },
});
const addToBaseResult = chooseOptimalHold({
  hand: royalHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 5000, denomination: 1, creditsBet: 1, qualifyingBet: 1, payoutMode: 'ADD_TO_BASE' },
});

// Fail-closed rejections: an unknown payoutMode, and a triggerSuit combined
// with a category that has no suit-check behind it, must both be rejected
// rather than silently misapplied.
const unknownPayoutModeRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denomination: 1, creditsBet: 1, payoutMode: 'DOUBLE_IT' });
const unsupportedTriggerSuitRejection = resolveProgressiveConfig({ jackpotEUR: 5000, denomination: 1, creditsBet: 1, payoutMode: 'REPLACE', triggerCategory: 'FOUR_OF_A_KIND', triggerSuit: 0 });

const paytableDemonstratesDifference = JSON.stringify([...lowFlushResult.heldIndices].sort()) !== JSON.stringify([...highFlushResult.heldIndices].sort());
const jackpotDemonstratesDifference = JSON.stringify([...lowJackpotResult.heldIndices].sort()) !== JSON.stringify([...highJackpotResult.heldIndices].sort());
const payoutModeDemonstratesDifference = addToBaseResult.evReturnMultiple - replaceResult.evReturnMultiple === STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE.royalFlushReturnMultiple;
const failClosedWorks = unknownPayoutModeRejection.applied === false && unknownPayoutModeRejection.reason === 'PAYOUT_MODE_MISSING_OR_UNKNOWN'
  && unsupportedTriggerSuitRejection.applied === false && unsupportedTriggerSuitRejection.reason === 'UNSUPPORTED_TRIGGER_SUIT_CATEGORY';

const out = {
  version: 'optimal-hold-engine-validation-v1',
  generatedAt: new Date().toISOString(),
  purpose: 'Real, persisted proof that chooseOptimalHold() is genuinely paytable- and progressive-parametric, not a fixed heuristic - required before any claim that this engine could safely determine strategy for an actual live progressive.',
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
  failClosedRejections: {
    unknownPayoutMode: unknownPayoutModeRejection,
    unsupportedTriggerSuitCategory: unsupportedTriggerSuitRejection,
    bothRejectedCorrectly: failClosedWorks,
  },
  decision: {
    exactPerHandOptimizerValidated: paytableDemonstratesDifference && jackpotDemonstratesDifference && payoutModeDemonstratesDifference && failClosedWorks,
    scope: 'This validates the ENGINE responds correctly to changing inputs on individual example hands via exact enumeration. It does NOT establish a global exact RTP, does NOT verify any Spain-specific paytable, and does NOT authorize real money.',
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
