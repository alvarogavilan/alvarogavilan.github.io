// EV engine for progressive video poker (Bob Dancer's mechanism family - see
// loterias-ai/universidad/advantage-play-case-studies-v1.json, PR #169).
// The engine is deliberately parametric: it does NOT hardcode any
// probability-of-royal-flush constant for any specific paytable, because
// optimal strategy (and therefore P(Royal Flush)) is paytable-dependent and
// this repo has not yet independently verified Botemania's exact paytable
// for any of its confirmed video-poker titles (Classic Video Poker, Poker 3
// Opciones, Ultimate Video Poker, Videopoker Remasterizado - see
// botemania-universe-current-v1.json). Every required input must be supplied
// explicitly and cited; the engine returns blocked:true rather than
// defaulting to a guessed value.

export function progressiveVideoPokerEv({
  baseRtpAtSeedJackpot, // total RTP (fraction, e.g. 0.9954) at the progressive's reset/seed value - this IS the game's normal advertised RTP
  pRoyalFlush, // P(royal flush) under optimal strategy for THIS exact paytable - required, no default
  seedJackpotCoins, // royal-flush payout in coins (at qualifying max bet) when the progressive is at reset
  currentJackpotCoins, // current displayed progressive value in coins, same units as seedJackpotCoins
  totalCoinsBet, // coins wagered on the hand that would qualify for the full jackpot (usually max-bet)
  handsPerSpin = 1, // multi-hand variants (e.g. 10-hand): each dealt hand independently has the same pRoyalFlush, but totalCoinsBet must already reflect the FULL wager across all hands if the jackpot requires betting on all of them
}) {
  const required = [baseRtpAtSeedJackpot, pRoyalFlush, seedJackpotCoins, currentJackpotCoins, totalCoinsBet, handsPerSpin];
  if (!required.every(Number.isFinite)) return { blocked: true, reason: 'MISSING_REQUIRED_NUMERIC_INPUT' };
  if (pRoyalFlush <= 0 || pRoyalFlush >= 1) return { blocked: true, reason: 'INVALID_P_ROYAL_FLUSH' };
  if (totalCoinsBet <= 0 || currentJackpotCoins < seedJackpotCoins || handsPerSpin < 1) return { blocked: true, reason: 'INVALID_REQUIRED_NUMERIC_INPUT' };

  const jackpotDeltaCoins = currentJackpotCoins - seedJackpotCoins;
  // Each of the handsPerSpin hands independently has probability pRoyalFlush
  // of landing the royal; the extra EV therefore scales with handsPerSpin,
  // NOT with a single-hand assumption - do not silently assume handsPerSpin=1.
  const jackpotEvBoost = handsPerSpin * pRoyalFlush * (jackpotDeltaCoins / totalCoinsBet);
  const totalRtp = baseRtpAtSeedJackpot + jackpotEvBoost;

  return {
    blocked: false,
    jackpotDeltaCoins,
    jackpotEvBoost: +jackpotEvBoost.toFixed(9),
    totalRtp: +totalRtp.toFixed(9),
    totalRtpPct: +(totalRtp * 100).toFixed(6),
    breakEvenJackpotCoins: seedJackpotCoins + ((1 - baseRtpAtSeedJackpot) * totalCoinsBet) / (handsPerSpin * pRoyalFlush),
    currentDistanceToBreakEvenCoins:
      seedJackpotCoins + ((1 - baseRtpAtSeedJackpot) * totalCoinsBet) / (handsPerSpin * pRoyalFlush) - currentJackpotCoins,
    verdict: totalRtp >= 1 ? 'CANDIDATE_PLAY' : 'NO_PLAY',
  };
}

// Every entry here MUST cite a primary source before pRoyalFlush is filled
// in; leaving it null is the correct state until this repo independently
// verifies (or finds a cited) exact paytable + optimal-strategy combinatorics
// for that specific Botemania title. NEVER borrow a foreign operator's
// figure for these without an explicit crossOperatorOnly flag.
export const BOTEMANIA_VIDEO_POKER_TITLES = [
  {
    slug: 'classic-video-poker',
    url: 'https://www.botemania.es/juegos/casino-online/classic-video-poker',
    publishedRtpRangePct: [96.77, 99.26],
    exactPaytableRecovered: false,
    pRoyalFlush: null,
    hasVisibleProgressiveJackpot: null, // not yet probed for jackpot-specific text, only RTP text was captured in prior evidence
  },
  {
    slug: 'poker-3-opciones',
    url: 'https://www.botemania.es/juegos/casino-online/poker-3-opciones',
    publishedRtpRangePct: [97.99, 98.48],
    exactPaytableRecovered: true, // hand-pay ladder IS visible in captured evidence: Par 4:1, Escalera 6:1, Trio 33:1, Escalera de Color 35:1, Escalera Real 100:1
    pRoyalFlush: null, // paytable shape (Par/Escalera/Trio/Escalera de Color/Escalera Real) does not match standard 5-card-draw Jacks-or-Better categories - likely a 3-card-poker-family variant, not a draw-poker royal-progressive candidate; needs its own rules confirmation before any EV claim
    hasVisibleProgressiveJackpot: false, // no jackpot/bote text found in the captured RTP context for this title
  },
  {
    slug: 'ultimate-video-poker',
    url: 'https://www.botemania.es/juegos/casino-online/ultimate-video-poker',
    publishedRtpRangePct: [96.77, 99.54],
    exactPaytableRecovered: false,
    pRoyalFlush: null,
    hasVisibleProgressiveJackpot: null,
  },
  {
    slug: 'videopoker-remasterizado',
    url: 'https://www.botemania.es/juegos/casino-online/videopoker-remasterizado',
    publishedRtpRangePct: [99.54, 99.54],
    exactPaytableRecovered: false,
    pRoyalFlush: null,
    hasVisibleProgressiveJackpot: null,
    note: '99.54% under optimal strategy exactly matches the well-published "9/6 Jacks or Better" full-pay RTP figure - a strong but UNCONFIRMED hint, not yet primary-sourced for this exact game.',
  },
];
