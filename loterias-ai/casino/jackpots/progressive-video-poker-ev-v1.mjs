// Conservative EV engine for progressive video poker.
//
// This engine intentionally evaluates a FIXED, fully specified strategy. That
// makes the progressive adjustment exact for that strategy: if the fixed
// strategy itself clears 100% RTP, then a +EV playable strategy exists even if
// the mathematically optimal strategy at the higher jackpot would differ.
//
// Multi-hand accounting is per hand. If a 10-hand game requires 5 qualifying
// coins on each hand, the total wager is 50 coins, not 5. Expected jackpot
// wins and wager both scale with handsPerSpin, so there is no free x10 RTP
// multiplier from choosing ten hands.

export function progressiveVideoPokerEv({
  baseRtpAtSeedForFixedStrategy, // RTP fraction at seed/reset using the SAME fixed strategy as pRoyalFlushForFixedStrategy
  pRoyalFlushForFixedStrategy, // per-hand royal probability under that exact fixed strategy/paytable
  seedJackpotCoinsPerWinningHand,
  currentJackpotCoinsPerWinningHand,
  qualifyingCoinsBetPerHand, // exact per-hand wager required to receive the full progressive award
  handsPerSpin = 1,
  strategyInputsVerified = false,
}) {
  const required = [
    baseRtpAtSeedForFixedStrategy,
    pRoyalFlushForFixedStrategy,
    seedJackpotCoinsPerWinningHand,
    currentJackpotCoinsPerWinningHand,
    qualifyingCoinsBetPerHand,
    handsPerSpin,
  ];
  if (!required.every(Number.isFinite)) return { blocked: true, reason: 'MISSING_REQUIRED_NUMERIC_INPUT' };
  if (strategyInputsVerified !== true) return { blocked: true, reason: 'STRATEGY_INPUTS_NOT_VERIFIED' };
  if (baseRtpAtSeedForFixedStrategy < 0 || pRoyalFlushForFixedStrategy <= 0 || pRoyalFlushForFixedStrategy >= 1) {
    return { blocked: true, reason: 'INVALID_STRATEGY_INPUT' };
  }
  if (
    qualifyingCoinsBetPerHand <= 0 ||
    currentJackpotCoinsPerWinningHand < seedJackpotCoinsPerWinningHand ||
    !Number.isInteger(handsPerSpin) ||
    handsPerSpin < 1
  ) {
    return { blocked: true, reason: 'INVALID_REQUIRED_NUMERIC_INPUT' };
  }

  const jackpotDeltaCoinsPerWinningHand = currentJackpotCoinsPerWinningHand - seedJackpotCoinsPerWinningHand;
  const totalCoinsBet = qualifyingCoinsBetPerHand * handsPerSpin;
  const expectedExtraJackpotCoinsPerSpin =
    handsPerSpin * pRoyalFlushForFixedStrategy * jackpotDeltaCoinsPerWinningHand;

  // Linearity of expectation is enough here; hand outcomes need not be
  // independent for the expected number of royal-flush awards to scale with
  // handsPerSpin.
  const jackpotEvBoost = expectedExtraJackpotCoinsPerSpin / totalCoinsBet;
  const totalRtp = baseRtpAtSeedForFixedStrategy + jackpotEvBoost;
  const breakEvenJackpotCoinsPerWinningHand =
    seedJackpotCoinsPerWinningHand +
    ((1 - baseRtpAtSeedForFixedStrategy) * qualifyingCoinsBetPerHand) /
      pRoyalFlushForFixedStrategy;

  return {
    blocked: false,
    model: 'FIXED_STRATEGY_PROGRESSIVE_LINEAR_DELTA',
    fixedStrategyConservativeForExecution: true,
    jackpotDeltaCoinsPerWinningHand,
    totalCoinsBet,
    expectedExtraJackpotCoinsPerSpin: +expectedExtraJackpotCoinsPerSpin.toFixed(9),
    jackpotEvBoost: +jackpotEvBoost.toFixed(9),
    totalRtp: +totalRtp.toFixed(9),
    totalRtpPct: +(totalRtp * 100).toFixed(6),
    breakEvenJackpotCoinsPerWinningHand,
    currentDistanceToBreakEvenCoins:
      breakEvenJackpotCoinsPerWinningHand - currentJackpotCoinsPerWinningHand,
    verdict: totalRtp >= 1 ? 'CANDIDATE_PLAY' : 'NO_PLAY',
  };
}

// Every entry here remains fail-closed until the exact Spanish configuration
// is recovered. A published RTP range or familiar-looking 99.54% figure is not
// enough to populate the fixed-strategy inputs above.
export const BOTEMANIA_VIDEO_POKER_TITLES = [
  {
    slug: 'classic-video-poker',
    url: 'https://www.botemania.es/juegos/casino-online/classic-video-poker',
    publishedRtpRangePct: [96.77, 99.26],
    exactPaytableRecovered: false,
    pRoyalFlushForFixedStrategy: null,
    hasVisibleProgressiveJackpot: null,
  },
  {
    slug: 'poker-3-opciones',
    url: 'https://www.botemania.es/juegos/casino-online/poker-3-opciones',
    publishedRtpRangePct: [97.99, 98.48],
    exactPaytableRecovered: true,
    pRoyalFlushForFixedStrategy: null,
    hasVisibleProgressiveJackpot: false,
    note: 'Captured hand-pay ladder does not match standard Jacks-or-Better draw-poker categories; do not reuse draw-poker royal probabilities.',
  },
  {
    slug: 'ultimate-video-poker',
    url: 'https://www.botemania.es/juegos/casino-online/ultimate-video-poker',
    publishedRtpRangePct: [96.77, 99.54],
    providerId: 'roxor-gaming', // confirmed via Botemania's public GraphQL contentfulGame query (paramHints), not inferred
    variantOfInterest: 'Jotas o Mejor Progresivo',
    monitorFeedRef: 'loterias-ai/edge-live/evidence/progressive-score-research-v1.json: generic:WAGER_BET, identity.confidence VERY_HIGH, evidenceClass MANUAL_SCREENSHOT_LIVE_AMOUNT_CROSS_MATCH (human-established, not script-reproducible yet)',
    manualScreenshotEvidence: {
      // Provided directly by the user via screenshot of the live game client.
      // Treated as MANUAL_SCREENSHOT_EVIDENCE per instruction - not re-requested,
      // but also not independently script-verified, so pRoyalFlushForFixedStrategy
      // stays null until a primary/reproducible source confirms it for this exact table.
      paytableCoinsPerCredit1: {
        jacksOrBetter: 1, twoPair: 2, threeOfAKind: 3, straight: 4, flush: 5,
        fullHouse: 7, fourOfAKind: 25, straightFlush: 50, royalFlush: 800,
      },
      paytableFamily: 'Matches the well-published "7/5 Jacks or Better" shape (800-50-25-7-5-4-3-2-1) - NOT full-pay 9/6. External 9/6 P(Royal Flush)~=1/40391 (WizardOfOdds, WebSearch) is documented for the DIFFERENT 9/6 table and must NOT be reused here without demonstrating equivalence (strategy shifts with a reduced flush/full-house pay).',
      observedHandsPerSpin: 10,
      observedBetPerHandEUR: 2.5,
      observedTotalBetEUR: 25,
      source: 'MANUAL_SCREENSHOT_EVIDENCE',
    },
    exactPaytableRecovered: true,
    pRoyalFlushForFixedStrategy: null, // still not independently sourced for THIS exact 7/5-shaped table - do not fabricate from the 9/6 figure
    hasVisibleProgressiveJackpot: true,
  },
  {
    slug: 'videopoker-remasterizado',
    url: 'https://www.botemania.es/juegos/casino-online/videopoker-remasterizado',
    publishedRtpRangePct: [99.54, 99.54],
    exactPaytableRecovered: false,
    pRoyalFlushForFixedStrategy: null,
    hasVisibleProgressiveJackpot: null,
    note: '99.54% resembles full-pay 9/6 Jacks or Better but remains an unverified hint for this exact Botemania game.',
  },
];
