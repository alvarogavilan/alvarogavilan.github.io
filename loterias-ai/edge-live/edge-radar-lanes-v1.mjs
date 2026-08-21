// Pure, DOM-free lane helpers for the EDGE LIVE multi-lane radar.
//
// Every helper reads ONLY the fields of the single lane object it is given.
// This is deliberate: the multi-execution plan tracks several independent
// games at once, and one lane's GREEN status or economic state must never
// leak into another lane's card. Each card is built from that lane's own
// `current`, `economic`, `evidence`, `blockers`, `executionReady` and
// `prepareOnly` fields only.

export function laneStatus(lane) {
  if (lane?.executionReady === true) return 'GREEN';
  if (lane?.prepareOnly === true) return 'YELLOW';
  return 'RED';
}

// Top "best opportunity" card selection: GREEN first, then YELLOW, then the
// plan's own pinned selection (its highest scientific-priority lane), then
// simply the first tracked lane. This never removes any lane from the full
// radar - it only decides which single lane the top summary card shows.
export function pickTopLane(lanes, selectedLaneId) {
  const arr = Array.isArray(lanes) ? lanes : [];
  if (!arr.length) return null;
  const green = arr.find((l) => laneStatus(l) === 'GREEN');
  if (green) return green;
  const yellow = arr.find((l) => laneStatus(l) === 'YELLOW');
  if (yellow) return yellow;
  const pinned = arr.find((l) => l?.id === selectedLaneId);
  return pinned || arr[0];
}

// Number(null) is 0 and Number(undefined) is NaN - neither is a real value,
// so both must resolve to "unknown" (null) rather than a coerced 0.
function finiteOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function laneAmountEUR(lane) {
  return finiteOrNull(lane?.current?.jackpotEUR);
}

export function laneObservedAt(lane) {
  return lane?.current?.observedAt || null;
}

export function laneMovementDemonstrated(lane) {
  const v = lane?.current?.dynamicFreshnessVerified;
  return v === true ? 'SI' : v === false ? 'NO' : 'ND';
}

export function laneStasisSeconds(lane) {
  return finiteOrNull(lane?.current?.stasisSeconds);
}

// Verification fields MUST come from positive evidence on this lane, not from
// the mere absence of a blocker. The multi-plan intentionally suppresses some
// blockers until other gates pass, so blocker absence is not proof.
export function laneIdentityVerified(lane) {
  if (lane?.evidence?.identityVerified === true) return true;
  if (lane?.evidence?.identityVerified === false) return false;
  // Jackpot King uses the older single-plan evidence schema. Treat identity
  // as verified only when BOTH the structural gate and prospective network
  // allocation validation are explicitly true.
  return lane?.evidence?.structurePass === true && lane?.evidence?.networkAllocationProspectivelyValidated === true;
}

export function laneThresholdKnown(lane) {
  if (lane?.evidence?.thresholdKnown === true) return true;
  if (lane?.evidence?.thresholdKnown === false) return false;
  const n = finiteOrNull(lane?.economic?.breakEvenJackpotEUR);
  return n != null && n > 0;
}

export function laneStakeKnown(lane) {
  // creditValueVerified is a denomination/unit check, not proof of exact stake.
  return lane?.evidence?.exactStakeKnown === true;
}

export function laneStrategyVerified(lane) {
  // Never infer strategy verification from the absence of a blocker: for
  // research lanes that blocker may be omitted until the economic gate passes.
  return lane?.evidence?.strategyVerified === true;
}

// Distance uses ONLY this lane's own current amount and this lane's own
// economic threshold - never another lane's numbers.
export function laneDistanceToThresholdEUR(lane) {
  const current = laneAmountEUR(lane);
  if (current == null || !laneThresholdKnown(lane)) return null;
  return finiteOrNull(lane?.economic?.breakEvenJackpotEUR) - current;
}

// A bare operator root URL means the specific game page has not actually
// been identified yet, so it must not be presented as a real game link.
export function laneGameUrl(lane) {
  const url = lane?.game?.url;
  if (typeof url !== 'string' || !url) return null;
  if (/^https:\/\/www\.botemania\.es\/?$/.test(url)) return null;
  return url;
}

export function laneMechanismType(lane) {
  return typeof lane?.type === 'string' ? lane.type : null;
}

export function laneBlockerCodes(lane) {
  return Array.isArray(lane?.blockers) ? lane.blockers.slice() : [];
}

export function laneIsInvestigation(lane) {
  return laneStatus(lane) !== 'GREEN';
}

// Stake display must never coerce an unknown stake to 0. Only an explicit
// DO_NOT_PLAY order (the plan's real, evidenced verdict) may show 0; any
// other missing/unset stake stays null ("pending"), never 0.
export function laneStakeDisplayEUR(lane) {
  const stake = finiteOrNull(lane?.order?.stakePerSpinEUR);
  if (lane?.order?.action === 'DO_NOT_PLAY') return stake == null ? 0 : stake;
  return stake != null && stake > 0 ? stake : null;
}

export function buildLaneCard(lane) {
  return {
    id: lane?.id || null,
    name: lane?.game?.name || '—',
    mechanism: laneMechanismType(lane),
    operator: 'BOTEMANIA',
    currentEUR: laneAmountEUR(lane),
    observedAt: laneObservedAt(lane),
    movementDemonstrated: laneMovementDemonstrated(lane),
    stasisSeconds: laneStasisSeconds(lane),
    identityVerified: laneIdentityVerified(lane),
    thresholdKnown: laneThresholdKnown(lane),
    stakeKnown: laneStakeKnown(lane),
    strategyVerified: laneStrategyVerified(lane),
    stakeDisplayEUR: laneStakeDisplayEUR(lane),
    status: laneStatus(lane),
    blockers: laneBlockerCodes(lane),
    distanceToThresholdEUR: laneDistanceToThresholdEUR(lane),
    gameUrl: laneGameUrl(lane),
    investigation: laneIsInvestigation(lane),
  };
}

// Never filters: every tracked lane - RED included - always produces a card.
export function buildRadarCards(lanes) {
  return (Array.isArray(lanes) ? lanes : []).map(buildLaneCard);
}

export function radarSummary(lanes) {
  const arr = Array.isArray(lanes) ? lanes : [];
  const counts = { GREEN: 0, YELLOW: 0, RED: 0 };
  for (const l of arr) counts[laneStatus(l)]++;
  return { total: arr.length, green: counts.GREEN, yellow: counts.YELLOW, red: counts.RED };
}

// Live rows the direct GraphQL probe returns that are not accounted for by
// any tracked lane's monitor key or by the Jackpot King blueprint pot IDs.
export function unmappedLiveRows(directByKey, lanes) {
  const known = new Set(['blueprint:JACKPOTKING', 'blueprint:JACKPOTKING_REGAL', 'blueprint:JACKPOTKING_ROYAL']);
  for (const l of Array.isArray(lanes) ? lanes : []) {
    const k = l?.monitor?.key;
    if (k) known.add(k);
  }
  const out = [];
  for (const [key, row] of Object.entries(directByKey || {})) {
    if (!known.has(key)) {
      const amountEUR = finiteOrNull(row?.amountEUR);
      out.push({ key, amountEUR });
    }
  }
  return out;
}
