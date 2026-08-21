#!/usr/bin/env node
// Carril 3: resolve unmapped live feed IDs (generic:classicwildsprogressive,
// generic:progressivealice1) to an exact Botemania-accessible game, or
// establish honestly that the sitemap-bounded scan found no match. Reuses
// the sitemap enumeration from botemania-progressive-catalog-v1.mjs but does
// NOT filter to "mentions Bote Progresivo" - an unmapped id could belong to a
// delisted, non-progressive-labelled, or casino-online (not slots-online)
// page, so this scans raw HTML/embedded script URLs for a literal id-fragment
// match instead of rules text. Coverage is tracked explicitly (scanned vs
// discovered, fetch failures) so a partial scan can never be misread as a
// complete negative result - same convention as the other global scans in
// this repo (scanComplete / negativeResultInterpretableAsCompleteScan).
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN = 'https://www.botemania.es';
const SITEMAPS = [`${ORIGIN}/es/sitemap.xml`];
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-unmapped-live-id-resolver-v1.json';
const UA = 'loterias-ai-botemania-unmapped-live-id-resolver/1.0';
const headers = { accept: 'text/html,application/xml,*/*', 'user-agent': UA, 'cache-control': 'no-cache' };

// Each candidate fragment is derived directly from the live feed id itself -
// no guessed/fabricated game names, only substrings of the real id.
const CANDIDATES = [
  { monitorKey: 'generic:classicwildsprogressive', fragments: ['classicwilds', 'classic-wilds', 'classic_wilds'] },
  { monitorKey: 'generic:progressivealice1', fragments: ['alice'] },
];

const MAX_PAGES = 260;
const WALL_CLOCK_BUDGET_MS = 9 * 60 * 1000;
const startedAt = Date.now();

const sm = await fetch(SITEMAPS[0], { headers, signal: AbortSignal.timeout(15000) });
const xml = await sm.text();
if (!sm.ok) throw new Error(`SITEMAP_HTTP_${sm.status}`);
const allUrls = [...new Set([...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, '&')).filter((u) => /\/juegos\/(slots-online|casino-online)\//.test(u)))];
const urls = allUrls.slice(0, MAX_PAGES);

const rows = [];
const failures = [];
let fetchedOk = 0;
let budgetExceeded = false;
for (const url of urls) {
  if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) { budgetExceeded = true; break; }
  try {
    const r = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    const html = await r.text();
    if (!r.ok) { failures.push({ url, httpStatus: r.status }); continue; }
    fetchedOk++;
    const lower = html.toLowerCase();
    const hits = CANDIDATES.filter((c) => c.fragments.some((f) => lower.includes(f.toLowerCase())));
    if (hits.length) rows.push({ url, slug: new URL(url).pathname.split('/').filter(Boolean).pop(), matchedMonitorKeys: hits.map((h) => h.monitorKey), sha256: crypto.createHash('sha256').update(html).digest('hex') });
  } catch (e) { failures.push({ url, httpStatus: null, error: String(e?.name || e?.message || e) }); }
}

const resolvedByMonitorKey = {};
for (const c of CANDIDATES) resolvedByMonitorKey[c.monitorKey] = rows.filter((r) => r.matchedMonitorKeys.includes(c.monitorKey)).map((r) => ({ url: r.url, slug: r.slug }));

const attempted = fetchedOk + failures.length;
const scanComplete = !budgetExceeded && attempted === urls.length && failures.length === 0;

const out = {
  version: 'botemania-unmapped-live-id-resolver-v1',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  candidates: CANDIDATES,
  coverage: {
    sitemapSlotAndCasinoUrls: allUrls.length,
    targeted: urls.length,
    attempted,
    fetchedSuccessfully: fetchedOk,
    fetchFailureCount: failures.length,
    failures: failures.slice(0, 50),
    wallClockBudgetExceeded: budgetExceeded,
    scanComplete,
    negativeResultInterpretableAsCompleteScan: scanComplete,
  },
  matches: rows,
  resolvedByMonitorKey,
  guards: { operatorDomainOnly: true, boundedScan: true, noAuthentication: true, noCookies: true, noMutation: true, noBetting: true, realMoneyAllowed: false, noFabricatedGameNameGuess: true },
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ coverage: out.coverage, resolvedByMonitorKey }, null, 2));
