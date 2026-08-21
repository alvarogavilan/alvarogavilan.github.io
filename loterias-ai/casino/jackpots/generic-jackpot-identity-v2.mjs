export function canonicalizeGenericRows(rows) {
  const grouped = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = String(row?.id || '').trim();
    const amount = Number(row?.amountEUR);
    if (!id || !Number.isFinite(amount)) continue;
    if (!grouped.has(id)) grouped.set(id, { rowCount: 0, amounts: new Set() });
    const group = grouped.get(id);
    group.rowCount += 1;
    group.amounts.add(amount);
  }

  const tracks = [];
  const quarantined = [];
  for (const [id, group] of grouped) {
    const distinctAmounts = [...group.amounts].sort((a, b) => a - b);
    if (distinctAmounts.length === 1) {
      tracks.push({
        trackKey: `generic:${id}`,
        network: 'generic',
        id,
        amountEUR: distinctAmounts[0],
        rowCount: group.rowCount,
        collapsedAliasRows: Math.max(0, group.rowCount - 1),
        identityClass: 'EXACT_NETWORK_PLUS_UNIQUE_ID',
      });
      continue;
    }
    quarantined.push({
      network: 'generic',
      id,
      rowCount: group.rowCount,
      distinctAmounts,
      reason: 'SAME_NETWORK_ID_MULTIPLE_AMOUNTS',
      economicPromotionAllowed: false,
    });
  }

  tracks.sort((a, b) => a.id.localeCompare(b.id));
  quarantined.sort((a, b) => a.id.localeCompare(b.id));
  return { tracks, quarantined };
}

export function detectStableDrops({
  currentTracks,
  priorTracks,
  observedAt,
  thresholdFloorEUR = 0.5,
  thresholdFraction = 0.002,
}) {
  const priorByKey = new Map(
    (Array.isArray(priorTracks) ? priorTracks : [])
      .filter((x) => x?.identityClass === 'EXACT_NETWORK_PLUS_UNIQUE_ID')
      .map((x) => [x.trackKey, x]),
  );
  const events = [];
  for (const cur of Array.isArray(currentTracks) ? currentTracks : []) {
    if (cur?.identityClass !== 'EXACT_NETWORK_PLUS_UNIQUE_ID') continue;
    const prev = priorByKey.get(cur.trackKey);
    if (!prev) continue;
    const previousEUR = Number(prev.amountEUR);
    const currentEUR = Number(cur.amountEUR);
    if (!Number.isFinite(previousEUR) || !Number.isFinite(currentEUR) || previousEUR <= 0) continue;
    const dropEUR = previousEUR - currentEUR;
    const threshold = Math.max(thresholdFloorEUR, previousEUR * thresholdFraction);
    if (dropEUR <= threshold) continue;
    events.push({
      eventKey: `${cur.trackKey}|${previousEUR.toFixed(2)}|${currentEUR.toFixed(2)}|${observedAt}`,
      observedAt,
      trackKey: cur.trackKey,
      network: 'generic',
      id: cur.id,
      previousEUR,
      currentEUR,
      dropEUR: Number(dropEUR.toFixed(2)),
      dropFraction: Number((dropEUR / previousEUR).toFixed(6)),
      identityClass: 'EXACT_NETWORK_PLUS_UNIQUE_ID',
      classification: 'UNCLASSIFIED_DROP_CANDIDATE',
      economicPromotionAllowed: false,
    });
  }
  return events;
}
