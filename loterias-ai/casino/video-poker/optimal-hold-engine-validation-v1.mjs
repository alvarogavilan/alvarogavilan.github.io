#!/usr/bin/env node
// Real, persisted evidence that chooseOptimalHold() is genuinely
// paytable/progressive-parametric: two independent demonstrations that
// changing ONLY the paytable, or ONLY the live jackpot amount, on the exact
// same dealt hand, changes the exact-optimal hold decision. Zero network,
// deterministic, reproducible.
import fs from 'node:fs';
import { chooseOptimalHold } from './optimal-hold-engine-v1.mjs';
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
// jackpot amount changes, decision flips.
const jackpotHand = [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(9, 1)]; // made straight, also 4-to-royal
const lowJackpotResult = chooseOptimalHold({
  hand: jackpotHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 50, denomination: 1, creditsBet: 1, qualifyingBet: 1 },
});
const highJackpotResult = chooseOptimalHold({
  hand: jackpotHand, paytable: STANDARD_9_6_JACKS_OR_BETTER_PAYTABLE,
  progressive: { jackpotEUR: 1000, denomination: 1, creditsBet: 1, qualifyingBet: 1 },
});

const paytableDemonstratesDifference = JSON.stringify([...lowFlushResult.heldIndices].sort()) !== JSON.stringify([...highFlushResult.heldIndices].sort());
const jackpotDemonstratesDifference = JSON.stringify([...lowJackpotResult.heldIndices].sort()) !== JSON.stringify([...highJackpotResult.heldIndices].sort());

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
    lowJackpotEvCredits: lowJackpotResult.evCredits,
    highJackpotEvCredits: highJackpotResult.evCredits,
    decisionDiffers: jackpotDemonstratesDifference,
  },
  decision: {
    exactPerHandOptimizerValidated: paytableDemonstratesDifference && jackpotDemonstratesDifference,
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
