// Reusable must-drop / must-hit-by EV engine. Generalizes the hazard-shape
// math already proven in botemania-irish-riches-jpk-current-screen-v1.mjs
// (q/F/f/h power-law hazard sensitivity grid) so it can be applied to ANY
// must-drop tier - monetary-cap (Jackpot King Royal/Regal style) or
// wall-clock-deadline (Botemania "Double Jackpots - Must Drop Within..."
// style) - without re-deriving or duplicating the formula per game.

export function clampUnit(q) {
  return Math.max(1e-5, Math.min(0.9998, q));
}

// q = normalized position between a start point (seed / window start) and an
// end point (cap / window end) that MUST be reached before the guarantee fires.
export function positionFraction({ current, start, end }) {
  if (![current, start, end].every(Number.isFinite) || end <= start) return null;
  return clampUnit((current - start) / (end - start));
}

// Power-law hazard shape family F(q) = q^alpha. alpha=1 is the UNIFORM
// (maximum-entropy / no extra assumption) case; alpha>1 concentrates more of
// the drop probability near the end (q->1); alpha<1 concentrates it near the
// start. This IS the "no asumas uniforme sin demostrarlo" requirement made
// operational: report a range across a grid, never a single value.
export function hazardShape(q, alpha) {
  const F = q ** alpha;
  const f = alpha * q ** (alpha - 1);
  return { F, f, hazard: f / Math.max(1e-15, 1 - F) };
}

// EV contribution of the must-drop guarantee for ONE bet, expressed per unit
// of that bet's own stake. meterPerBet = how much THIS bet moves the tracked
// quantity (pot EUR, or elapsed time) toward the endpoint per unit staked;
// distanceToEnd = (end - start) in the same units. This mirrors the proven
// Irish Riches formula: h = (meterPerBet/distanceToEnd) * hazard(q,alpha).
export function evPerBet({ q, alpha, meterPerBet, distanceToEnd, awardValue }) {
  if (!Number.isFinite(q) || !Number.isFinite(meterPerBet) || !Number.isFinite(distanceToEnd) || distanceToEnd <= 0) return null;
  const { hazard } = hazardShape(q, alpha);
  const h = (meterPerBet / distanceToEnd) * hazard;
  return awardValue * h;
}

const DEFAULT_ALPHA_GRID = [1, 1.25, 1.5, 2, 3, 4, 5, 7.5, 10];

// Monetary-cap must-drop scenario grid. Direct generalization of
// botemania-irish-riches-jpk-current-screen-v1.mjs's per-tier loop so other
// Blueprint-style (or any vendor's) "must be won before EUR X" jackpots can
// reuse the exact same math instead of re-deriving it per game.
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
  if (!Number.isFinite(baseRtp) || !Number.isFinite(potEUR) || !Number.isFinite(cap) || !Number.isFinite(networkShare)) {
    return { blocked: true, reason: 'MISSING_REQUIRED_NUMERIC_INPUT', scenarios: [] };
  }
  const scenarios = [];
  for (const seed of seedScenarios) {
    const q = positionFraction({ current: potEUR, start: seed.value, end: cap });
    for (const frac of activeFractionsOfPublishedPct) {
      const activeContributionPct = (publishedExtraPct / 100) * frac;
      const meterPerBet = activeContributionPct * networkShare;
      for (const alpha of alphaGrid) {
        const jackpotEv = q == null ? null : evPerBet({ q, alpha, meterPerBet, distanceToEnd: cap - seed.value, awardValue: potEUR });
        const totalRtp = baseRtp + (jackpotEv || 0);
        scenarios.push({
          seedScenario: seed.name,
          seedValue: seed.value,
          activeFractionOfPublishedPct: frac,
          activeContributionPct: +(activeContributionPct * 100).toFixed(4),
          alpha,
          q,
          jackpotEv: jackpotEv == null ? null : +jackpotEv.toFixed(6),
          totalRtp: +totalRtp.toFixed(6),
          totalRtpPct: +(totalRtp * 100).toFixed(4),
        });
      }
    }
  }
  const vals = scenarios.map((x) => x.totalRtp).filter(Number.isFinite);
  const worst = vals.length ? Math.min(...vals) : null;
  const best = vals.length ? Math.max(...vals) : null;
  const passCount = scenarios.filter((x) => x.totalRtp >= 1).length;
  return {
    blocked: false,
    scenarioCount: scenarios.length,
    passCount,
    allScenariosAbove100: scenarios.length > 0 && passCount === scenarios.length,
    worstRtp: worst,
    bestRtp: best,
    scenarios,
  };
}

// Wall-clock must-drop-within-window scenario grid. Same q/F/f/h hazard
// SHAPE math as the monetary-cap case (well-founded, reused as-is), but the
// conversion from "hazard density over the window" into "MY probability of
// being the specific spin that receives the award" is a SEPARATE, currently
// UNVALIDATED step for any given game: it depends on whether the operator
// awards the drop (a) to a uniformly-random currently-active network spin,
// or (b) via a per-player/session-scoped countdown. Botemania's "Double
// Jackpots - Must Drop Within" component has not yet been reverse engineered
// enough to know which applies (see botemania-double-jackpots-mustdrop-extractor).
// This function therefore ALWAYS reports awardMechanismKnown:false unless the
// caller explicitly supplies a validated awardMechanism, and refuses to
// collapse the hazard grid into a single EV/PLAY-NOW verdict without one -
// exactly the "no fabricar apuesta" requirement made structural.
export function timedDeadlineHazardGrid({
  elapsedSeconds,
  windowTotalSeconds,
  alphaGrid = DEFAULT_ALPHA_GRID,
  awardMechanism = null, // { type: 'NETWORK_RANDOM_ACTIVE_SPIN', concurrentActivePlayers } | { type: 'PER_PLAYER_SESSION_COUNTDOWN' } | null
  mySecondsPerSpin = null,
  potEUR = null,
  myStakePerSpin = null,
  baseRtp = null,
}) {
  const q = positionFraction({ current: elapsedSeconds, start: 0, end: windowTotalSeconds });
  if (q == null) return { blocked: true, reason: 'MISSING_OR_INVALID_TIME_WINDOW', hazardByAlpha: [] };
  const hazardByAlpha = alphaGrid.map((alpha) => {
    const { hazard } = hazardShape(q, alpha);
    const hazardPerSecond = hazard / windowTotalSeconds;
    return { alpha, q, hazardPerSecond };
  });
  const awardMechanismKnown = awardMechanism != null && ['NETWORK_RANDOM_ACTIVE_SPIN', 'PER_PLAYER_SESSION_COUNTDOWN'].includes(awardMechanism.type);
  let evByAlpha = null;
  if (awardMechanismKnown && Number.isFinite(mySecondsPerSpin) && Number.isFinite(potEUR) && Number.isFinite(myStakePerSpin) && Number.isFinite(baseRtp)) {
    evByAlpha = hazardByAlpha.map(({ alpha, hazardPerSecond }) => {
      let pMySpinWins = hazardPerSecond * mySecondsPerSpin;
      if (awardMechanism.type === 'NETWORK_RANDOM_ACTIVE_SPIN') {
        const n = Number(awardMechanism.concurrentActivePlayers);
        if (!Number.isFinite(n) || n < 1) return { alpha, blocked: true, reason: 'MISSING_CONCURRENT_ACTIVE_PLAYERS' };
        pMySpinWins = pMySpinWins / n;
      }
      const jackpotEvPerBet = (pMySpinWins * potEUR) / myStakePerSpin;
      const totalRtp = baseRtp + jackpotEvPerBet;
      return { alpha, pMySpinWins, jackpotEvPerBet: +jackpotEvPerBet.toFixed(6), totalRtp: +totalRtp.toFixed(6), totalRtpPct: +(totalRtp * 100).toFixed(4) };
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

// Given a target RTP (e.g. 1.0 for breakeven), inverts timedDeadlineHazardGrid
// under the NETWORK_RANDOM_ACTIVE_SPIN mechanism to answer a strictly weaker,
// falsifiable question: "how many concurrently active players would there
// have to be, at most, for this bet to already be +EV right now?" This avoids
// guessing the real (unobservable) concurrency and instead gives a testable
// upper bound the user (or a future probe) can check against.
export function impliedMaxConcurrentPlayersForBreakeven({ elapsedSeconds, windowTotalSeconds, alpha, mySecondsPerSpin, potEUR, myStakePerSpin, baseRtp, targetRtp = 1 }) {
  const q = positionFraction({ current: elapsedSeconds, start: 0, end: windowTotalSeconds });
  if (q == null || ![mySecondsPerSpin, potEUR, myStakePerSpin, baseRtp].every(Number.isFinite)) return null;
  const { hazard } = hazardShape(q, alpha);
  const hazardPerSecond = hazard / windowTotalSeconds;
  const neededJackpotEvPerBet = targetRtp - baseRtp;
  if (neededJackpotEvPerBet <= 0) return { maxConcurrentPlayers: Infinity, alreadyAboveTargetWithoutJackpot: true };
  const pMySpinWinsNeeded = (neededJackpotEvPerBet * myStakePerSpin) / potEUR;
  const pMySpinWinsUnshared = hazardPerSecond * mySecondsPerSpin;
  if (pMySpinWinsUnshared <= 0) return { maxConcurrentPlayers: 0 };
  const maxConcurrentPlayers = pMySpinWinsUnshared / pMySpinWinsNeeded;
  return { maxConcurrentPlayers, pMySpinWinsUnshared, pMySpinWinsNeeded };
}
