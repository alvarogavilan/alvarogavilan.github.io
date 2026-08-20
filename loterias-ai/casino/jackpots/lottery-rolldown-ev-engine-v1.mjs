// EV engine for lottery roll-down / forced-redistribution mechanisms.
//
// For a fund paid only to one target category, exchangeability gives an exact
// per-ticket expectation under independent equiprobable tickets:
//   EV_target_fund_per_ticket = Fund * [1-(1-p)^N] / N
// This avoids the incorrect shortcut E[1/W] = 1/E[W].

export function clampNonNegative(x) {
  return Number.isFinite(x) && x > 0 ? x : 0;
}

export function exactTargetCategoryFundEvPerTicket({ redistributedFundEUR, pCategory, totalTickets }) {
  if (![redistributedFundEUR, pCategory, totalTickets].every(Number.isFinite)) {
    return { blocked: true, reason: 'MISSING_REQUIRED_NUMERIC_INPUT' };
  }
  if (redistributedFundEUR < 0 || pCategory < 0 || pCategory > 1 || !Number.isInteger(totalTickets) || totalTickets < 1) {
    return { blocked: true, reason: 'INVALID_REQUIRED_NUMERIC_INPUT' };
  }
  const pAtLeastOneWinner = pCategory === 0 ? 0 : -Math.expm1(totalTickets * Math.log1p(-pCategory));
  const evFundPerTicket = redistributedFundEUR * pAtLeastOneWinner / totalTickets;
  const expectedWinners = totalTickets * pCategory;
  return {
    blocked: false,
    expectedWinners: +expectedWinners.toFixed(6),
    pAtLeastOneWinner: +pAtLeastOneWinner.toFixed(12),
    evFundPerTicket: +evFundPerTicket.toFixed(9),
  };
}

// Conservative category-2-only valuation. If category 2 has no winners,
// Euromillones can cascade the fund to a lower category with winners; that
// additional EV is deliberately omitted here rather than guessed.
export function rolldownEvPerTicket({
  redistributedFundEUR,
  pCategory,
  totalTickets,
  ticketPriceEUR,
  baseRtpExcludingRedistribution,
  minTrustedExpectedWinners = 5,
}) {
  if (![redistributedFundEUR, pCategory, totalTickets, ticketPriceEUR, baseRtpExcludingRedistribution].every(Number.isFinite)) {
    return { blocked: true, reason: 'MISSING_REQUIRED_NUMERIC_INPUT' };
  }
  if (ticketPriceEUR <= 0 || baseRtpExcludingRedistribution < 0) {
    return { blocked: true, reason: 'INVALID_REQUIRED_NUMERIC_INPUT' };
  }

  const fund = exactTargetCategoryFundEvPerTicket({ redistributedFundEUR, pCategory, totalTickets });
  if (fund.blocked) return fund;

  const lowSampleWarning = fund.expectedWinners < minTrustedExpectedWinners;
  const evBoostPerTicket = fund.evFundPerTicket;
  const evBoostPerEuroStaked = evBoostPerTicket / ticketPriceEUR;
  const totalRtp = baseRtpExcludingRedistribution + evBoostPerEuroStaked;

  return {
    blocked: false,
    model: 'EXACT_TARGET_CATEGORY_BINOMIAL_SYMMETRY',
    conservativeBecauseLowerCategoryCascadeOmitted: true,
    expectedWinners: fund.expectedWinners,
    pAtLeastOneWinner: fund.pAtLeastOneWinner,
    lowSampleWarning,
    evBoostPerTicket: +evBoostPerTicket.toFixed(9),
    evBoostPerEuroStaked: +evBoostPerEuroStaked.toFixed(9),
    totalRtp: +totalRtp.toFixed(9),
    totalRtpPct: +(totalRtp * 100).toFixed(6),
    verdict: !lowSampleWarning && totalRtp >= 1 ? 'CANDIDATE_PLAY' : 'NO_PLAY',
  };
}

export const EUROMILLONES_CAP_ROLLDOWN_MECHANISM = {
  id: 'euromillones-cap-forced-rolldown-to-category2-or-next-winning-lower-category',
  jurisdiction: 'ES/pan-European (SELAE-administered draw)',
  triggerCondition: 'At the maximum allocation cap, the cap may be offered for a maximum of four successive draws. If the fifth capped draw again has no category-1 winner, the amount allocated to category 1 increases the prize fund of the immediately lower category that has at least one winner in that draw.',
  capEUR: 250000000,
  primarySourceConfirmed: true,
  primarySource: {
    publisher: 'Sociedad Estatal Loterías y Apuestas del Estado (SELAE)',
    document: 'Normas de Euromillones, norma 8.3.c and allocation-limit definition',
    url: 'https://www.loteriasyapuestas.es/f/loterias/documentos/normativa/Normativa%20de%20los%20juegos/Normas_de_Euromillones_Mayo_2020.pdf',
  },
  currentResearchStatus: 'MECHANISM_CONFIRMED_NOT_NEAR_TRIGGER',
  currentlyActive: false,
  requiredLiveInputsToEvaluate: [
    'current category-1 jackpot value vs 250M EUR cap',
    'number of successive draws already offered at the maximum cap',
    'exact category-1 fund that would be redistributed in the triggering draw',
    'official/verified total ticket count or sales-derived ticket count for the triggering draw',
    'official category-2 probability per ticket',
    'base RTP excluding the redistributed category-1 fund so the boost is not double counted',
  ],
  guards: {
    noRatioOfExpectationsApproximation: true,
    lowerCategoryCascadeOmittedFromCategory2OnlyModel: true,
    realMoneyAllowed: false,
  },
};
