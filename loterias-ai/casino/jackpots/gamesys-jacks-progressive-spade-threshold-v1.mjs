// Research-only comparator for the historical Gamesys Jacks or Better Progressive
// lineage that current Botemania Ultimate Video Poker appears to descend from.
//
// IMPORTANT: this is NOT a Spain execution model. It deliberately refuses to
// promote a threshold until the current Botemania/Roxor configuration proves
// equivalence (trigger suit, qualifying stake, denomination, reset and paytable).
//
// External lineage evidence:
// - WorldCasinoDirectory: Gamesys Jacks or Better Progressive pays the network
//   progressive only for a Royal Flush in Spades; Royals in Hearts/Diamonds/
//   Clubs remain 800x. Historical min bet reported as GBP 2.50 per hand.
// - Wizard of Odds 7/5 Jacks or Better: paytable 1/2/3/4/5/7/25/50/800,
//   optimal-strategy RTP 0.961472 and Royal probability from exact combinations.
//
// The Botemania repository separately preserves a historical screenshot with
// the same 7/5-shaped 1/2/3/4/5/7/25/50/800 ladder, 10 hands and EUR 2.50 per
// hand. Shape/lineage agreement is evidence, not configuration equivalence.

export const GAMESYS_JACKS_PROGRESSIVE_LINEAGE = Object.freeze({
  sourceGame: 'Jacks or Better Progressive by Gamesys',
  progressiveTrigger: 'ROYAL_FLUSH_SPADES_ONLY',
  nonProgressiveRoyalPayMultiple: 800,
  historicalReportedMinBetPerHandGBP: 2.5,
  sevenFive: {
    rtp: 0.961472,
    royalCombinations: 496195464,
    totalCombinations: 19933230517200,
    paytable: [1, 2, 3, 4, 5, 7, 25, 50, 800],
  },
  currentBotemaniaConfigurationEquivalent: false,
  realMoneyAllowed: false,
});

export function fixedStrategySpadeRoyalThreshold({
  baseRtp = GAMESYS_JACKS_PROGRESSIVE_LINEAGE.sevenFive.rtp,
  royalProbability = GAMESYS_JACKS_PROGRESSIVE_LINEAGE.sevenFive.royalCombinations /
    GAMESYS_JACKS_PROGRESSIVE_LINEAGE.sevenFive.totalCombinations,
  ordinaryRoyalMultiple = GAMESYS_JACKS_PROGRESSIVE_LINEAGE.nonProgressiveRoyalPayMultiple,
  qualifyingBetPerHandEUR,
  currentJackpotEUR = null,
  spadeShareOfRoyals = 0.25,
  exactSpainConfigurationEquivalent = false,
} = {}) {
  const nums = [baseRtp, royalProbability, ordinaryRoyalMultiple, qualifyingBetPerHandEUR, spadeShareOfRoyals];
  if (!nums.every(Number.isFinite)) return { blocked: true, reason: 'MISSING_REQUIRED_NUMERIC_INPUT' };
  if (!(baseRtp > 0 && baseRtp < 1) || !(royalProbability > 0 && royalProbability < 1) ||
      !(ordinaryRoyalMultiple > 0) || !(qualifyingBetPerHandEUR > 0) ||
      !(spadeShareOfRoyals > 0 && spadeShareOfRoyals <= 1)) {
    return { blocked: true, reason: 'INVALID_NUMERIC_INPUT' };
  }

  const pProgressiveTriggerPerHand = royalProbability * spadeShareOfRoyals;
  // baseRtp already includes the ordinary 800x Royal contribution. Replacing
  // the Spade Royal's ordinary 800x award by a progressive J adds only the
  // delta (J/bet - 800), multiplied by the Spade-Royal probability.
  const breakEvenJackpotBetMultiples = ordinaryRoyalMultiple +
    (1 - baseRtp) / pProgressiveTriggerPerHand;
  const breakEvenJackpotEUR = breakEvenJackpotBetMultiples * qualifyingBetPerHandEUR;
  const currentJackpotBetMultiples = Number.isFinite(currentJackpotEUR)
    ? currentJackpotEUR / qualifyingBetPerHandEUR
    : null;
  const fixedStrategyRtpAtCurrent = Number.isFinite(currentJackpotBetMultiples)
    ? baseRtp + pProgressiveTriggerPerHand * (currentJackpotBetMultiples - ordinaryRoyalMultiple)
    : null;

  return {
    blocked: false,
    model: 'GAMESYS_LINEAGE_FIXED_7_5_SPADES_ONLY_COMPARATOR',
    evidenceClass: 'EXTERNAL_EXACT_PRODUCT_LINEAGE_PLUS_BOTEMANIA_HISTORICAL_SHAPE_MATCH',
    pRoyalPerHand: royalProbability,
    pProgressiveTriggerPerHand,
    breakEvenJackpotBetMultiples,
    breakEvenJackpotEUR,
    currentJackpotEUR: Number.isFinite(currentJackpotEUR) ? currentJackpotEUR : null,
    currentJackpotBetMultiples,
    fixedStrategyRtpAtCurrent,
    fixedStrategyRtpPctAtCurrent: Number.isFinite(fixedStrategyRtpAtCurrent)
      ? fixedStrategyRtpAtCurrent * 100
      : null,
    lineageComparatorVerdict: Number.isFinite(fixedStrategyRtpAtCurrent)
      ? (fixedStrategyRtpAtCurrent >= 1 ? 'LINEAGE_COMPARATOR_ABOVE_100' : 'LINEAGE_COMPARATOR_BELOW_100')
      : 'CURRENT_JACKPOT_NOT_SUPPLIED',
    execution: {
      exactSpainConfigurationEquivalent,
      thresholdVerifiedForSpain: false,
      qualifyingStakeVerifiedForSpain: false,
      strategyVerifiedForSpain: false,
      rulesFingerprintVerifiedForSpain: false,
      prospectiveValidationPassed: false,
      realMoneyAllowed: false,
      executable: false,
    },
    guards: {
      doNotImportGBPStakeToSpain: true,
      doNotAssumeSpadesTriggerInCurrentBotemaniaWithoutFingerprint: true,
      doNotTreatHistoricalScreenshotAsCurrentConfig: true,
      externalLineageThresholdIsNotSpanishThreshold: true,
    },
  };
}

export const HISTORICAL_BOTEMANIA_SCREEN_COMPARATOR = fixedStrategySpadeRoyalThreshold({
  qualifyingBetPerHandEUR: 2.5,
  currentJackpotEUR: 3448.25,
  exactSpainConfigurationEquivalent: false,
});
