// EV engine for lottery roll-down / forced-redistribution mechanisms (the
// Selbee/Cash-WinFall mechanism family - see loterias-ai/universidad/
// advantage-play-case-studies-v1.json). Confirmed Spanish analogue: when
// Euromillones' jackpot (category 1) hits its published cap (250M EUR) for
// up to 4 consecutive draws without a category-1 winner, the excess funds
// are forcibly redirected into category 2 (5 numbers + 1 star) - this is an
// official SELAE/Euromillones rule (WebSearch, cross-checked against
// multiple independent lottery-info sites), NOT yet independently verified
// against SELAE's own primary regulation text (see decision.primarySourceConfirmed).
export function clampNonNegative(x) {
  return Number.isFinite(x) && x > 0 ? x : 0;
}

// Direct (non-approximated) pari-mutuel EV of a forced redistribution into a
// shared-prize category. expectedTotalTickets*pCategory is the expected
// number of winners of THAT category; dividing the redistributed fund by it
// is only trustworthy when that expected count is comfortably >= minTrustedExpectedWinners
// (otherwise a single extra/missing winner swings the payout too much for a
// point EV to be meaningful - flagged via lowSampleWarning rather than hidden).
export function rolldownEvPerTicket({ redistributedFundEUR, pCategory, expectedTotalTickets, ticketPriceEUR, baseRtp, minTrustedExpectedWinners = 5 }) {
  if (![redistributedFundEUR, pCategory, expectedTotalTickets, ticketPriceEUR, baseRtp].every(Number.isFinite)) {
    return { blocked: true, reason: 'MISSING_REQUIRED_NUMERIC_INPUT' };
  }
  const expectedWinners = expectedTotalTickets * pCategory;
  const lowSampleWarning = expectedWinners < minTrustedExpectedWinners;
  const fundPerWinner = expectedWinners > 0 ? redistributedFundEUR / expectedWinners : 0;
  const evBoostPerTicket = pCategory * fundPerWinner;
  const evBoostPerEuroStaked = evBoostPerTicket / ticketPriceEUR;
  const totalRtp = baseRtp + evBoostPerEuroStaked;
  return {
    blocked: false,
    expectedWinners: +expectedWinners.toFixed(4),
    lowSampleWarning,
    evBoostPerTicket: +evBoostPerTicket.toFixed(6),
    evBoostPerEuroStaked: +evBoostPerEuroStaked.toFixed(6),
    totalRtp: +totalRtp.toFixed(6),
    totalRtpPct: +(totalRtp * 100).toFixed(4),
    verdict: !lowSampleWarning && totalRtp >= 1 ? 'CANDIDATE_PLAY' : 'NO_PLAY',
  };
}

export const EUROMILLONES_CAP_ROLLDOWN_MECHANISM = {
  id: 'euromillones-cap-forced-rolldown-to-category2',
  jurisdiction: 'ES/pan-European (SELAE-administered draw)',
  triggerCondition: 'Category-1 jackpot reaches the published cap (widely reported as 250M EUR) and goes unwon for up to 4 consecutive draws; from the 5th such draw, category-1 funds are redirected to category 2 (5 numbers + 1 star).',
  primarySourceConfirmed: false,
  sourceNote: 'Cross-checked across multiple independent Spanish lottery-info sites via WebSearch this session; NOT yet verified against SELAE\'s own primary regulation text (Real Decreto / reglamento del juego). Treat as DISCOVERY tier until a primary-source citation is attached.',
  requiredLiveInputsToEvaluate: [
    'current category-1 jackpot value vs published cap',
    'how many consecutive draws it has sat at the cap (need >=4 for the redistribution to trigger)',
    'exact redistributed fund amount for the triggering draw',
    'expected/actual ticket sales for that draw (for expectedWinners)',
    'official pCategory2 odds (not hardcoded here - must come from SELAE\'s own published odds table)',
  ],
  currentlyActive: false,
};
