export function updateMeterStasis({ previous = null, currentByKey = {}, observedAt }) {
  const observedMs = Date.parse(observedAt || '');
  if (!Number.isFinite(observedMs)) throw new Error('INVALID_OBSERVED_AT');
  const priorMeters = previous?.meters && typeof previous.meters === 'object' ? previous.meters : {};
  const meters = {};

  for (const [key, row] of Object.entries(currentByKey || {})) {
    const amount = Number(row?.amountEUR);
    if (!Number.isFinite(amount)) continue;
    const prior = priorMeters[key] || null;
    const priorAmount = prior && Number.isFinite(Number(prior.currentAmountEUR)) ? Number(prior.currentAmountEUR) : null;
    const changed = priorAmount !== null && amount !== priorAmount;
    const firstSeenAt = prior?.firstSeenAt || observedAt;
    const lastChangedAt = changed ? observedAt : (prior?.lastChangedAt || null);
    const anchorAt = lastChangedAt || firstSeenAt;
    const anchorMs = Date.parse(anchorAt || '');
    const stasisSeconds = Number.isFinite(anchorMs) ? Math.max(0, Math.floor((observedMs - anchorMs) / 1000)) : null;
    meters[key] = {
      key,
      network: row?.network || key.split(':')[0] || null,
      id: row?.id || key.split(':').slice(1).join(':') || null,
      currentAmountEUR: amount,
      previousAmountEUR: priorAmount,
      firstSeenAt,
      lastObservedAt: observedAt,
      lastChangedAt,
      observationCount: Number(prior?.observationCount || 0) + 1,
      changeCount: Number(prior?.changeCount || 0) + (changed ? 1 : 0),
      dynamicMovementObserved: Boolean(prior?.dynamicMovementObserved || changed),
      changedThisObservation: changed,
      stasisSeconds,
    };
  }

  return { meters };
}

export function dynamicFreshnessForMeter(meter, { maxStasisSeconds = 1800 } = {}) {
  if (!meter) return { verified: false, reason: 'METER_STASIS_HISTORY_UNAVAILABLE' };
  if (meter.dynamicMovementObserved !== true) {
    return { verified: false, reason: 'DYNAMIC_MOVEMENT_NOT_YET_OBSERVED', stasisSeconds: meter.stasisSeconds ?? null };
  }
  if (!Number.isFinite(Number(meter.stasisSeconds))) {
    return { verified: false, reason: 'METER_STASIS_DURATION_UNKNOWN', stasisSeconds: null };
  }
  if (Number(meter.stasisSeconds) > maxStasisSeconds) {
    return { verified: false, reason: 'NO_RECENT_DYNAMIC_MOVEMENT', stasisSeconds: Number(meter.stasisSeconds) };
  }
  return { verified: true, reason: 'RECENT_DYNAMIC_MOVEMENT_OBSERVED', stasisSeconds: Number(meter.stasisSeconds) };
}
