#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN = 'https://www.botemania.es';
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-double-jackpots-id-origin-scan-v1.json';
const UA = 'loterias-ai-double-jackpots-id-origin/1.0';
const headers = { accept: 'text/html,application/javascript,*/*', 'user-agent': UA, 'cache-control': 'no-cache' };
const IDS = ['Daily', 'Quick Hit', 'Hourly'];

async function fetchText(url, accept) {
  const r = await fetch(url, { headers: { ...headers, accept }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  const text = await r.text();
  return { r, text };
}

const { r: home, text: homeText } = await fetchText(`${ORIGIN}/`, 'text/html,*/*');
if (!home.ok) throw new Error(`HOME_HTTP_${home.status}`);
const runtimeMatch = homeText.match(/(?:src=["'])([^"']*\/runtime\.[a-f0-9]+\.js)/i);
if (!runtimeMatch) throw new Error('RUNTIME_NOT_FOUND');
const runtimeUrl = new URL(runtimeMatch[1], ORIGIN).href;
const { r: rr, text: runtime } = await fetchText(runtimeUrl, 'application/javascript,*/*');
if (!rr.ok) throw new Error(`RUNTIME_HTTP_${rr.status}`);

const pairs = [];
for (const m of runtime.matchAll(/(\d+):["']([^"']+)["']/g)) pairs.push({ id: m[1], value: m[2] });
const names = new Map(), hashes = new Map();
for (const p of pairs) {
  if (/^[a-f0-9]{16,40}$/i.test(p.value)) hashes.set(p.id, p.value);
  else if (/[A-Za-z]/.test(p.value)) names.set(p.id, p.value);
}
const chunks = [];
for (const [id, name] of names) {
  const hash = hashes.get(id);
  if (!hash || !/^[a-z0-9~_.-]+$/i.test(name)) continue;
  chunks.push({ id, name, url: `${ORIGIN}/es/${name}.${hash}.js` });
}
const targets = [...new Map(chunks.map((x) => [x.url, x])).values()];
if (!targets.length) throw new Error('RUNTIME_MANIFEST_PARSE_EMPTY');

const hits = [];
const failures = [];
let success = 0;
let cursor = 0;
function contextsFor(text, needle, limit = 10) {
  const out = [];
  const lower = text.toLowerCase(), n = needle.toLowerCase();
  let p = 0;
  while (out.length < limit) {
    const i = lower.indexOf(n, p);
    if (i < 0) break;
    out.push(text.slice(Math.max(0, i - 900), Math.min(text.length, i + n.length + 1400)));
    p = i + n.length;
  }
  return out;
}
async function worker() {
  while (true) {
    const i = cursor++;
    if (i >= targets.length) return;
    const t = targets[i];
    try {
      const { r, text } = await fetchText(t.url, 'application/javascript,*/*');
      if (!r.ok) { failures.push({ ...t, httpStatus: r.status, error: `HTTP_${r.status}` }); continue; }
      success++;
      const exactIdHits = IDS.filter((id) => text.includes(`"${id}"`) || text.includes(`'${id}'`));
      const quickHitLoose = /Quick\s*Hit/i.test(text);
      if (!exactIdHits.length && !quickHitLoose) continue;
      const contexts = [...new Set([
        ...contextsFor(text, 'Quick Hit'),
        ...contextsFor(text, 'Daily'),
        ...contextsFor(text, 'Hourly'),
      ])].slice(0, 30);
      const joined = contexts.join('\n');
      hits.push({
        ...t,
        httpStatus: r.status,
        bytes: text.length,
        sha256: crypto.createHash('sha256').update(text).digest('hex'),
        exactIdHits,
        containsAllThreeExactIds: IDS.every((id) => exactIdHits.includes(id)),
        sourceLikeSignals: {
          redTigerJackpots: /redTigerJackpots/i.test(joined),
          mustDropWithin: /mustDropWithin/i.test(joined),
          amount: /\bamount\b/i.test(joined),
          graphql: /graphql|query\s+loadJackpots/i.test(joined),
          assignmentOrMapping: /(?:map\s*\(|\.find\s*\(|=\s*\{|\.concat\s*\(|Object\.assign)/i.test(joined),
        },
        contexts,
      });
    } catch (e) {
      failures.push({ ...t, httpStatus: null, error: String(e?.name || e?.message || e) });
    }
  }
}
await Promise.all(Array.from({ length: 12 }, () => worker()));

const scanComplete = success === targets.length && failures.length === 0;
const knownConsumerNames = new Set([
  'vendors~albatross-common-components-dist-components-Jackpots',
  'albatross-common-components-dist-components-DoubleJackpots',
]);
const nonKnownConsumerHits = hits.filter((h) => !knownConsumerNames.has(h.name));
const sourceCandidateHits = nonKnownConsumerHits.filter((h) =>
  h.sourceLikeSignals.redTigerJackpots || h.sourceLikeSignals.graphql ||
  (h.sourceLikeSignals.mustDropWithin && h.sourceLikeSignals.assignmentOrMapping)
);

const out = {
  version: 'botemania-double-jackpots-id-origin-scan-v1',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  idsProvenBySharedComponent: IDS,
  runtime: { url: runtimeUrl, httpStatus: rr.status, bytes: runtime.length, sha256: crypto.createHash('sha256').update(runtime).digest('hex') },
  coverage: {
    chunksTargeted: targets.length,
    chunksFetchedSuccessfully: success,
    fetchFailureCount: failures.length,
    fetchFailures: failures.slice(0, 100),
    coveragePct: +(100 * success / targets.length).toFixed(3),
    scanComplete,
  },
  hitChunkCount: hits.length,
  hits,
  classification: {
    nonKnownConsumerHitCount: nonKnownConsumerHits.length,
    nonKnownConsumerHitNames: nonKnownConsumerHits.map((h) => h.name),
    sourceCandidateHitCount: sourceCandidateHits.length,
    sourceCandidateHitNames: sourceCandidateHits.map((h) => h.name),
  },
  decision: {
    exactDoubleIdsConfirmed: true,
    ids: IDS,
    sourceCandidateFoundOutsideKnownConsumer: sourceCandidateHits.length > 0,
    exactMustDropEnrichmentSourceVerified: false,
    liveRowsRequired: true,
    realMoneyAllowed: false,
  },
  guards: {
    fullRuntimeCoverageRequiredForStrongNegative: true,
    referenceDoesNotEqualProducer: true,
    noAuthentication: true,
    noCookies: true,
    noGraphqlIntrospection: true,
    noMutation: true,
    noBetting: true,
    realMoneyAllowed: false,
  },
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ coverage: out.coverage, hitChunkCount: out.hitChunkCount, classification: out.classification, decision: out.decision }, null, 2));
