#!/usr/bin/env node
// Carril A, H1/H2/H3 falsification: the exact compiled query recovered from
// containers-DoubleJackpots-index-js (module 614) is:
//   query loadJackpots { redTigerJackpots { id amount } }
// This executes that EXACT public query (read-only, no auth/cookies/mutation)
// against Botemania's own GraphQL endpoint and persists whatever id/amount
// rows come back, so the real jackpot IDs can be compared against the
// "Daily"/"Quick Hit"/"Hourly" labels seen elsewhere in the shared Jackpots
// component, and against a future richer probe of any OTHER query that
// might supply mustDropWithin for the same or different IDs.
import fs from 'node:fs';
import crypto from 'node:crypto';

const ENDPOINT = 'https://www.botemania.es/es/graphql';
const VENTURE = 'botemania_es';
const REFERER = 'https://www.botemania.es/';
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-redtiger-jackpots-live-query-v1.json';
const QUERY = `query loadJackpots {
    redTigerJackpots {
        id
        amount
    }
}`;
const headers = {
  accept: 'application/json',
  'content-type': 'application/json',
  venture: VENTURE,
  referer: REFERER,
  origin: 'https://www.botemania.es',
  'user-agent': 'loterias-ai-botemania-redtiger-jackpots-live-query/1.0',
};

const r = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ operationName: 'loadJackpots', query: QUERY, variables: {} }) });
const text = await r.text();
let body = null;
try { body = JSON.parse(text); } catch {}
const rows = body?.data?.redTigerJackpots || null;

const KNOWN_LABEL_HINTS = ['daily', 'hourly', 'quick', 'quickhit', 'weekly', 'flash', 'mega', 'grand'];
const idHints = (rows || []).map((row) => ({
  id: row?.id ?? null,
  amount: row?.amount ?? null,
  matchesKnownLabelHint: KNOWN_LABEL_HINTS.some((h) => String(row?.id || '').toLowerCase().includes(h)),
}));

const out = {
  version: 'botemania-redtiger-jackpots-live-query-v1',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  query: QUERY,
  httpStatus: r.status,
  ok: r.ok,
  errors: (body?.errors || []).map((e) => String(e?.message || e)).slice(0, 20),
  rowCount: Array.isArray(rows) ? rows.length : 0,
  rows: idHints,
  responseSha256: crypto.createHash('sha256').update(text).digest('hex'),
  decision: {
    liveRowsRecovered: Array.isArray(rows) && rows.length > 0,
    anyIdMatchesKnownDailyHourlyQuickHitHints: idHints.some((x) => x.matchesKnownLabelHint),
    mustDropWithinFieldPresentInResponse: Array.isArray(rows) && rows.some((row) => row && Object.prototype.hasOwnProperty.call(row, 'mustDropWithin')),
    realMoneyAllowed: false,
  },
  guards: {
    exactRecoveredQueryOnly: true,
    noGraphqlIntrospection: true,
    noMutation: true,
    noAuthentication: true,
    noCookies: true,
    noBetting: true,
    realMoneyAllowed: false,
  },
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ httpStatus: out.httpStatus, rowCount: out.rowCount, rows: out.rows, decision: out.decision }, null, 2));
