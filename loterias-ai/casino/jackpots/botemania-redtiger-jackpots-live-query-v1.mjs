#!/usr/bin/env node
// Exact public query recovered from Botemania's DoubleJackpots container:
//   query loadJackpots { redTigerJackpots { id amount } }
// This probe records the live id/amount rows only. Crucially, because the
// recovered query does NOT request mustDropWithin, the absence of that field
// in the response can never be interpreted as evidence that the backing
// object lacks it.
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
  'user-agent': 'loterias-ai-botemania-redtiger-jackpots-live-query/1.1',
};

const r = await fetch(ENDPOINT, {
  method: 'POST',
  headers,
  body: JSON.stringify({ operationName: 'loadJackpots', query: QUERY, variables: {} }),
  redirect: 'follow',
  signal: AbortSignal.timeout(15000),
});
const text = await r.text();
let body = null;
try { body = JSON.parse(text); } catch {}
const rows = body?.data?.redTigerJackpots || null;

const KNOWN_LABEL_HINTS = ['daily', 'hourly', 'quick', 'quickhit', 'weekly', 'flash', 'mega', 'grand'];
const idHints = (Array.isArray(rows) ? rows : []).map((row) => ({
  id: row?.id ?? null,
  amount: Number.isFinite(Number(row?.amount)) ? Number(row.amount) : row?.amount ?? null,
  matchesKnownLabelHint: KNOWN_LABEL_HINTS.some((h) => String(row?.id || '').toLowerCase().includes(h)),
}));

const parsedOk = body !== null;
const graphqlErrors = (body?.errors || []).map((e) => String(e?.message || e)).slice(0, 20);
const out = {
  version: 'botemania-redtiger-jackpots-live-query-v1.1-query-semantics-safe',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  query: QUERY,
  queryFields: ['id', 'amount'],
  queryRequestsMustDropWithin: false,
  httpStatus: r.status,
  httpOk: r.ok,
  jsonParsed: parsedOk,
  errors: graphqlErrors,
  rowCount: idHints.length,
  rows: idHints,
  responseSha256: crypto.createHash('sha256').update(text).digest('hex'),
  decision: {
    liveRowsRecovered: r.ok && graphqlErrors.length === 0 && idHints.length > 0,
    anyIdMatchesKnownDailyHourlyQuickHitHints: idHints.some((x) => x.matchesKnownLabelHint),
    mustDropWithinQueryableFromThisRecoveredQuery: false,
    mustDropWithinAbsenceNotInterpretable: true,
    enrichmentHypothesisResolved: false,
    realMoneyAllowed: false,
  },
  guards: {
    exactRecoveredQueryOnly: true,
    responseCannotProveUnrequestedFieldAbsent: true,
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
console.log(JSON.stringify({
  httpStatus: out.httpStatus,
  rowCount: out.rowCount,
  rows: out.rows,
  decision: out.decision,
}, null, 2));
