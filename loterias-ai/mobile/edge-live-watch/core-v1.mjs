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

export function graphqlRequestInit() {
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

export function jpkJointCapture(currentByKey) {
  const ids = ['blueprint:JACKPOTKING', 'blueprint:JACKPOTKING_REGAL', 'blueprint:JACKPOTKING_ROYAL'];
  const rows = ids.map((k) => (currentByKey || {})[k] || null);
  return { complete: rows.every(Boolean), rows: Object.fromEntries(ids.map((k, i) => [k, rows[i]])) };
}
