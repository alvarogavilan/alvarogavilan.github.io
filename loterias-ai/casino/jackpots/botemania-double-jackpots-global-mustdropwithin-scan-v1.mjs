#!/usr/bin/env node
// Misión A, continued: the jackpot-scoped 36-chunk manifest is exhausted -
// the container-trace pass recovered the EXACT GraphQL query text
// ("query loadJackpots { redTigerJackpots { id amount } }") and confirmed it
// does NOT request mustDropWithin, and ruled out HeadlessJackpots (a
// game-catalog loader, unrelated to jackpot amounts) and the "settings"
// bundle (carousel/slider breakpoint config, not jackpot economics) as
// sources. Reuses the exact runtime.js chunk-manifest-parsing technique
// already proven in botemania-headless-global-bundle-config-scan-v1.mjs
// (which discovered 260 total chunks site-wide) to search the FULL bundle,
// not just the jackpot-keyword-filtered subset, for every reference to
// "mustDropWithin" - this is the only way to find whichever OTHER
// container/service enriches redTigerJackpots with the deadline before it
// reaches the shared DoubleJackpots presentational component.
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-double-jackpots-global-mustdropwithin-scan-v1.json';
const ORIGIN = 'https://www.botemania.es';
const UA = 'loterias-ai-doublejackpots-global-mustdropwithin-scan/1.0';
const headers = { accept: 'text/html,application/javascript,*/*', 'user-agent': UA, 'cache-control': 'no-cache' };

const home = await fetch(`${ORIGIN}/`, { headers, redirect: 'follow' });
const homeText = await home.text();
const runtimeMatch = homeText.match(/(?:src=["'])([^"']*\/runtime\.[a-f0-9]+\.js)/i);
const runtimeUrl = runtimeMatch ? new URL(runtimeMatch[1], ORIGIN).href : `${ORIGIN}/es/runtime.88e5d9042d77e378fcb1.js`;
const rr = await fetch(runtimeUrl, { headers: { ...headers, accept: 'application/javascript,*/*' }, redirect: 'follow' });
const runtime = await rr.text();

const pairs = [];
for (const m of runtime.matchAll(/(\d+):["']([^"']+)["']/g)) pairs.push({ id: m[1], value: m[2] });
const names = new Map(), hashes = new Map();
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

// Already fully traced in botemania-double-jackpots-container-trace-v1.json - skip re-fetching to save budget.
const ALREADY_TRACED = new Set([
  'containers-DoubleJackpots-index-js',
  'albatross-common-components-dist-components-DoubleJackpots',
  'vendors~albatross-common-components-dist-components-DoubleJackpots~albatross-common-components-dist-~41ab7bd8',
  'vendors~albatross-common-components-dist-components-DoubleJackpots~albatross-common-components-dist-~96c8b37b',
  'vendors~albatross-common-components-dist-components-DoubleJackpots~albatross-common-components-dist-~f18595e8',
]);
const targets = uniq.filter((x) => !ALREADY_TRACED.has(x.name));

const hitChunks = [];
let scanned = 0;
for (const t of targets) {
  scanned++;
  let text;
  try {
    const r = await fetch(t.url, { headers: { ...headers, accept: 'application/javascript,*/*' }, redirect: 'follow' });
    text = await r.text();
    if (!/mustDropWithin/i.test(text)) continue;
    const contexts = [];
    let p = 0, c = 0;
    const lower = text.toLowerCase();
    while (c < 10) {
      const i = lower.indexOf('mustdropwithin', p);
      if (i < 0) break;
      contexts.push(text.slice(Math.max(0, i - 500), Math.min(text.length, i + 600)));
      p = i + 14;
      c++;
    }
    hitChunks.push({ id: t.id, name: t.name, url: t.url, httpStatus: r.status, bytes: text.length, sha256: crypto.createHash('sha256').update(text).digest('hex'), contexts });
  } catch (e) {
    // network errors on individual chunks are not fatal to the overall scan
  }
}

const out = {
  version: 'botemania-double-jackpots-global-mustdropwithin-scan-v1',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  runtime: { url: runtimeUrl, httpStatus: rr.status, bytes: runtime.length, sha256: crypto.createHash('sha256').update(runtime).digest('hex') },
  chunksDiscovered: uniq.length,
  chunksAlreadyTraced: ALREADY_TRACED.size,
  chunksScanned: scanned,
  hitChunkCount: hitChunks.length,
  hitChunks,
  decision: {
    newSourceOfMustDropWithinFound: hitChunks.length > 0,
    exactEnrichmentModuleIdentified: false, // never auto-set true; requires manual/model read of hitChunks contexts
    requiresLiveJackpotRows: true,
    realMoneyAllowed: false,
  },
  guards: {
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
console.log(JSON.stringify({ chunksDiscovered: out.chunksDiscovered, chunksScanned: out.chunksScanned, hitChunkCount: out.hitChunkCount, hitChunkNames: hitChunks.map((h) => h.name), decision: out.decision }, null, 2));
