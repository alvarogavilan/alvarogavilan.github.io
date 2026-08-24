#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN = 'https://www.botemania.es';
const PAGE = `${ORIGIN}/juegos/casino-online/ultimate-video-poker`;
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-roxor-launch-lineage-probe-v3.json';
const UA = 'loterias-ai-roxor-launch-lineage-probe/3.0';
const headers = { 'user-agent': UA, 'cache-control': 'no-cache' };
const startedAt = Date.now();
const WALL_CLOCK_MS = 7 * 60 * 1000;

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
function progress(msg) {
  console.error(`[${((Date.now() - startedAt) / 1000).toFixed(1)}s] ${msg}`);
}
async function fetchText(url, accept = '*/*') {
  const r = await fetch(url, {
    headers: { ...headers, accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  });
  return { r, text: await r.text() };
}
function uniqueBy(items, keyFn) {
  return [...new Map(items.map((x) => [keyFn(x), x])).values()];
}
function contexts(text, needle, { left = 1800, right = 2800, limit = 8 } = {}) {
  const out = [];
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  let from = 0;
  while (out.length < limit) {
    const i = lower.indexOf(n, from);
    if (i < 0) break;
    out.push({
      needle,
      index: i,
      context: text.slice(Math.max(0, i - left), Math.min(text.length, i + n.length + right)),
    });
    from = i + n.length;
  }
  return out;
}
function extractStringLiterals(text, limit = 2000) {
  const out = [];
  const re = /(["'])([^"'\\]{1,500}(?:\\.[^"'\\]{0,500})*)\1/g;
  for (const m of text.matchAll(re)) {
    const s = m[2].replace(/\\\//g, '/');
    if (!/(online-games|launch|play|game|casino|session|iframe|provider|request\/player|graphql)/i.test(s)) continue;
    out.push(s.slice(0, 1000));
    if (out.length >= limit) break;
  }
  return [...new Set(out)];
}
function scoreContext(context) {
  const s = context.toLowerCase();
  let score = 0;
  if (s.includes('/online-games/')) score += 5;
  if (/launchgame|gamelaunch|startgame|opengame|launchurl|gameurl|playurl/.test(s)) score += 5;
  if (/fetch\s*\(|axios|\.post\s*\(|\.get\s*\(|xmlhttprequest|graphql request/.test(s)) score += 3;
  if (/gameid|resourceid|providerid/.test(s)) score += 2;
  if (/session|token|iframe/.test(s)) score += 2;
  if (/concat\(|new url\(|href\s*:|src\s*:/.test(s)) score += 1;
  if (/registration|registerurl|customregistrationurl/.test(s) && !/online-games|launchgame|gamelaunch|startgame|opengame/.test(s)) score -= 4;
  if (/more epic games worth playing/.test(s)) score -= 8;
  return score;
}
function candidateClass(context) {
  const s = context.toLowerCase();
  if (/registration|customregistrationurl|registerurl/.test(s) && !/online-games|launchgame|gamelaunch|startgame|opengame/.test(s)) return 'registration-or-marketing';
  if (/more epic games worth playing/.test(s)) return 'marketing-copy-false-positive';
  if (/fetch\s*\(|axios|\.post\s*\(|\.get\s*\(|xmlhttprequest|graphql request/.test(s)) return 'network-producer-candidate';
  if (/online-games|launchgame|gamelaunch|startgame|opengame|launchurl|gameurl|playurl/.test(s)) return 'route-or-launch-construction-candidate';
  return 'reference-only';
}

progress(`fetch page ${PAGE}`);
const { r: pageResp, text: html } = await fetchText(PAGE, 'text/html,*/*');
if (!pageResp.ok) throw new Error(`PAGE_HTTP_${pageResp.status}`);
const pageScripts = [...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => new URL(m[1], pageResp.url).href))];
if (!pageScripts.length) throw new Error('NO_PAGE_SCRIPTS');
const runtimeUrl = pageScripts.find((u) => /\/runtime\.[a-f0-9]+\.js(?:\?|$)/i.test(u));
if (!runtimeUrl) throw new Error('RUNTIME_NOT_FOUND');
progress(`page scripts=${pageScripts.length}; runtime=${runtimeUrl}`);

const { r: runtimeResp, text: runtime } = await fetchText(runtimeUrl, 'application/javascript,*/*');
if (!runtimeResp.ok) throw new Error(`RUNTIME_HTTP_${runtimeResp.status}`);
const pairs = [];
for (const m of runtime.matchAll(/(\d+):["']([^"']+)["']/g)) pairs.push({ id: m[1], value: m[2] });
const names = new Map();
const hashes = new Map();
for (const p of pairs) {
  if (/^[a-f0-9]{16,40}$/i.test(p.value)) hashes.set(p.id, p.value);
  else if (/[A-Za-z]/.test(p.value)) names.set(p.id, p.value);
}
const manifest = uniqueBy([...names].map(([id, name]) => ({ id, name, hash: hashes.get(id) })).filter((x) => x.hash && /^[a-z0-9~_.-]+$/i.test(x.name)).map((x) => ({ ...x, url: `${ORIGIN}/es/${x.name}.${x.hash}.js` })), (x) => x.url);
if (!manifest.length) throw new Error('RUNTIME_MANIFEST_PARSE_EMPTY');

const HIGH_SIGNAL_NAME = /(GameHero|GameTile|GameContent|GamesPage|GameCarousel|RedirectModal|SessionCookie|GameLaunch|LaunchGame|GamePlayer|GameFrame|GameModal|PlayGame|CasinoGame|PlayerGame|PostPage)/i;
const EXCLUDE_NAME = /(?:styles?|theme|svg|icon|image|vendors~)/i;
let directedChunks = manifest.filter((x) => HIGH_SIGNAL_NAME.test(x.name) && !EXCLUDE_NAME.test(x.name));
directedChunks = directedChunks.slice(0, 60);

const pageLoadedHighSignal = pageScripts.filter((u) => /(client\.|PostPage\.|GameHero\.|GameTile\.|GameContent\.|GamesPage\.|GameCarousel\.|RedirectModal\.|SessionCookie\.)/i.test(u)).map((url) => ({ id: null, name: new URL(url).pathname.split('/').pop() || url, hash: null, url, pageLoaded: true }));
const targets = uniqueBy([...pageLoadedHighSignal, ...directedChunks], (x) => x.url);
if (!targets.length) throw new Error('NO_DIRECTED_TARGETS');
progress(`manifest=${manifest.length}; directed targets=${targets.length}`);

const exactNeedles = [
  '/online-games/', 'launchGame', 'gameLaunch', 'startGame', 'openGame', 'launchUrl', 'gameUrl', 'playUrl',
  'realPlay', 'funPlay', 'iframe', 'sessionToken', 'gameSession', 'request/player', 'providerId', 'gameId', 'resourceId',
];
const fetchFailures = [];
const files = [];
const candidates = [];
let fetched = 0;
let next = 0;
async function worker() {
  while (next < targets.length) {
    if (Date.now() - startedAt > WALL_CLOCK_MS) return;
    const t = targets[next++];
    try {
      const { r, text } = await fetchText(t.url, 'application/javascript,text/javascript,*/*');
      if (!r.ok) {
        fetchFailures.push({ ...t, httpStatus: r.status, error: `HTTP_${r.status}` });
        continue;
      }
      fetched++;
      const markerHits = [];
      for (const needle of exactNeedles) {
        if (!text.toLowerCase().includes(needle.toLowerCase())) continue;
        for (const hit of contexts(text, needle)) {
          const score = scoreContext(hit.context);
          const classification = candidateClass(hit.context);
          const row = { scriptUrl: t.url, scriptName: t.name, needle, score, classification, index: hit.index, context: hit.context };
          markerHits.push(row);
          candidates.push(row);
        }
      }
      const literals = extractStringLiterals(text).filter((s) => /(online-games|launch|play|session|iframe|request\/player)/i.test(s)).slice(0, 300);
      files.push({
        id: t.id,
        name: t.name,
        url: t.url,
        pageLoaded: !!t.pageLoaded,
        httpStatus: r.status,
        bytes: text.length,
        sha256: sha(text),
        markerHitCount: markerHits.length,
        stringLiteralCandidates: literals,
      });
    } catch (e) {
      fetchFailures.push({ ...t, httpStatus: null, error: String(e?.name || e?.message || e) });
    }
  }
}
await Promise.all(Array.from({ length: Math.min(6, targets.length) }, () => worker()));

const ranked = uniqueBy(candidates.sort((a, b) => b.score - a.score), (x) => `${x.scriptUrl}|${x.index}|${x.needle}`).slice(0, 120);
const networkProducerCandidates = ranked.filter((x) => x.classification === 'network-producer-candidate' && x.score >= 6);
const routeCandidates = ranked.filter((x) => x.classification === 'route-or-launch-construction-candidate' && x.score >= 5);
const onlineGamesContexts = ranked.filter((x) => x.needle === '/online-games/');
const targetSpecificContexts = ranked.filter((x) => /roxor|ultimate.?video.?poker|wager_bet|jotas.?o.?mejor/i.test(x.context));
const exactProviderAssetUrls = uniqueBy(files.flatMap((f) => f.stringLiteralCandidates.map((value) => ({ scriptUrl: f.url, value }))).filter((x) => /roxor|wager_bet|ultimate.?video.?poker/i.test(x.value) && /^https?:/i.test(x.value)), (x) => x.value);
const boundedComplete = fetched + fetchFailures.length === targets.length && Date.now() - startedAt <= WALL_CLOCK_MS;

const out = {
  version: 'botemania-roxor-launch-lineage-probe-v3',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  target: { game: 'Ultimate Video Poker', variant: 'Jotas o Mejor Progresivo', providerId: 'roxor-gaming', monitorKey: 'generic:WAGER_BET', page: PAGE },
  coverage: {
    pageHttpStatus: pageResp.status,
    pageBytes: html.length,
    pageSha256: sha(html),
    runtimeUrl,
    runtimeHttpStatus: runtimeResp.status,
    runtimeBytes: runtime.length,
    runtimeSha256: sha(runtime),
    manifestChunksDiscovered: manifest.length,
    directedTargets: targets.length,
    targetsFetchedSuccessfully: fetched,
    fetchFailureCount: fetchFailures.length,
    boundedScanComplete: boundedComplete,
    wallClockBudgetExceeded: Date.now() - startedAt > WALL_CLOCK_MS,
    fetchFailures,
  },
  targeting: {
    strategy: 'runtime-manifest-directed-launch-and-game-components-only',
    maxDynamicChunks: 60,
    noGlobalChunkRescan: true,
    targetNames: targets.map((x) => x.name),
  },
  files,
  extracted: {
    rankedCandidateCount: ranked.length,
    rankedCandidates: ranked,
    networkProducerCandidateCount: networkProducerCandidates.length,
    networkProducerCandidates,
    routeOrLaunchConstructionCandidateCount: routeCandidates.length,
    routeOrLaunchConstructionCandidates: routeCandidates,
    onlineGamesContextCount: onlineGamesContexts.length,
    onlineGamesContexts,
    targetSpecificContextCount: targetSpecificContexts.length,
    targetSpecificContexts,
    exactProviderAssetUrlCount: exactProviderAssetUrls.length,
    exactProviderAssetUrls,
  },
  decision: {
    publicGameHeroLaunchPathRejectedAsRegistrationOnly: ranked.some((x) => x.classification === 'registration-or-marketing'),
    genericOnlineGamesRouteLocated: onlineGamesContexts.length > 0,
    genericLaunchConstructionLocated: routeCandidates.length > 0,
    launchRequestProducerCandidateFound: networkProducerCandidates.length > 0,
    targetSpecificLaunchReferenceFound: targetSpecificContexts.length > 0,
    exactRoxorLaunchRequestRecovered: false,
    exactLaunchEndpointVerified: false,
    providerAssetHostVerified: exactProviderAssetUrls.length > 0,
    helpOrPaytableAssetRecovered: false,
    exactSpainPaytableRecovered: false,
    negativeResultInterpretableAsDirectedScan: boundedComplete,
    realMoneyAllowed: false,
  },
  guards: {
    publicStaticAssetsOnly: true,
    noAuthentication: true,
    noCookies: true,
    noPrivateTokens: true,
    noGraphqlIntrospection: true,
    noMutation: true,
    noLaunchRequestExecuted: true,
    noProviderRequestExecuted: true,
    noBetting: true,
    noAutoPromotionFromKeywordHit: true,
    realMoneyAllowed: false,
  },
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  coverage: out.coverage,
  targeting: out.targeting,
  counts: {
    rankedCandidateCount: out.extracted.rankedCandidateCount,
    networkProducerCandidateCount: out.extracted.networkProducerCandidateCount,
    routeOrLaunchConstructionCandidateCount: out.extracted.routeOrLaunchConstructionCandidateCount,
    onlineGamesContextCount: out.extracted.onlineGamesContextCount,
    targetSpecificContextCount: out.extracted.targetSpecificContextCount,
    exactProviderAssetUrlCount: out.extracted.exactProviderAssetUrlCount,
  },
  topCandidates: out.extracted.rankedCandidates.slice(0, 15).map((x) => ({ scriptName: x.scriptName, needle: x.needle, score: x.score, classification: x.classification, context: x.context.slice(0, 1200) })),
  decision: out.decision,
}, null, 2));
