#!/usr/bin/env node
// Carril B, Prioridad 1: Ultimate Video Poker's providerId is confirmed
// "roxor-gaming" via Botemania's own public GraphQL (contentfulGame).
// Botemania's page-level GraphQL only exposes {id,title,link,...}; the
// launch flow (how a provider's game session/client is actually opened) is
// not part of that public schema and link=null for this game. This probe
// reuses the runtime.js-parsing technique to enumerate the FULL site-wide
// chunk manifest and searches every chunk for launcher/provider-dispatch
// vocabulary, to find the module that turns {gameId, providerId} into an
// actual Roxor game client URL/session - all public/read-only, no login,
// no cookies, no real or demo play triggered.
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-roxor-launch-flow-probe-v1.json';
const ORIGIN = 'https://www.botemania.es';
const UA = 'loterias-ai-roxor-launch-flow-probe/1.0';
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

// Prioritize chunks whose NAME already hints at launching/providers/games over
// generic vendor bundles, to keep the fetch volume bounded on a 300+ chunk site.
const NAME_HINT_RE = /launch|player|game-?session|provider|dispatch|casino-?game|roxor/i;
const prioritized = uniq.filter((x) => NAME_HINT_RE.test(x.name));
const rest = uniq.filter((x) => !NAME_HINT_RE.test(x.name));
const MAX_TOTAL = 120; // bounded budget for a single CI run; prioritized chunks always included first
const targets = [...prioritized, ...rest].slice(0, MAX_TOTAL);

const CONTENT_NEEDLES = [
  'roxor', 'roxor-gaming', 'providerId', 'launchGame', 'gameLaunch', 'gameUrl',
  'gameSession', 'gameEngineID', 'gameEngineId', 'clientId', 'customerId',
  'profile', 'playUrl', 'realPlay', 'demoPlay', 'casinoGame', 'openGame',
  'gameIframe', 'gameCode', 'contentfulGame',
];

const chunksScanned = [];
const findings = [];
let scanned = 0;
for (const t of targets) {
  scanned++;
  let text;
  try {
    const r = await fetch(t.url, { headers: { ...headers, accept: 'application/javascript,*/*' }, redirect: 'follow' });
    text = await r.text();
  } catch {
    continue;
  }
  const lower = text.toLowerCase();
  if (!/roxor/.test(lower)) continue; // only chunks that actually mention roxor are worth keeping in evidence
  chunksScanned.push({ id: t.id, name: t.name, url: t.url, bytes: text.length, sha256: crypto.createHash('sha256').update(text).digest('hex') });
  for (const needle of CONTENT_NEEDLES) {
    let p = 0, c = 0;
    const needleLower = needle.toLowerCase();
    while (c < 8) {
      const i = lower.indexOf(needleLower, p);
      if (i < 0) break;
      findings.push({ chunk: t.name, needle, index: i, context: text.slice(Math.max(0, i - 300), Math.min(text.length, i + needle.length + 600)) });
      p = i + needle.length;
      c++;
    }
  }
}

const out = {
  version: 'botemania-roxor-launch-flow-probe-v1',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  runtime: { url: runtimeUrl, httpStatus: rr.status, bytes: runtime.length, sha256: crypto.createHash('sha256').update(runtime).digest('hex') },
  chunksDiscovered: uniq.length,
  chunksTargeted: targets.length,
  chunksScanned: scanned,
  chunksMentioningRoxor: chunksScanned.length,
  chunks: chunksScanned,
  findingsCount: findings.length,
  findings,
  decision: {
    anyRoxorReferenceFound: chunksScanned.length > 0,
    launchEndpointRecovered: false, // never auto-set true; requires manual/model read of findings
    exactRoxorAssetHostRecovered: false,
    scanBoundedNotExhaustive: targets.length < uniq.length,
    realMoneyAllowed: false,
  },
  guards: {
    publicStaticBundlesOnly: true,
    sameOperatorHostOnly: true,
    noGraphqlIntrospection: true,
    noMutation: true,
    noAuthentication: true,
    noCookies: true,
    noRealOrDemoPlayTriggered: true,
    noAutoPromotionFromHeuristicScan: true,
    noBetting: true,
    realMoneyAllowed: false,
  },
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ chunksDiscovered: out.chunksDiscovered, chunksTargeted: out.chunksTargeted, chunksScanned: out.chunksScanned, chunksMentioningRoxor: out.chunksMentioningRoxor, decision: out.decision }, null, 2));
