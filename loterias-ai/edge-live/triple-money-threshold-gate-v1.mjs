#!/usr/bin/env node

export function separatedCashRtpPct(contractRtpPct, jackpotContributionPct) {
  requireFinite(contractRtpPct, 'contractRtpPct');
  requireFinite(jackpotContributionPct, 'jackpotContributionPct');
  if (jackpotContributionPct < 0 || contractRtpPct < jackpotContributionPct) throw new Error('invalid RTP/contribution');
  return contractRtpPct - jackpotContributionPct;
}

export function breakEvenHazardPerEUR(cashRtpPct, grandEUR) {
  requireFinite(cashRtpPct, 'cashRtpPct');
  requirePositive(grandEUR, 'grandEUR');
  if (cashRtpPct >= 100) return 0;
  return (1 - cashRtpPct / 100) / grandEUR;
}

export function impliedCycleWagerEUR(grandEUR, seedEUR, contributionPct) {
  requireFinite(grandEUR, 'grandEUR');
  requireFinite(seedEUR, 'seedEUR');
  requirePositive(contributionPct, 'contributionPct');
  if (grandEUR < seedEUR) throw new Error('grandEUR must be >= seedEUR');
  return (grandEUR - seedEUR) / (contributionPct / 100);
}

export function survivalProbabilityConstantHazard(exposureEUR, qPerEUR) {
  requireFinite(exposureEUR, 'exposureEUR');
  requireFinite(qPerEUR, 'qPerEUR');
  if (exposureEUR < 0 || qPerEUR < 0) throw new Error('exposure and hazard must be non-negative');
  return Math.exp(-qPerEUR * exposureEUR);
}

export function zeroHitUpperHazardPerEUR(exposureEUR, confidence = 0.95) {
  requirePositive(exposureEUR, 'exposureEUR');
  requireFinite(confidence, 'confidence');
  if (!(confidence > 0 && confidence < 1)) throw new Error('confidence must be in (0,1)');
  return -Math.log(1 - confidence) / exposureEUR;
}

export function conditionalTotalRtpPct(cashRtpPct, qPerEUR, grandEUR) {
  requireFinite(cashRtpPct, 'cashRtpPct');
  requireFinite(qPerEUR, 'qPerEUR');
  requirePositive(grandEUR, 'grandEUR');
  if (qPerEUR < 0) throw new Error('qPerEUR must be non-negative');
  return cashRtpPct + 100 * qPerEUR * grandEUR;
}

function requireFinite(value, name) {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}
function requirePositive(value, name) {
  requireFinite(value, name);
  if (!(value > 0)) throw new Error(`${name} must be > 0`);
}
function near(a, b, tol = 1e-12) {
  if (Math.abs(a - b) > tol) throw new Error(`assertion failed: ${a} != ${b}`);
}

export function currentResearchSnapshot() {
  const grandEUR = 54559;
  const seedEUR = 20000;
  const contributionPct = 1.0;
  const goldSpicyContractRtpPct = 95.49;
  const bellsContractRtpPct = 95.42;
  const goldSpicyCashRtpPct = separatedCashRtpPct(goldSpicyContractRtpPct, contributionPct);
  const bellsCashRtpPct = separatedCashRtpPct(bellsContractRtpPct, contributionPct);
  const cycleExposureEUR = impliedCycleWagerEUR(grandEUR, seedEUR, contributionPct);
  const qBreakEvenGoldSpicy = breakEvenHazardPerEUR(goldSpicyCashRtpPct, grandEUR);
  const qBreakEvenBells = breakEvenHazardPerEUR(bellsCashRtpPct, grandEUR);
  const survivalAtBreakEvenGoldSpicy = survivalProbabilityConstantHazard(cycleExposureEUR, qBreakEvenGoldSpicy);
  const qUpper95ConstantHazard = zeroHitUpperHazardPerEUR(cycleExposureEUR, 0.95);
  const totalRtpAtUpper95ConstantHazardPct = conditionalTotalRtpPct(goldSpicyCashRtpPct, qUpper95ConstantHazard, grandEUR);

  return {
    mode: 'RESEARCH_ONLY',
    decision: 'NO_PLAY',
    realMoneyAllowed: false,
    realStakeEUR: 0,
    inputs: { grandEUR, seedEUR, contributionPct, goldSpicyContractRtpPct, bellsContractRtpPct },
    separatedAccounting: { goldSpicyCashRtpPct, bellsCashRtpPct },
    cycleExposureEUR,
    qBreakEvenGoldSpicy,
    qBreakEvenBells,
    survivalAtBreakEvenGoldSpicy,
    qUpper95ConstantHazard,
    totalRtpAtUpper95ConstantHazardPct,
    guards: {
      noContributionDoubleCount: true,
      constantHazardIsHypothesisOnly: true,
      stakeProportionalityNotBound: true,
      noHazardEstimateFromContribution: true,
      noExecutionWithoutFreshJokerbetCounterBinding: true
    }
  };
}

// Deterministic self-checks; no network and no gambling actions.
near(separatedCashRtpPct(95.49, 1), 94.49);
near(separatedCashRtpPct(95.42, 1), 94.42);
near(impliedCycleWagerEUR(54559, 20000, 1), 3455900, 1e-6);

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(currentResearchSnapshot(), null, 2)}\n`);
}
