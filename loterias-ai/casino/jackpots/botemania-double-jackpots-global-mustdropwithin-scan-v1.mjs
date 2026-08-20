#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-double-jackpots-global-mustdropwithin-scan-v1.json';
const ORIGIN = 'https://www.botemania.es';
const UA = 'loterias-ai-doublejackpots-global-mustdropwithin-scan/1.1';
const headers = { accept: 'text/html,application/javascript,*/*', 'user-agent': UA, 'cache-control': 'no-cache' };

async function fetchText(url, accept) {
  const r = await fetch(url, {
    headers: { ...headers, accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  const text = await r.text();
  return { r, text };
}

const { r: home, text: homeText } = await fetchText(`${ORIGIN}/`, 'text/html,*/*');
if (!home.ok) throw new Error(`HOME_HTTP_${home.status}`);

const runtimeMatch = homeText.match(/(?:src=["'])([^"']*\/runtime\.[a-f0-9]+\.js)/i);
const runtimeUrl = runtimeMatch ? new URL(runtimeMatch[1], ORIGIN).href : `${ORIGIN}/es/runtime.88e5d9042d77e378fcb1.js`;
const { r: rr, text: runtime } = await fetchText(runtimeUrl, 'application/javascript,*/*');
if (!rr.ok) throw new Error(`RUNTIME_HTTP_${rr.status}`);

const pairs = [];
for (const m of runtime.matchAll(/(\d+):["']([^"']+)["']/g)) pairs.push({ id: m[1], value: m[2] });
const names = new Map();
const hashes = new Map();
for (const p of pairs) {
  if (/^[a-f0-9]{16,40}$/i.test(p.value)) hashes.set(p.id, p.value);
  else if (/[A-Za-z]/.test(p.value)) names.set(p.id, p.value);
}

const all = [];
for (const [id, name] of names) {
  const hash = hashes.get(id);
  if (!hash) continue;
  all.push({ id, name, hash, url: `${ORIGIN}/es/${name}.${hash}.js` });
}
const uniq = [...new Map(all.map((x) => [x.url, x])).values()].filter((x) => /^[a-z0-9~_.-]+$/i.test(x.name));
if (uniq.length === 0) throw new Error('RUNTIME_MANIFEST_PARSE_EMPTY');

const ALREADY_TRACED = new Set([
  'containers-DoubleJackpots-index-js',
  'albatross-common-components-dist-components-DoubleJackpots',
  'vendors~albatross-common-components-dist-components-DoubleJackpots~albatross-common-components-dist-~41ab7bd8',
  'vendors~albatross-common-components-dist-components-DoubleJackpots~albatross-common-components-dist-~96c8b37b',
  'vendors~albatross-common-components-dist-components-DoubleJackpots~albatross-common-components-dist-~f18595e8',
]);
const targets = uniq.filter((x) => !ALREADY_TRACED.has(x.name));
if (targets.length === 0) throw new Error('NO_GLOBAL_SCAN_TARGETS');

const hitChunks = [];
const fetchFailures = [];
let fetchedSuccessfully = 0;
for (const t of targets) {
  try {
    const { r, text } = await fetchText(t.url, 'application/javascript,*/*');
    if (!r.ok) {
      fetchFailures.push({ id: t.id, name: t.name, url: t.url, httpStatus: r.status, error: `HTTP_${r.status}` });
      continue;
    }
    fetchedSuccessfully++;
    if (!/mustDropWithin/i.test(text)) continue;

    const contexts = [];
    let p = 0;
    let c = 0;
    const lower = text.toLowerCase();
    while (c < 10) {
      const i = lower.indexOf('mustdropwithin', p);
      if (i < 0) break;
      contexts.push(text.slice(Math.max(0, i - 500), Math.min(text.length, i + 600)));
      p = i + 'mustdropwithin'.length;
      c++;
    }
    hitChunks.push({
      id: t.id,
      name: t.name,
      url: t.url,
      httpStatus: r.status,
      bytes: text.length,
      sha256: crypto.createHash('sha256').update(text).digest('hex'),
      contexts,
    });
  } catch (e) {
    fetchFailures.push({ id: t.id, name: t.name, url: t.url, httpStatus: null, error: String(e?.name || e?.message || e) });
  }
}

const coveragePct = +(100 * fetchedSuccessfully / targets.length).toFixed(3);
const scanComplete = fetchedSuccessfully === targets.length;

const out = {
  version: 'botemania-double-jackpots-global-mustdropwithin-scan-v1.1-coverage-safe',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  runtime: {
    url: runtimeUrl,
    httpStatus: rr.status,
    bytes: runtime.length,
    sha256: crypto.createHash('sha256').update(runtime).digest('hex'),
  },
  chunksDiscovered: uniq.length,
  chunksAlreadyTraced: ALREADY_TRACED.size,
  chunksTargeted: targets.length,
  chunksFetchedSuccessfully: fetchedSuccessfully,
  chunkFetchFailureCount: fetchFailures.length,
  fetchCoveragePct: coveragePct,
  scanComplete,
  fetchFailures: fetchFailures.slice(0, 100),
  hitChunkCount: hitChunks.length,
  hitChunks,
  decision: {
    newSourceOfMustDropWithinFound: hitChunks.length > 0,
    exactEnrichmentModuleIdentified: false,
    negativeResultInterpretableAsCompleteScan: scanComplete && hitChunks.length === 0,
    requiresLiveJackpotRows: true,
    realMoneyAllowed: false,
  },
  guards: {
    incompleteCoverageCannotBeTreatedAsNegativeEvidence: true,
    publicStaticBundlesOnly: true,
    sameOperatorHostOnly: true,
    noGraphqlIntrospection: true,
    noMutation: true,
    noAuthentication: true,
    noCookies: true,
    noAutoPromotionFromHeuristicScan: true,
    noBetting: true,
    realMoneyAllowed: false,
  },
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  chunksDiscovered: out.chunksDiscovered,
  chunksTargeted: out.chunksTargeted,
  chunksFetchedSuccessfully: out.chunksFetchedSuccessfully,
  fetchCoveragePct: out.fetchCoveragePct,
  hitChunkCount: out.hitChunkCount,
  hitChunkNames: hitChunks.map((h) => h.name),
  decision: out.decision,
}, null, 2));
