#!/usr/bin/env node

function finite(x, name) {
  if (!Number.isFinite(x)) throw new Error(`${name} must be finite`);
  return x;
}
function nonneg(x, name) {
  finite(x, name);
  if (x < 0) throw new Error(`${name} must be >= 0`);
  return x;
}
function prob(x, name) {
  nonneg(x, name);
  if (x > 1) throw new Error(`${name} must be <= 1`);
  return x;
}

export function baseLossEUR(stakeEUR, separatedBaseReturnPct) {
  nonneg(stakeEUR, 'stakeEUR');
  finite(separatedBaseReturnPct, 'separatedBaseReturnPct');
  if (separatedBaseReturnPct < 0 || separatedBaseReturnPct > 100) throw new Error('invalid base return');
  return stakeEUR * (1 - separatedBaseReturnPct / 100);
}

export function breakEvenSingleTierHitProbability({ stakeEUR, separatedBaseReturnPct, tierPayoutEUR }) {
  nonneg(tierPayoutEUR, 'tierPayoutEUR');
  if (!(tierPayoutEUR > 0)) throw new Error('tierPayoutEUR must be > 0');
  return baseLossEUR(stakeEUR, separatedBaseReturnPct) / tierPayoutEUR;
}

export function conditionalJackpotEvEUR(tiers) {
  if (!Array.isArray(tiers)) throw new Error('tiers must be an array');
  return tiers.reduce((sum, tier, i) => {
    prob(tier.hitProbability, `tiers[${i}].hitProbability`);
    nonneg(tier.payoutEUR, `tiers[${i}].payoutEUR`);
    return sum + tier.hitProbability * tier.payoutEUR;
  }, 0);
}

export function conditionalTotalEvEUR({ stakeEUR, separatedBaseReturnPct, tiers }) {
  nonneg(stakeEUR, 'stakeEUR');
  const baseReturnEUR = stakeEUR * separatedBaseReturnPct / 100;
  const jackpotEvEUR = conditionalJackpotEvEUR(tiers);
  return {
    stakeEUR,
    baseReturnEUR,
    jackpotEvEUR,
    totalEvEUR: baseReturnEUR + jackpotEvEUR,
    edgeEUR: baseReturnEUR + jackpotEvEUR - stakeEUR,
    roi: stakeEUR === 0 ? null : (baseReturnEUR + jackpotEvEUR) / stakeEUR - 1
  };
}

export function timedExecutionGate(input = {}) {
  const required = [
    'nativeJackpotContractBound',
    'separatedBaseReturnBound',
    'liveTierValuesBound',
    'liveDeadlineBound',
    'displayFreshnessBound',
    'stakeHazardFunctionBound',
    'timeHazardFunctionBound',
    'acceptedSpinOrderingBound',
    'networkCompetitionBound'
  ];
  const missing = required.filter(k => input[k] !== true);
  if (missing.length) {
    return {
      mode: 'RESEARCH_ONLY',
      realMoneyAllowed: false,
      realStakeEUR: 0,
      decision: 'NO_PLAY_UNBOUND_TIMED_JACKPOT_INPUTS',
      missing
    };
  }

  const ev = conditionalTotalEvEUR(input);
  const conservativeEdgeEUR = Number.isFinite(input.conservativeEdgeEUR)
    ? input.conservativeEdgeEUR
    : ev.edgeEUR;

  return {
    mode: 'RESEARCH_ONLY',
    realMoneyAllowed: false,
    realStakeEUR: 0,
    decision: conservativeEdgeEUR > 0 ? 'CANDIDATE_REQUIRES_FINAL_FRESH_STATE_CONFIRMATION' : 'NO_PLAY_NONPOSITIVE_CONSERVATIVE_EV',
    ev,
    conservativeEdgeEUR,
    guards: {
      terminal100PctDoesNotGuaranteeOurSpin: true,
      noLinearStakeAssumption: true,
      noForeignNetworkTransfer: true,
      noDisplayedStateFreshnessAssumption: true,
      noRealMoneyProbe: true
    }
  };
}

export function currentBoundBenchmarks() {
  return {
    caseClosed: {
      separatedBaseReturnPct: 93.10,
      jackpotContributionPct: 2.0,
      timedEligibleCapEUR: 2.0,
      dailySeedEUR: 10000,
      tenMinuteSeedEUR: 100,
      atStakeEUR2: {
        baseLossEUR: baseLossEUR(2, 93.10),
        dailySeedBreakEvenP: breakEvenSingleTierHitProbability({ stakeEUR: 2, separatedBaseReturnPct: 93.10, tierPayoutEUR: 10000 }),
        tenMinuteSeedBreakEvenP: breakEvenSingleTierHitProbability({ stakeEUR: 2, separatedBaseReturnPct: 93.10, tierPayoutEUR: 100 })
      }
    },
    playWithTheDevil: {
      separatedBaseReturnPct: 92.71,
      jackpotContributionPct: 2.0,
      timedEligibleCapEUR: 2.0,
      dailySeedEUR: 10000,
      tenMinuteSeedEUR: 100,
      atStakeEUR2: {
        baseLossEUR: baseLossEUR(2, 92.71),
        dailySeedBreakEvenP: breakEvenSingleTierHitProbability({ stakeEUR: 2, separatedBaseReturnPct: 92.71, tierPayoutEUR: 10000 }),
        tenMinuteSeedBreakEvenP: breakEvenSingleTierHitProbability({ stakeEUR: 2, separatedBaseReturnPct: 92.71, tierPayoutEUR: 100 })
      }
    }
  };
}

// Deterministic self-checks only. No network requests and no gambling actions.
const b = currentBoundBenchmarks();
if (Math.abs(b.caseClosed.atStakeEUR2.baseLossEUR - 0.138) > 1e-12) throw new Error('Case Closed loss check failed');
if (Math.abs(b.playWithTheDevil.atStakeEUR2.baseLossEUR - 0.1458) > 1e-12) throw new Error('Play Devil loss check failed');

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify({
    mode: 'RESEARCH_ONLY',
    decision: 'NO_PLAY',
    realMoneyAllowed: false,
    benchmarks: currentBoundBenchmarks(),
    gate: timedExecutionGate({ nativeJackpotContractBound: true, separatedBaseReturnBound: true })
  }, null, 2)}\n`);
}
