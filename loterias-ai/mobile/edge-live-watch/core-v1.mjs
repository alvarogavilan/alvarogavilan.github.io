// Pure, network-free EDGE Mobile watcher logic. Imported by both the
// browser app (app.js, as an ES module) and the Node unit tests, so the
// exact same code that runs on an iPhone is what gets tested here.
//
// Mirrors the alias-collapse and reset-detection semantics already
// established in loterias-ai/edge-live/botemania-all-network-fast-meter-sample-v1.mjs
// exactly (same 20% drop threshold, same ambiguous-id quarantine rule) so a
// mobile-captured reset event means the same thing as a server-captured one.

export const RESET_DROP_FRACTION_THRESHOLD = 0.20;
export const PAIR_AMOUNT_TOLERANCE_EUR = 0.01;

export const PRIORITY_COUNTERS = [
  { network: 'blueprint', id: 'JACKPOTKING' },
  { network: 'blueprint', id: 'JACKPOTKING_REGAL' },
  { network: 'blueprint', id: 'JACKPOTKING_ROYAL' },
  { network: 'generic', id: 'tikitemple2_1' },
  { network: 'generic', id: 'progressivealice1' },
  { network: 'generic', id: 'WAGER_BET' },
  { network: 'generic', id: 'pool1' },
  { network: 'generic', id: 'bouncy_bubbles_id' },
  { network: 'generic', id: 'classicwildsprogressive' },
  { network: 'generic', id: 'diamondbonanza25BTM' },
  { network: 'generic', id: 'DealOrNoDealStateful3' },
];

// Same query as botemania-all-network-fast-meter-sample-v1.mjs. Do not add
// or rename fields here without updating that script too - both must stay
// byte-identical in the parts that matter (operationName, field selection).
export const GRAPHQL_ENDPOINT = 'https://www.botemania.es/es/graphql';
export const GRAPHQL_QUERY = `query loadJackpots {
  jackpots { id amount }
  redTigerJackpots { id amount }
  blueprintJackpots { id amount }
}`;

// Node (server-side) request init - used by scripts that run outside a
// browser, where `fetch()` has no restriction on which headers it can set.
// This is what botemania-all-network-fast-meter-sample-v1.mjs and
// cors-preflight-probe-v1.mjs use, and what a real browser's own network
// stack automatically sends for a cross-origin request's Origin header
// (Origin is set correctly by the browser itself for every cross-origin
// fetch - it does NOT need to be, and cannot be, set by page JS).
export function graphqlNodeRequestInit() {
  return {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      venture: 'botemania_es',
      origin: 'https://www.botemania.es',
      referer: 'https://www.botemania.es/',
      'cache-control': 'no-cache, no-store, max-age=0',
    },
    body: JSON.stringify({ operationName: 'loadJackpots', variables: {}, query: GRAPHQL_QUERY }),
  };
}

// Browser-safe request init. `Origin` and `Referer` are both on the Fetch
// spec's forbidden-header-name list - page JS cannot set or override them
// (the browser sets Origin itself, automatically and correctly, to the
// PAGE's real origin; Referer is governed by Referrer-Policy, not by
// request headers). A previous version of this function copied the Node
// script's origin/referer values into the browser path, which is not just
// unhelpful but structurally impossible - `fetch()` either silently drops
// those two header entries or throws, depending on the engine, and in
// neither case does the request end up looking anything like what was
// written here. Only the headers below are ones a browser will actually
// send as written.
export function graphqlBrowserRequestInit() {
  return {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      venture: 'botemania_es',
      'cache-control': 'no-cache, no-store, max-age=0',
    },
    body: JSON.stringify({ operationName: 'loadJackpots', variables: {}, query: GRAPHQL_QUERY }),
  };
}

// Mirrors the server script's alias-collapse: equal network+id+amount rows
// are safe duplicates and collapse to one row; an id carrying >1 distinct
// amount at the same instant is ambiguous and excluded from currentByKey so
// it can never produce a false reset signal.
export function parseGraphqlBody(body) {
  const rows = [];
  const add = (network, items) => {
    for (const x of Array.isArray(items) ? items : []) {
      const id = String(x?.id ?? '').trim();
      const amountEUR = Number(x?.amount);
      if (id && Number.isFinite(amountEUR) && amountEUR >= 0) rows.push({ network, id, amountEUR: +amountEUR.toFixed(6) });
    }
  };
  add('generic', body?.data?.jackpots);
  add('redTiger', body?.data?.redTigerJackpots);
  add('blueprint', body?.data?.blueprintJackpots);

  const grouped = new Map();
  for (const x of rows) {
    const key = `${x.network}:${x.id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(x);
  }
  const ambiguousKeys = [];
  const canonicalRows = [];
  for (const [key, group] of grouped) {
    const amounts = [...new Set(group.map((x) => x.amountEUR.toFixed(6)))];
    if (amounts.length !== 1) { ambiguousKeys.push(key); continue; }
    canonicalRows.push(group[0]);
  }
  ambiguousKeys.sort();
  const currentByKey = Object.fromEntries(canonicalRows.map((x) => [`${x.network}:${x.id}`, x]));
  return { rows, canonicalRows, ambiguousKeys, currentByKey };
}

export function detectResetEvents(currentByKey, previousByKey, observedAt, previousObservedAt) {
  const events = [];
  for (const [key, current] of Object.entries(currentByKey || {})) {
    const prior = (previousByKey || {})[key];
    const from = Number(prior?.amountEUR);
    const to = Number(current?.amountEUR);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to < 0 || to >= from) continue;
    const dropFraction = 1 - to / from;
    if (dropFraction < RESET_DROP_FRACTION_THRESHOLD) continue;
    events.push({
      eventId: `${key}:${observedAt}`,
      observedAt,
      fromObservedAt: previousObservedAt || null,
      key,
      network: current.network,
      id: current.id,
      previousAmountEUR: +from.toFixed(6),
      currentAmountEUR: +to.toFixed(6),
      dropEUR: +(from - to).toFixed(6),
      dropFraction: +dropFraction.toFixed(6),
      identityClass: 'EXACT_NETWORK_ID_WITH_SINGLE_LIVE_AMOUNT',
      economicPromotionAllowed: false,
      realMoneyAllowed: false,
    });
  }
  return events;
}

// Freezes the existing gate (1/2, from 2026-08-21T14:44:06.603Z) as a
// known fact. A second independent match here only ever produces a
// candidate for external review - it can never self-promote identity.
export const TIKI_ALICE_FROZEN_GATE = {
  firstPairedResetAt: '2026-08-21T14:44:06.603Z',
  fromEUR: 1208.43,
  toEUR: 2.82,
  independentPairedResetCount: 1,
  requiredForPromotion: 2,
};

export function evaluateTikiAlicePairedReset(resetEvents) {
  const tiki = (resetEvents || []).find((e) => e.key === 'generic:tikitemple2_1');
  const alice = (resetEvents || []).find((e) => e.key === 'generic:progressivealice1');
  if (!tiki || !alice) return null;
  if (tiki.observedAt !== alice.observedAt) return null;
  const prevAmountsMatch = Math.abs(tiki.previousAmountEUR - alice.previousAmountEUR) <= PAIR_AMOUNT_TOLERANCE_EUR;
  const currAmountsMatch = Math.abs(tiki.currentAmountEUR - alice.currentAmountEUR) <= PAIR_AMOUNT_TOLERANCE_EUR;
  if (!prevAmountsMatch || !currAmountsMatch) return null;
  return {
    status: 'PROSPECTIVE_PAIRED_RESET_CANDIDATE',
    detectedAt: tiki.observedAt,
    tiki,
    alice,
    prevAmountsMatch,
    currAmountsMatch,
    forFeed: 'tiki-alice-paired-reset-relationship-v1',
    exactAliasVerified: false,
    exactGameIdentityVerified: false,
    winfallExactLiveIdVerified: false,
    evEnabled: false,
    realMoneyAllowed: false,
  };
}

// Generous margin over the 30-60s configured poll range - anything beyond
// this between two consecutive polls (whether from a recorded
// visibilitychange background gap, or simply a slow/delayed poll while the
// page stayed visible) means the watcher was not continuously observing,
// so a drop across that interval can never be trusted as a clean reset.
export const MAX_CONTINUOUS_GAP_SECONDS = 150;

export function evaluateCoverageGap({ observedAt, previousObservedAt, backgroundGapSeconds }) {
  if (!previousObservedAt) return { continuousCoverage: true, coverageGapSeconds: 0, elapsedSeconds: 0 };
  const elapsedSeconds = (Date.parse(observedAt) - Date.parse(previousObservedAt)) / 1000;
  const backgroundGap = Number(backgroundGapSeconds) || 0;
  const coverageGapSeconds = Math.max(elapsedSeconds, backgroundGap);
  const continuousCoverage = elapsedSeconds <= MAX_CONTINUOUS_GAP_SECONDS && backgroundGap === 0;
  return {
    continuousCoverage,
    coverageGapSeconds: +coverageGapSeconds.toFixed(3),
    elapsedSeconds: +elapsedSeconds.toFixed(3),
  };
}

// The single entry point app.js uses per poll. Fail-closed by construction:
// reset detection (and everything downstream of it - Tiki/Alice pairing,
// JPK clean-window eligibility, any future hazard/seed inference) only ever
// runs when coverage was continuous since the last poll. When it wasn't,
// any drop that occurred is still reported - as a clearly-labeled,
// explicitly ineligible RESET_ACROSS_COVERAGE_GAP entry - for audit
// visibility, but it structurally cannot reach resetEvents, pairedCandidate,
// or any counter that depends on a clean prospective window. The state is
// always rebaselined to the current sample regardless, so continuous
// coverage resuming on the next poll immediately restores normal detection.
export function processPoll({ currentByKey, previousState, observedAt, backgroundGapSeconds }) {
  const coverage = evaluateCoverageGap({
    observedAt,
    previousObservedAt: previousState?.observedAt ?? null,
    backgroundGapSeconds,
  });

  let resetEvents = [];
  let contaminatedEvents = [];
  let pairedCandidate = null;

  if (previousState) {
    const rawEvents = detectResetEvents(currentByKey, previousState.byKey, observedAt, previousState.observedAt);
    if (coverage.continuousCoverage) {
      resetEvents = rawEvents;
      pairedCandidate = evaluateTikiAlicePairedReset(resetEvents);
    } else {
      contaminatedEvents = rawEvents.map((e) => ({
        ...e,
        eventType: 'RESET_ACROSS_COVERAGE_GAP',
        continuousCoverage: false,
        coverageGapSeconds: coverage.coverageGapSeconds,
        eligibleForCleanReset: false,
        eligibleForJpkCleanWindow: false,
        eligibleForTikiAlicePairing: false,
        eligibleForHazardInference: false,
      }));
    }
  }

  return {
    coverage,
    resetEvents,
    contaminatedEvents,
    pairedCandidate,
    newState: { byKey: currentByKey, observedAt },
  };
}

export function jpkJointCapture(currentByKey) {
  const ids = ['blueprint:JACKPOTKING', 'blueprint:JACKPOTKING_REGAL', 'blueprint:JACKPOTKING_ROYAL'];
  const rows = ids.map((k) => (currentByKey || {})[k] || null);
  return { complete: rows.every(Boolean), rows: Object.fromEntries(ids.map((k, i) => [k, rows[i]])) };
}
