#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN = 'https://www.botemania.es';
const SLUG = 'ultimate-video-poker';
const PAGE = `${ORIGIN}/juegos/casino-online/${SLUG}`;
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-roxor-ultimate-video-poker-launcher-scan-v1.json';
const UA = 'loterias-ai-roxor-ultimate-video-poker-launcher-scan/1.0';
const baseHeaders = { 'user-agent': UA, 'cache-control': 'no-cache' };

const STRONG = [
  'roxor-gaming', 'roxor', 'ultimate-video-poker', 'Ultimate Video Poker',
  'WAGER_BET', 'Jotas o Mejor', 'Jacks or Better', 'Jacks Or Better',
];
const SECONDARY = [
  'providerId', 'gameEngineID', 'gameEngineId', 'gameId', 'launch', 'launcher',
  'iframe', 'session', 'client', 'rules', 'help', 'howToPlay', 'paytable',
  'payTable', 'payout', 'Royal Flush', 'royal flush', 'progressive',
];

async function fetchText(url, accept = '*/*') {
  const r = await fetch(url, {
    headers: { ...baseHeaders, accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  const text = await r.text();
  return { r, text };
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function allOccurrences(text, needle, limit = 8) {
  const out = [];
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  let p = 0;
  while (out.length < limit) {
    const at = lower.indexOf(n, p);
    if (at < 0) break;
    out.push({ needle, index: at, context: text.slice(Math.max(0, at - 900), Math.min(text.length, at + 1500)) });
    p = at + n.length;
  }
  return out;
}

function extractUrls(text) {
  const urls = [];
  for (const m of text.matchAll(/https?:\\?\/?\\?\/?[^"'<>\s)]+/g)) {
    const value = m[0].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
    if (/roxor|gaming|game|launch|client|iframe|help|rule|paytable|payout|session/i.test(value)) urls.push(value.slice(0, 700));
  }
  return [...new Set(urls)].slice(0, 200);
}

function extractKeyValues(text) {
  const out = [];
  const re = /(?:providerId|gameEngineID|gameEngineId|gameId|clientId|profile|customer|launchUrl|launcherUrl|iframeUrl|sessionUrl|rulesUrl|helpUrl|paytableUrl)\s*[:=]\s*["']([^"']{1,260})["']/gi;
  for (const m of text.matchAll(re)) out.push({ key: m[0].split(/[:=]/)[0].trim(), value: m[1] });
  return out;
}

const { r: pageRes, text: html } = await fetchText(PAGE, 'text/html,*/*');
if (!pageRes.ok) throw new Error(`PAGE_HTTP_${pageRes.status}`);

const pageScripts = [...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => new URL(m[1], PAGE).href))]
  .filter((u) => u.startsWith(`${ORIGIN}/`));
const runtimeUrl = pageScripts.find((u) => /\/runtime\.[a-f0-9]+\.js/i.test(u));
if (!runtimeUrl) throw new Error('RUNTIME_NOT_FOUND_ON_PAGE');

const { r: runtimeRes, text: runtime } = await fetchText(runtimeUrl, 'application/javascript,*/*');
if (!runtimeRes.ok) throw new Error(`RUNTIME_HTTP_${runtimeRes.status}`);

const pairs = [];
for (const m of runtime.matchAll(/(\d+):["']([^"']+)["']/g)) pairs.push({ id: m[1], value: m[2] });
const names = new Map();
const hashes = new Map();
for (const p of pairs) {
  if (/^[a-f0-9]{16,40}$/i.test(p.value)) hashes.set(p.id, p.value);
  else if (/[A-Za-z]/.test(p.value)) names.set(p.id, p.value);
}
const runtimeChunks = [];
for (const [id, name] of names) {
  const hash = hashes.get(id);
  if (!hash || !/^[a-z0-9~_.-]+$/i.test(name)) continue;
  runtimeChunks.push({ id, name, url: `${ORIGIN}/es/${name}.${hash}.js`, source: 'runtime-manifest' });
}
const uniqChunks = [...new Map(runtimeChunks.map((x) => [x.url, x])).values()];
if (!uniqChunks.length) throw new Error('RUNTIME_MANIFEST_PARSE_EMPTY');

const targets = [...new Map([
  ...pageScripts.map((url, i) => [url, { id: `page-${i}`, name: url.split('/').pop(), url, source: 'page-script' }]),
  ...uniqChunks.map((x) => [x.url, x]),
]).values()];

const hits = [];
const failures = [];
let fetchedSuccessfully = 0;
let cursor = 0;
async function worker() {
  while (true) {
    const i = cursor++;
    if (i >= targets.length) return;
    const t = targets[i];
    try {
      const { r, text } = await fetchText(t.url, 'application/javascript,*/*');
      if (!r.ok) {
        failures.push({ id: t.id, name: t.name, url: t.url, httpStatus: r.status, error: `HTTP_${r.status}` });
        continue;
      }
      fetchedSuccessfully++;
      const strongHits = STRONG.filter((n) => text.toLowerCase().includes(n.toLowerCase()));
      const hasProviderLaunchArchitecture = /providerId/i.test(text) && /(launch|iframe|session|gameEngineID|gameEngineId)/i.test(text);
      if (!strongHits.length && !hasProviderLaunchArchitecture) continue;

      const secondaryHits = SECONDARY.filter((n) => text.toLowerCase().includes(n.toLowerCase()));
      const contexts = [];
      for (const n of [...strongHits, ...secondaryHits].slice(0, 18)) contexts.push(...allOccurrences(text, n, 4));
      const focusedText = contexts.map((x) => x.context).join('\n');
      hits.push({
        ...t,
        httpStatus: r.status,
        bytes: text.length,
        sha256: sha256(text),
        strongHits,
        secondaryHits,
        hasProviderLaunchArchitecture,
        urls: extractUrls(focusedText),
        keyValues: extractKeyValues(focusedText),
        contexts: contexts.slice(0, 40),
      });
    } catch (e) {
      failures.push({ id: t.id, name: t.name, url: t.url, httpStatus: null, error: String(e?.name || e?.message || e) });
    }
  }
}
await Promise.all(Array.from({ length: 12 }, () => worker()));

const coveragePct = +(100 * fetchedSuccessfully / targets.length).toFixed(3);
const providerSpecificHits = hits.filter((h) => h.strongHits.some((x) => /roxor/i.test(x)));
const gameSpecificHits = hits.filter((h) => h.strongHits.some((x) => /ultimate.video.poker|WAGER_BET|Jotas o Mejor|Jacks or Better/i.test(x)));
const launcherArchitectureHits = hits.filter((h) => h.hasProviderLaunchArchitecture);
const allUrls = [...new Set(hits.flatMap((h) => h.urls || []))];
const allKeyValues = [...new Map(hits.flatMap((h) => (h.keyValues || []).map((kv) => [`${kv.key}|${kv.value}`, kv])).values())];
const launchUrlCandidates = allUrls.filter((u) => /launch|iframe|session|client|game/i.test(u));
const helpOrRulesUrlCandidates = allUrls.filter((u) => /help|rule|paytable|payout/i.test(u));

const out = {
  version: 'botemania-roxor-ultimate-video-poker-launcher-scan-v1',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  target: {
    game: 'Ultimate Video Poker',
    variant: 'Jotas o Mejor Progresivo',
    providerId: 'roxor-gaming',
    monitorKey: 'generic:WAGER_BET',
    page: PAGE,
  },
  page: { url: PAGE, httpStatus: pageRes.status, bytes: html.length, sha256: sha256(html), scriptsDiscovered: pageScripts.length },
  runtime: { url: runtimeUrl, httpStatus: runtimeRes.status, bytes: runtime.length, sha256: sha256(runtime), chunksDiscovered: uniqChunks.length },
  coverage: {
    targets: targets.length,
    fetchedSuccessfully,
    fetchFailureCount: failures.length,
    fetchCoveragePct: coveragePct,
    scanComplete: fetchedSuccessfully === targets.length,
    failures: failures.slice(0, 100),
  },
  hits,
  extracted: {
    providerSpecificHitChunks: providerSpecificHits.map((h) => h.name),
    gameSpecificHitChunks: gameSpecificHits.map((h) => h.name),
    launcherArchitectureHitChunks: launcherArchitectureHits.map((h) => h.name),
    keyValues: allKeyValues.slice(0, 300),
    launchUrlCandidates: launchUrlCandidates.slice(0, 100),
    helpOrRulesUrlCandidates: helpOrRulesUrlCandidates.slice(0, 100),
  },
  decision: {
    providerSpecificReferenceFound: providerSpecificHits.length > 0,
    gameSpecificReferenceFound: gameSpecificHits.length > 0,
    genericLauncherArchitectureFound: launcherArchitectureHits.length > 0,
    launchUrlCandidateRecovered: launchUrlCandidates.length > 0,
    helpOrRulesAssetCandidateRecovered: helpOrRulesUrlCandidates.length > 0,
    exactLaunchRequestRecovered: false,
    exactPaytableRecovered: false,
    pRoyalFlushRecovered: false,
    safeReadOnlyFollowup: true,
    realMoneyAllowed: false,
  },
  guards: {
    publicPageAndStaticBundlesOnly: true,
    sameOperatorHostForScannedBundles: true,
    noAuthentication: true,
    noCookies: true,
    noGraphqlIntrospection: true,
    noMutation: true,
    noBetting: true,
    noAutoPromotionFromStringHit: true,
    realMoneyAllowed: false,
  },
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ coverage: out.coverage, extracted: out.extracted, decision: out.decision }, null, 2));
