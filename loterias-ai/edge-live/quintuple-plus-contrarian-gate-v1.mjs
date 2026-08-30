#!/usr/bin/env node

function finite(x, name) {
  if (!Number.isFinite(x)) throw new Error(`${name} must be finite`);
  return x;
}
function prob(x, name) {
  finite(x, name);
  if (x < 0 || x > 1) throw new Error(`${name} must be in [0,1]`);
  return x;
}
function nonneg(x, name) {
  finite(x, name);
  if (x < 0) throw new Error(`${name} must be >= 0`);
  return x;
}

export function publicComboMle(firstCategoryWinners, publicTickets) {
  nonneg(firstCategoryWinners, 'firstCategoryWinners');
  finite(publicTickets, 'publicTickets');
  if (!(publicTickets > 0)) throw new Error('publicTickets must be > 0');
  if (firstCategoryWinners > publicTickets) throw new Error('winners cannot exceed tickets');
  return firstCategoryWinners / publicTickets;
}

export function zeroWinnerUpperPublicProbability(publicTickets, confidence = 0.95) {
  finite(publicTickets, 'publicTickets');
  prob(confidence, 'confidence');
  if (!(publicTickets > 0) || confidence === 0 || confidence === 1) throw new Error('invalid inputs');
  // Exact one-sided binomial bound: P(K=0 | p) = (1-p)^N = 1-confidence.
  return 1 - Math.pow(1 - confidence, 1 / publicTickets);
}

export function probabilityNoOtherWinningTicket(publicTickets, pPublicCombo) {
  nonneg(publicTickets, 'publicTickets');
  prob(pPublicCombo, 'pPublicCombo');
  return Math.pow(1 - pPublicCombo, publicTickets);
}

export function expectedFirstPrizeShareFraction(publicTickets, pPublicCombo) {
  nonneg(publicTickets, 'publicTickets');
  prob(pPublicCombo, 'pPublicCombo');
  // K~Binomial(N,p), our conditional share is 1/(1+K).
  // E[1/(1+K)] = [1-(1-p)^(N+1)] / [(N+1)p].
  if (pPublicCombo === 0) return 1;
  return (1 - Math.pow(1 - pPublicCombo, publicTickets + 1)) / ((publicTickets + 1) * pPublicCombo);
}

export function topCategoryEvPerTicket({
  pRealCombo,
  pPublicCombo,
  publicTickets,
  firstCategoryPoolEUR,
  specialPoolEUR = 0,
  ticketCostEUR = 1
}) {
  prob(pRealCombo, 'pRealCombo');
  prob(pPublicCombo, 'pPublicCombo');
  nonneg(publicTickets, 'publicTickets');
  nonneg(firstCategoryPoolEUR, 'firstCategoryPoolEUR');
  nonneg(specialPoolEUR, 'specialPoolEUR');
  finite(ticketCostEUR, 'ticketCostEUR');
  if (!(ticketCostEUR > 0)) throw new Error('ticketCostEUR must be > 0');

  const firstShare = expectedFirstPrizeShareFraction(publicTickets, pPublicCombo);
  const uniqueProbabilityGivenHit = probabilityNoOtherWinningTicket(publicTickets, pPublicCombo);
  const conditionalTopPayoutEUR = firstCategoryPoolEUR * firstShare + specialPoolEUR * uniqueProbabilityGivenHit;
  const grossTopEvEUR = pRealCombo * conditionalTopPayoutEUR;
  return {
    pRealCombo,
    pPublicCombo,
    contrarianRatio: pPublicCombo === 0 ? Infinity : pRealCombo / pPublicCombo,
    firstShare,
    uniqueProbabilityGivenHit,
    conditionalTopPayoutEUR,
    grossTopEvEUR,
    topOnlyRoi: grossTopEvEUR / ticketCostEUR - 1,
    decision: grossTopEvEUR > ticketCostEUR ? 'TOP_ONLY_MATHEMATICALLY_POSITIVE_IF_INPUTS_BOUND' : 'NO_TOP_ONLY_EDGE'
  };
}

export function requiredRealProbabilityForBreakEven({
  pPublicCombo,
  publicTickets,
  firstCategoryPoolEUR,
  specialPoolEUR = 0,
  ticketCostEUR = 1
}) {
  prob(pPublicCombo, 'pPublicCombo');
  nonneg(publicTickets, 'publicTickets');
  nonneg(firstCategoryPoolEUR, 'firstCategoryPoolEUR');
  nonneg(specialPoolEUR, 'specialPoolEUR');
  finite(ticketCostEUR, 'ticketCostEUR');
  if (!(ticketCostEUR > 0)) throw new Error('ticketCostEUR must be > 0');
  const firstShare = expectedFirstPrizeShareFraction(publicTickets, pPublicCombo);
  const unique = probabilityNoOtherWinningTicket(publicTickets, pPublicCombo);
  const conditionalTopPayoutEUR = firstCategoryPoolEUR * firstShare + specialPoolEUR * unique;
  return conditionalTopPayoutEUR > 0 ? ticketCostEUR / conditionalTopPayoutEUR : Infinity;
}

export function researchGate(input) {
  if (!input || input.pRealSourceBound !== true || input.pPublicSourceBound !== true || input.poolSourceBound !== true) {
    return {
      mode: 'RESEARCH_ONLY',
      realMoneyAllowed: false,
      realStakeEUR: 0,
      decision: 'NO_PLAY_UNBOUND_INPUTS',
      missing: {
        pRealSourceBound: input?.pRealSourceBound === true ? null : true,
        pPublicSourceBound: input?.pPublicSourceBound === true ? null : true,
        poolSourceBound: input?.poolSourceBound === true ? null : true
      }
    };
  }
  const result = topCategoryEvPerTicket(input);
  return {
    mode: 'RESEARCH_ONLY',
    realMoneyAllowed: false,
    realStakeEUR: 0,
    decision: result.grossTopEvEUR > input.ticketCostEUR ? 'CANDIDATE_REQUIRES_TAX_AND_LOWER_CATEGORY_FINAL_GATE' : 'NO_PLAY_TOP_ONLY_NEGATIVE',
    result
  };
}

// Deterministic self-checks; no network access and no wagering actions.
if (Math.abs(publicComboMle(5, 15316) - 5 / 15316) > 1e-15) throw new Error('MLE self-check failed');
if (expectedFirstPrizeShareFraction(10000, 0) !== 1) throw new Error('share self-check failed');

if (import.meta.url === `file://${process.argv[1]}`) {
  const historicalExamples = [
    { date: '2026-07-30', tickets: 23783, firstWinners: 1 },
    { date: '2026-08-12', tickets: 12393, firstWinners: 1 },
    { date: '2026-08-23', tickets: 15316, firstWinners: 5 }
  ].map(x => ({ ...x, realizedComboPublicMle: publicComboMle(x.firstWinners, x.tickets) }));
  process.stdout.write(`${JSON.stringify({
    mode: 'RESEARCH_ONLY',
    decision: 'NO_PLAY_UNTIL_CURRENT_P_REAL_AND_P_PUBLIC_BOUND',
    historicalExamples,
    zeroWinnerExample95Upper: zeroWinnerUpperPublicProbability(19524, 0.95)
  }, null, 2)}\n`);
}
