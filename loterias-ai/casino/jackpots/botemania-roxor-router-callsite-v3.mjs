#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN = 'https://www.botemania.es';
const PAGE = `${ORIGIN}/juegos/casino-online/ultimate-video-poker`;
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-roxor-router-callsite-v3.json';
const UA = 'loterias-ai-roxor-router-callsite-v3/1.0';
const headers = { 'user-agent': UA, 'cache-control': 'no-cache' };

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const clip = (s, n = 9000) => String(s || '').slice(0, n);

async function fetchText(url, accept = '*/*') {
  const r = await fetch(url, {
    headers: { ...headers, accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
  return { r, text: await r.text() };
}

function contexts(text, re, before = 1800, after = 2600, limit = 20) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) && out.length < limit) {
    const index = m.index;
    out.push({ match: clip(m[0], 600), index, context: text.slice(Math.max(0, index - before), Math.min(text.length, index + after)) });
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

function moduleAt(text, index) {
  const re = /(?:^|,)(\d+):function\([^)]*\)\{/g;
  let last = null;
  let m;
  while ((m = re.exec(text)) && m.index <= index) last = { id: m[1], start: m.index + (m[0].startsWith(',') ? 1 : 0) };
  if (!last) return null;
  re.lastIndex = last.start + 1;
  const next = re.exec(text);
  const end = next ? next.index : text.length;
  const body = text.slice(last.start, end);
  const imports = {};
  for (const x of body.matchAll(/([A-Za-z_$][\w$]*)=n\((\d+)\)/g)) imports[x[1]] = x[2];
  for (const x of body.matchAll(/([A-Za-z_$][\w$]*)=[A-Za-z_$][\w$]*\(n\((\d+)\)\)/g)) imports[x[1]] = x[2];
  const nav = body.match(/createElement\(([A-Za-z_$][\w$]*)\.default,\{to:[\s\S]{0,1800}?isGame:!0/);
  return {
    id: last.id,
    start: last.start,
    end,
    bytes: body.length,
    imports,
    navigationSymbol: nav?.[1] || null,
    bodyPreview: clip(body, 14000),
  };
}

function moduleById(text, id) {
  if (!id) return null;
  const re = new RegExp(`(?:^|,)${id}:function\\([^)]*\\)\\{`, 'g');
  const m = re.exec(text);
  if (!m) return null;
  const start = m.index + (m[0].startsWith(',') ? 1 : 0);
  const nextRe = /,(\d+):function\([^)]*\)\{/g;
  nextRe.lastIndex = start + 1;
  const next = nextRe.exec(text);
  const end = next ? next.index : text.length;
  const body = text.slice(start, end);
  return { id: String(id), start, end, bytes: body.length, bodyPreview: clip(body, 18000) };
}

const { r: pageRes, text: html } = await fetchText(PAGE, 'text/html,*/*');
if (!pageRes.ok) throw new Error(`PAGE_HTTP_${pageRes.status}`);
const pageScripts = [...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => new URL(m[1], PAGE).href))]
  .filter(u => u.startsWith(`${ORIGIN}/`));
const runtimeUrl = pageScripts.find(u => /\/runtime\.[a-f0-9]+\.js/i.test(u));
if (!runtimeUrl) throw new Error('RUNTIME_NOT_FOUND');
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
const targets = [...new Map([
  ...pageScripts.map((url, i) => [url, { id: `page-${i}`, name: url.split('/').pop(), url, source: 'page-script' }]),
  ...runtimeChunks.map(x => [x.url, x]),
]).values()];

const fetched = [];
const failures = [];
let cursor = 0;
async function worker() {
  while (true) {
    const i = cursor++;
    if (i >= targets.length) return;
    const t = targets[i];
    try {
      const { r, text } = await fetchText(t.url, 'application/javascript,*/*');
      if (!r.ok) { failures.push({ ...t, httpStatus: r.status, error: `HTTP_${r.status}` }); continue; }
      fetched.push({ ...t, httpStatus: r.status, bytes: text.length, sha256: sha256(text), text });
    } catch (e) {
      failures.push({ ...t, httpStatus: null, error: String(e?.name || e?.message || e) });
    }
  }
}
await Promise.all(Array.from({ length: 12 }, () => worker()));

const producerRe = /isGame\s*:\s*!0|isGame\s*:\s*true/g;
const consumerRe = /(?:location|state|useLocation)[\s\S]{0,500}?isGame|isGame[\s\S]{0,500}?(?:location|state|useLocation)/g;
const producerHits = [];
const consumerHits = [];
for (const f of fetched) {
  const ps = contexts(f.text, producerRe, 2600, 4000, 30);
  for (const p of ps) {
    const mod = moduleAt(f.text, p.index);
    producerHits.push({ file: { name: f.name, url: f.url, sha256: f.sha256 }, ...p, module: mod });
  }
  const cs = contexts(f.text, consumerRe, 2600, 4000, 30);
  for (const c of cs) {
    if (/VariableDefinition|NamedType|contentfulGame\(gameId/i.test(c.context) && !/t\.state|location\.state|useLocation\(/i.test(c.context)) continue;
    consumerHits.push({ file: { name: f.name, url: f.url, sha256: f.sha256 }, ...c, module: moduleAt(f.text, c.index) });
  }
}

const gameTileProducer = producerHits.find(h => /GameTile|gameTile|data-game-id|StyledGameTile/i.test(h.context)) || null;
const navigationSymbol = gameTileProducer?.module?.navigationSymbol || null;
const navigationModuleId = navigationSymbol ? gameTileProducer?.module?.imports?.[navigationSymbol] || null : null;
let navigationModule = null;
if (navigationModuleId) {
  for (const f of fetched) {
    const mod = moduleById(f.text, navigationModuleId);
    if (!mod) continue;
    navigationModule = {
      file: { name: f.name, url: f.url, sha256: f.sha256 },
      ...mod,
      stateContexts: contexts(mod.bodyPreview, /isGame|state|history|location|to:/g, 900, 1800, 20),
    };
    if (/isGame/i.test(mod.bodyPreview)) break;
  }
}

const navText = navigationModule?.bodyPreview || '';
const bridgeEvidence = {
  gameTileProducerFound: !!gameTileProducer,
  producerHasComputedGameRoute: !!gameTileProducer && /homePageUrl[\s\S]{0,1200}?categoryId[\s\S]{0,1200}?\.id/i.test(gameTileProducer.context),
  producerPassesIsGameTrue: !!gameTileProducer && /isGame\s*:\s*!0|isGame\s*:\s*true/i.test(gameTileProducer.context),
  navigationSymbol,
  navigationModuleId,
  navigationModuleRecovered: !!navigationModule,
  navigationModuleMentionsIsGame: /isGame/i.test(navText),
  navigationModuleMentionsState: /state/i.test(navText),
  navigationModuleMentionsLocationOrHistory: /location|history/i.test(navText),
  consumerReadsLocationStateIsGame: consumerHits.some(h => /\.state[\s\S]{0,180}?isGame|isGame[\s\S]{0,180}?\.state/i.test(h.context)),
  consumerFeedsGraphqlIsGame: consumerHits.some(h => /variables[\s\S]{0,1600}?isGame/i.test(h.context)),
};
bridgeEvidence.endToEndRouterBridgeRecovered = bridgeEvidence.gameTileProducerFound && bridgeEvidence.producerPassesIsGameTrue && bridgeEvidence.consumerReadsLocationStateIsGame;

const out = {
  version: 'botemania-roxor-router-callsite-v3',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  target: { game: 'Ultimate Video Poker', providerId: 'roxor-gaming', page: PAGE },
  page: { httpStatus: pageRes.status, bytes: html.length, sha256: sha256(html), scriptsDiscovered: pageScripts.length },
  runtime: { url: runtimeUrl, httpStatus: runtimeRes.status, bytes: runtime.length, sha256: sha256(runtime), chunksDiscovered: runtimeChunks.length },
  coverage: { targets: targets.length, fetchedSuccessfully: fetched.length, fetchFailureCount: failures.length, scanComplete: fetched.length === targets.length, failures: failures.slice(0, 100) },
  producerHits: producerHits.slice(0, 40),
  consumerHits: consumerHits.slice(0, 40),
  gameTileProducer,
  navigationModule,
  bridgeEvidence,
  decision: {
    exactGameTileRouterCallsiteRecovered: bridgeEvidence.gameTileProducerFound && bridgeEvidence.producerPassesIsGameTrue,
    exactRouterStateConsumerRecovered: bridgeEvidence.consumerReadsLocationStateIsGame,
    endToEndRouterBridgeRecovered: bridgeEvidence.endToEndRouterBridgeRecovered,
    exactProviderSessionRequestRecovered: false,
    safeStaticFollowupOnly: true,
    realMoneyAllowed: false,
  },
  guards: {
    publicHtmlAndStaticBundlesOnly: true,
    noAuthentication: true,
    noCookies: true,
    noGraphqlRequest: true,
    noMutation: true,
    noSessionCreation: true,
    noGameLaunch: true,
    noBetting: true,
    realMoneyAllowed: false,
  },
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ coverage: out.coverage, bridgeEvidence: out.bridgeEvidence, decision: out.decision, guards: out.guards }, null, 2));
