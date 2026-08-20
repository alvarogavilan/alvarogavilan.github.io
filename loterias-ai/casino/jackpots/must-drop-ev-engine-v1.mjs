// Reusable must-drop / must-hit-by EV engine.
//
// The research model assumes a power-law CDF F(q)=q^alpha for the latent drop
// point over a normalized interval q in [0,1]. The important implementation
// detail is that wager EV must use the EXACT conditional probability over the
// next finite meter/time interval, not the infinitesimal approximation
// hazard(q)*dq. The latter can materially over/under-state EV near a cap or
// deadline, exactly where an AP gate is most sensitive.

export function clampUnit(q) {
  return Math.max(1e-5, Math.min(0.9998, q));
}

export function positionFraction({ current, start, end }) {
  if (![current, start, end].every(Number.isFinite) || end <= start) return null;
  return clampUnit((current - start) / (end - start));
}

export function hazardShape(q, alpha) {
  if (!Number.isFinite(q) || !Number.isFinite(alpha) || alpha <= 0) return null;
  const qq = Math.max(0, Math.min(1, q));
  const F = qq ** alpha;
  const f = alpha * Math.max(1e-15, qq) ** (alpha - 1);
  return { F, f, hazard: f / Math.max(1e-15, 1 - F) };
}

// Exact conditional probability that the latent drop point lies in (q1,q2],
// conditional on survival through q1, under F(q)=q^alpha.
export function conditionalDropProbability({ q1, q2, alpha }) {
  if (![q1, q2, alpha].every(Number.isFinite) || alpha <= 0) return null;
  const a = Math.max(0, Math.min(1, q1));
  const b = Math.max(a, Math.min(1, q2));
  const F1 = a ** alpha;
  const F2 = b ** alpha;
  const survival = 1 - F1;
  if (survival <= 0) return 1;
  return Math.max(0, Math.min(1, (F2 - F1) / survival));
}

// EV contribution for one unit of stake when meterPerBet is the amount by
// which one unit of stake advances the tracked meter. This is exact within the
// assumed F(q) model for a finite meter increment.
export function evPerBet({ q, alpha, meterPerBet, distanceToEnd, awardValue }) {
  if (![q, alpha, meterPerBet, distanceToEnd, awardValue].every(Number.isFinite) || alpha <= 0 || meterPerBet < 0 || distanceToEnd <= 0 || awardValue < 0) return null;
  const dq = meterPerBet / distanceToEnd;
  const pDrop = conditionalDropProbability({ q1: q, q2: q + dq, alpha });
  return pDrop == null ? null : awardValue * pDrop;
}

const DEFAULT_ALPHA_GRID = [1, 1.25, 1.5, 2, 3, 4, 5, 7.5, 10];

export function monetaryCapScenarioGrid({
  baseRtp,
  potEUR,
  cap,
  seedScenarios,
  networkShare,
  activeFractionsOfPublishedPct,
  publishedExtraPct = 1,
  alphaGrid = DEFAULT_ALPHA_GRID,
}) {
  if (!Number.isFinite(baseRtp) || !Number.isFinite(potEUR) || !Number.isFinite(cap) || !Number.isFinite(networkShare) || networkShare < 0) {
    return { blocked: true, reason: 'MISSING_REQUIRED_NUMERIC_INPUT', scenarios: [] };
  }
  if (!Array.isArray(seedScenarios) || !Array.isArray(activeFractionsOfPublishedPct) || !Array.isArray(alphaGrid)) {
    return { blocked: true, reason: 'MISSING_SCENARIO_GRID', scenarios: [] };
  }
  const scenarios = [];
  for (const seed of seedScenarios) {
    const q = positionFraction({ current: potEUR, start: seed.value, end: cap });
    for (const frac of activeFractionsOfPublishedPct) {
      const activeContributionPct = (publishedExtraPct / 100) * frac;
      const meterPerBet = activeContributionPct * networkShare;
      for (const alpha of alphaGrid) {
        const jackpotEv = q == null ? null : evPerBet({ q, alpha, meterPerBet, distanceToEnd: cap - seed.value, awardValue: potEUR });
        const totalRtp = jackpotEv == null ? null : baseRtp + jackpotEv;
        scenarios.push({
          seedScenario: seed.name,
          seedValue: seed.value,
          activeFractionOfPublishedPct: frac,
          activeContributionPct: +(activeContributionPct * 100).toFixed(4),
          alpha,
          q,
          jackpotEv: jackpotEv == null ? null : +jackpotEv.toFixed(9),
          totalRtp: totalRtp == null ? null : +totalRtp.toFixed(9),
          totalRtpPct: totalRtp == null ? null : +(totalRtp * 100).toFixed(6),
        });
      }
    }
  }
  const vals = scenarios.map((x) => x.totalRtp).filter(Number.isFinite);
  const worst = vals.length ? Math.min(...vals) : null;
  const best = vals.length ? Math.max(...vals) : null;
  const evaluable = scenarios.filter((x) => Number.isFinite(x.totalRtp));
  const passCount = evaluable.filter((x) => x.totalRtp >= 1).length;
  return {
    blocked: false,
    scenarioCount: scenarios.length,
    evaluableScenarioCount: evaluable.length,
    passCount,
    allScenariosAbove100: evaluable.length > 0 && passCount === evaluable.length,
    worstRtp: worst,
    bestRtp: best,
    scenarios,
  };
}

// Wall-clock must-drop-within model. The CDF model supplies the exact
// conditional probability that a drop occurs during the next spin-duration
// interval. Converting that drop event into "MY spin wins" still requires a
// separately validated award mechanism; otherwise this function fails closed.
export function timedDeadlineHazardGrid({
  elapsedSeconds,
  windowTotalSeconds,
  alphaGrid = DEFAULT_ALPHA_GRID,
  awardMechanism = null,
  mySecondsPerSpin = null,
  potEUR = null,
  myStakePerSpin = null,
  baseRtp = null,
}) {
  const q = positionFraction({ current: elapsedSeconds, start: 0, end: windowTotalSeconds });
  if (q == null) return { blocked: true, reason: 'MISSING_OR_INVALID_TIME_WINDOW', hazardByAlpha: [] };

  const hazardByAlpha = alphaGrid.map((alpha) => {
    const shape = hazardShape(q, alpha);
    const hazardPerSecond = shape == null ? null : shape.hazard / windowTotalSeconds;
    const q2 = Number.isFinite(mySecondsPerSpin) ? Math.min(1, q + mySecondsPerSpin / windowTotalSeconds) : null;
    const pDropDuringSpin = q2 == null ? null : conditionalDropProbability({ q1: q, q2, alpha });
    return { alpha, q, hazardPerSecond, pDropDuringSpin };
  });

  const awardMechanismKnown = awardMechanism != null && ['NETWORK_RANDOM_ACTIVE_SPIN', 'PER_PLAYER_SESSION_COUNTDOWN'].includes(awardMechanism.type);
  let evByAlpha = null;
  if (awardMechanismKnown && Number.isFinite(mySecondsPerSpin) && mySecondsPerSpin > 0 && Number.isFinite(potEUR) && potEUR >= 0 && Number.isFinite(myStakePerSpin) && myStakePerSpin > 0 && Number.isFinite(baseRtp)) {
    evByAlpha = hazardByAlpha.map(({ alpha, pDropDuringSpin }) => {
      let pMySpinWins = pDropDuringSpin;
      if (awardMechanism.type === 'NETWORK_RANDOM_ACTIVE_SPIN') {
        const n = Number(awardMechanism.concurrentActivePlayers);
        if (!Number.isFinite(n) || n < 1) return { alpha, blocked: true, reason: 'MISSING_CONCURRENT_ACTIVE_PLAYERS' };
        pMySpinWins = pDropDuringSpin / n;
      }
      pMySpinWins = Math.max(0, Math.min(1, pMySpinWins));
      const jackpotEvPerBet = (pMySpinWins * potEUR) / myStakePerSpin;
      const totalRtp = baseRtp + jackpotEvPerBet;
      return { alpha, pMySpinWins, jackpotEvPerBet: +jackpotEvPerBet.toFixed(9), totalRtp: +totalRtp.toFixed(9), totalRtpPct: +(totalRtp * 100).toFixed(6) };
    });
  }

  return {
    blocked: false,
    q,
    remainingSeconds: windowTotalSeconds - elapsedSeconds,
    hazardByAlpha,
    awardMechanismKnown,
    evByAlpha,
    decision: {
      conservativeEvComputed: evByAlpha != null,
      verdict: evByAlpha == null ? 'NO_PLAY' : (evByAlpha.every((x) => !x.blocked && x.totalRtp >= 1) ? 'CANDIDATE_PLAY' : 'NO_PLAY'),
      reason: evByAlpha == null ? 'AWARD_MECHANISM_UNKNOWN_CANNOT_CONVERT_TIME_HAZARD_TO_PER_SPIN_PROBABILITY_WITHOUT_FABRICATING_ASSUMPTION' : 'SEE_evByAlpha',
    },
  };
}

export function impliedMaxConcurrentPlayersForBreakeven({ elapsedSeconds, windowTotalSeconds, alpha, mySecondsPerSpin, potEUR, myStakePerSpin, baseRtp, targetRtp = 1 }) {
  const q = positionFraction({ current: elapsedSeconds, start: 0, end: windowTotalSeconds });
  if (q == null || ![alpha, mySecondsPerSpin, potEUR, myStakePerSpin, baseRtp, targetRtp].every(Number.isFinite) || mySecondsPerSpin <= 0 || myStakePerSpin <= 0) return null;
  const q2 = Math.min(1, q + mySecondsPerSpin / windowTotalSeconds);
  const pMySpinWinsUnshared = conditionalDropProbability({ q1: q, q2, alpha });
  const neededJackpotEvPerBet = targetRtp - baseRtp;
  if (neededJackpotEvPerBet <= 0) return { maxConcurrentPlayers: Infinity, alreadyAboveTargetWithoutJackpot: true };
  const pMySpinWinsNeeded = (neededJackpotEvPerBet * myStakePerSpin) / potEUR;
  if (!Number.isFinite(pMySpinWinsNeeded) || pMySpinWinsNeeded <= 0 || pMySpinWinsUnshared <= 0) return { maxConcurrentPlayers: 0, pMySpinWinsUnshared, pMySpinWinsNeeded };
  const maxConcurrentPlayers = pMySpinWinsUnshared / pMySpinWinsNeeded;
  return { maxConcurrentPlayers, pMySpinWinsUnshared, pMySpinWinsNeeded };
}
