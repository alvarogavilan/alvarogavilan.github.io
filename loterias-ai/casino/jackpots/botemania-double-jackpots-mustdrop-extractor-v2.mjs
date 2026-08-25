#!/usr/bin/env node
// v2: widen the scan of Botemania's DoubleJackpots settings bundle and probe
// the exact mustDropWithin field consumed by Botemania's public jackpot UI.
// The GraphQL field name is inferred from that public consumer bundle; this is
// not schema introspection and cannot promote a wager by itself.
import fs from 'node:fs';
import crypto from 'node:crypto';

const LAZY = 'loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-probe-v1.json';
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-double-jackpots-mustdrop-extractor-v2.json';
const ENDPOINT = 'https://www.botemania.es/es/graphql';
const TARGET_IDS = ['Daily', 'Quick Hit', 'Hourly'];
const MUSTDROP_QUERY = `query loadJackpots { redTigerJackpots { id amount mustDropWithin } }`;
const BASE_QUERY = `query loadJackpots { redTigerJackpots { id amount } }`;
const GRAPHQL_HEADERS = {
  accept: 'application/json',
  'content-type': 'application/json',
  venture: 'botemania_es',
  origin: 'https://www.botemania.es',
  referer: 'https://www.botemania.es/',
  'user-agent': 'loterias-ai-mustdrop-extractor/2.1',
  'cache-control': 'no-cache',
};

const lazy = JSON.parse(fs.readFileSync(LAZY, 'utf8'));
const metas = (lazy.chunks || []).filter((x) => /DoubleJackpots-(MustDropWithin|settings)/i.test(String(x.name || '')));

const NEEDLES = [
  'mustDropWithin', 'MustDropWithin', 'must drop', 'mustDrop', 'MustDrop',
  'minimum', 'maximum', 'threshold', 'jackpot.amount', 'amount',
  'cap', 'seed', 'reset', 'floor', 'ceiling', 'expir', 'deadline',
  'countdown', 'window', 'currency', 'EUR', 'GBP', 'contribution',
  'jackpotId', 'jackpotID', 'networkId', 'poolId', 'tierId', 'gameEngineID',
];

const CURRENCY_KEY_RE = /(jackpot|pot|drop|cap|seed|reset|min|max|floor|ceiling|threshold|window|expir|deadline|countdown)/i;
const chunks = [];
const findings = [];
const objectLiteralCandidates = [];

async function runGraphql(query) {
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: GRAPHQL_HEADERS,
      body: JSON.stringify({ operationName: 'loadJackpots', variables: {}, query }),
      redirect: 'follow',
    });
    const text = await r.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    return {
      httpStatus: r.status,
      ok: r.ok,
      bytes: text.length,
      errors: (body?.errors || []).map((e) => String(e?.message || '')).filter(Boolean).slice(0, 10),
      rawRows: Array.isArray(body?.data?.redTigerJackpots) ? body.data.redTigerJackpots : [],
    };
  } catch (error) {
    return { httpStatus: null, ok: false, bytes: 0, errors: [String(error?.message || error)], rawRows: [] };
  }
}

const enriched = await runGraphql(MUSTDROP_QUERY);
const fieldAccepted = enriched.ok && enriched.errors.length === 0;
const fallback = fieldAccepted ? null : await runGraphql(BASE_QUERY);
const selected = fieldAccepted ? enriched : fallback;
const liveRows = (selected?.rawRows || []).map((x) => {
  const raw = x?.mustDropWithin ?? null;
  const parsedMs = raw == null ? NaN : Date.parse(String(raw));
  return {
    id: String(x?.id || ''),
    amount: Number.isFinite(Number(x?.amount)) ? Number(x.amount) : null,
    mustDropWithin: raw,
    mustDropWithinIso: Number.isFinite(parsedMs) ? new Date(parsedMs).toISOString() : null,
    remainingSecondsAtProbe: Number.isFinite(parsedMs) ? Math.floor((parsedMs - Date.now()) / 1000) : null,
  };
}).filter((x) => x.id);
const targetRows = liveRows.filter((x) => TARGET_IDS.includes(x.id));
const exactDeadlineRows = targetRows.filter((x) => x.mustDropWithin != null && x.mustDropWithin !== '');

for (const meta of metas) {
  const r = await fetch(meta.url, {
    headers: {
      accept: 'application/javascript,*/*',
      'user-agent': 'loterias-ai-mustdrop-extractor/2.1',
      'cache-control': 'no-cache',
    },
    redirect: 'follow',
  });
  const text = await r.text();
  chunks.push({
    name: meta.name,
    url: meta.url,
    httpStatus: r.status,
    bytes: text.length,
    sha256: crypto.createHash('sha256').update(text).digest('hex'),
  });

  const lower = text.toLowerCase();
  for (const needle of NEEDLES) {
    let p = 0;
    let c = 0;
    const needleLower = needle.toLowerCase();
    while (c < 12) {
      const i = lower.indexOf(needleLower, p);
      if (i < 0) break;
      const context = text.slice(Math.max(0, i - 400), Math.min(text.length, i + needle.length + 800));
      findings.push({ chunk: meta.name, needle, index: i, context });
      p = i + needle.length;
      c++;
    }
  }

  const objRe = /\{[^{}]{0,400}\}/g;
  let m;
  let scanned = 0;
  while ((m = objRe.exec(text)) && scanned < 4000) {
    scanned++;
    const span = m[0];
    if (!CURRENCY_KEY_RE.test(span)) continue;
    const nums = [...span.matchAll(/\b\d{2,}(?:\.\d+)?\b/g)].map((x) => x[0]);
    if (nums.length >= 2) {
      objectLiteralCandidates.push({
        chunk: meta.name,
        index: m.index,
        span: span.slice(0, 400),
        numbers: nums.slice(0, 12),
      });
    }
  }
}

const out = {
  version: 'botemania-double-jackpots-mustdrop-extractor-v2.1-live-field-probe',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  liveFieldProbe: {
    endpoint: ENDPOINT,
    targetIds: TARGET_IDS,
    querySource: 'PUBLIC_UI_CONSUMER_FIELD_INFERENCE',
    mustDropQuery: MUSTDROP_QUERY,
    baseFallbackQuery: BASE_QUERY,
    fieldAccepted,
    enrichedResponse: {
      httpStatus: enriched.httpStatus,
      ok: enriched.ok,
      bytes: enriched.bytes,
      errors: enriched.errors,
      rowCount: enriched.rawRows.length,
    },
    fallbackResponse: fallback ? {
      httpStatus: fallback.httpStatus,
      ok: fallback.ok,
      bytes: fallback.bytes,
      errors: fallback.errors,
      rowCount: fallback.rawRows.length,
    } : null,
    liveRows,
    targetRows,
  },
  chunks,
  needleCount: NEEDLES.length,
  findingsCount: findings.length,
  findings,
  objectLiteralCandidateCount: objectLiteralCandidates.length,
  objectLiteralCandidates: objectLiteralCandidates.slice(0, 200),
  decision: {
    mustDropWithinGraphqlFieldAccepted: fieldAccepted,
    exactTargetRowsRecovered: targetRows.length > 0,
    exactMustDropDeadlineRecovered: exactDeadlineRows.length > 0,
    exactDeadlineIds: exactDeadlineRows.map((x) => x.id),
    settingsChunkHadNeedleMatches: findings.some((f) => /settings/i.test(f.chunk)),
    settingsChunkHadObjectLiteralCandidates: objectLiteralCandidates.some((f) => /settings/i.test(f.chunk)),
    exactMustDropLimitsRecovered: false,
    requiresManualReviewOfObjectLiteralCandidates: objectLiteralCandidates.length > 0,
    requiresLiveJackpotRows: targetRows.length === 0,
    realMoneyAllowed: false,
  },
  guards: {
    publicStaticBundlesOnly: true,
    graphqlFieldInferredFromPublicUiConsumer: true,
    noGraphqlIntrospection: true,
    noMutation: true,
    noAuthentication: true,
    noCookies: true,
    noAutoPromotionFromHeuristicScan: true,
    noAutoPromotionFromDeadlineFieldAlone: true,
    noBetting: true,
    realMoneyAllowed: false,
  },
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  liveFieldProbe: out.liveFieldProbe,
  chunks,
  decision: out.decision,
  findingsCount: out.findingsCount,
  objectLiteralCandidateCount: out.objectLiteralCandidateCount,
}, null, 2));
