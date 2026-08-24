#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const ORIGIN = 'https://www.botemania.es';
const TARGET_PAGE = `${ORIGIN}/juegos/casino-online/ultimate-video-poker`;
const CATEGORY_PAGE = `${ORIGIN}/juegos/casino-online`;
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-roxor-launch-producer-probe-v3.json';
const UA = 'loterias-ai-roxor-launch-producer-probe/3.0';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_TARGET_SCRIPTS = 24;

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function fetchText(url, accept = '*/*') {
  const r = await fetch(url, {
    headers: { 'user-agent': UA, accept, 'cache-control': 'no-cache' },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const text = await r.text();
  return { r, text };
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function scriptUrlsFromHtml(html, base) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    try { out.push(new URL(m[1], base).href); } catch {}
  }
  return unique(out);
}

function boundedContexts(text, needles, { before = 900, after = 1800, perNeedle = 8 } = {}) {
  const out = [];
  const lower = text.toLowerCase();
  for (const needle of needles) {
    const n = needle.toLowerCase();
    let from = 0;
    let count = 0;
    while (count < perNeedle) {
      const i = lower.indexOf(n, from);
      if (i < 0) break;
      out.push({ needle, index: i, context: text.slice(Math.max(0, i - before), Math.min(text.length, i + n.length + after)) });
      from = i + n.length;
      count += 1;
    }
  }
  return out;
}

const REGISTRATION_RE = /(?:\/register\b|registration\b|onboarding\/register|join now|reg[ií]strate)/i;
const GAME_ID_RE = /(?:game\s*\.?\s*id|gameId|resourceId|providerId|casinoGame|gameTile|gameSlug|gameName)/i;
const ACTION_RE = /(?:onClick|fetch\s*\(|axios|XMLHttpRequest|window\.open|location\.(?:assign|replace)|location\.href|openGame|playGame|startGame|launchGame|request\/player|\/online-games\/)/i;
const TRANSPORT_RE = /(?:fetch\s*\(|axios|XMLHttpRequest|request\/player|window\.open|location\.(?:assign|replace)|location\.href)/i;
const TARGET_RE = /(?:ultimate-video-poker|roxor-gaming|\broxor\b|WAGER_BET|jotas o mejor progresivo)/i;

function classifyCallsite(context) {
  const registration = REGISTRATION_RE.test(context);
  const hasGameIdentity = GAME_ID_RE.test(context);
  const hasAction = ACTION_RE.test(context);
  const hasTransport = TRANSPORT_RE.test(context);
  const targetSpecific = TARGET_RE.test(context);
  const playerGameAction = !registration && hasGameIdentity && hasAction;
  return { registration, hasGameIdentity, hasAction, hasTransport, targetSpecific, playerGameAction };
}

function extractStringCandidates(text, baseUrl) {
  const candidates = [];
  for (const m of text.matchAll(/["'`]([^"'`\r\n]{2,320})["'`]/g)) {
    const raw = m[1].replace(/\\\//g, '/');
    if (!/(?:game|play|launch|session|casino|request\/player|online-games|provider)/i.test(raw)) continue;
    const registration = REGISTRATION_RE.test(raw);
    let resolved = null;
    if (/^(?:https?:\/\/|\/)/i.test(raw)) {
      try { resolved = new URL(raw, baseUrl).href; } catch {}
    }
    candidates.push({ raw, resolved, registration });
    if (candidates.length >= 600) break;
  }
  return [...new Map(candidates.map((x) => [`${x.raw}|${x.resolved || ''}`, x])).values()];
}

function targetScriptScore(url) {
  const name = url.split('/').pop() || '';
  let score = 0;
  if (/GameTile/i.test(name)) score += 100;
  if (/GamesRow|GameCarousel/i.test(name)) score += 60;
  if (/PostPage/i.test(name)) score += 15;
  if (/client\./i.test(name)) score += 10;
  if (/runtime\./i.test(name)) score += 8;
  if (/RedirectModal|CallToAction|GameHero/i.test(name)) score -= 25;
  return score;
}

function discoverNamedJsReferences(text, baseUrl) {
  const names = ['GameTile', 'GamesRow', 'GameCarousel'];
  const out = [];
  for (const name of names) {
    let from = 0;
    while (out.length < 100) {
      const i = text.indexOf(name, from);
      if (i < 0) break;
      const start = Math.max(0, i - 350);
      const end = Math.min(text.length, i + 650);
      const window = text.slice(start, end);
      for (const m of window.matchAll(/["'`]([^"'`\r\n]{1,260}\.js(?:\?[^"'`\r\n]*)?)["'`]/g)) {
        try {
          const u = new URL(m[1].replace(/\\\//g, '/'), baseUrl).href;
          if (/GameTile|GamesRow|GameCarousel/i.test(u)) out.push(u);
        } catch {}
      }
      from = i + name.length;
    }
  }
  return unique(out);
}

function runSelfTest() {
  const registration = 'createElement("a",{href:"/register"},"REGÍSTRATE")';
  const player = 'function play(game){return fetch("/request/player/game/start",{method:"POST",body:JSON.stringify({gameId:game.id,providerId:game.providerId})})}';
  const target = 'fetch("/request/player/game/start",{body:JSON.stringify({gameId:"ultimate-video-poker",providerId:"roxor-gaming"})})';
  assert.equal(classifyCallsite(registration).playerGameAction, false);
  assert.equal(classifyCallsite(registration).registration, true);
  assert.equal(classifyCallsite(player).playerGameAction, true);
  assert.equal(classifyCallsite(player).hasTransport, true);
  assert.equal(classifyCallsite(target).targetSpecific, true);
  assert.equal(extractStringCandidates(registration, ORIGIN).every((x) => x.registration), true);
  console.log(JSON.stringify({ selfTest: 'PASS', registrationExcluded: true, playerActionDetected: true, targetSpecificDetected: true }, null, 2));
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

const pageResults = [];
for (const url of [TARGET_PAGE, CATEGORY_PAGE]) {
  try {
    const { r, text } = await fetchText(url, 'text/html,*/*');
    pageResults.push({ url, httpStatus: r.status, finalUrl: r.url, bytes: text.length, sha256: sha256(text), html: text, scriptUrls: scriptUrlsFromHtml(text, r.url) });
  } catch (e) {
    pageResults.push({ url, httpStatus: null, error: String(e?.name || e?.message || e), html: '', scriptUrls: [] });
  }
}

const allPageScripts = unique(pageResults.flatMap((p) => p.scriptUrls));
const directTargets = allPageScripts
  .map((url) => ({ url, score: targetScriptScore(url) }))
  .filter((x) => x.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, MAX_TARGET_SCRIPTS)
  .map((x) => x.url);

const seedScripts = unique([
  ...directTargets,
  ...allPageScripts.filter((u) => /(?:client\.|runtime\.)/i.test(u)).slice(0, 4),
]).slice(0, MAX_TARGET_SCRIPTS);

const fetched = [];
const failures = [];
const discoveredNamedAssets = [];
for (const url of seedScripts) {
  try {
    const { r, text } = await fetchText(url, 'application/javascript,text/javascript,*/*');
    if (!r.ok) {
      failures.push({ url, httpStatus: r.status, error: `HTTP_${r.status}` });
      continue;
    }
    fetched.push({ url, httpStatus: r.status, bytes: text.length, sha256: sha256(text), text, source: 'page-or-seed' });
    discoveredNamedAssets.push(...discoverNamedJsReferences(text, url));
  } catch (e) {
    failures.push({ url, httpStatus: null, error: String(e?.name || e?.message || e) });
  }
}

for (const url of unique(discoveredNamedAssets).filter((u) => !fetched.some((f) => f.url === u)).slice(0, 8)) {
  try {
    const { r, text } = await fetchText(url, 'application/javascript,text/javascript,*/*');
    if (!r.ok) {
      failures.push({ url, httpStatus: r.status, error: `HTTP_${r.status}` });
      continue;
    }
    fetched.push({ url, httpStatus: r.status, bytes: text.length, sha256: sha256(text), text, source: 'named-asset-discovery' });
  } catch (e) {
    failures.push({ url, httpStatus: null, error: String(e?.name || e?.message || e) });
  }
}

const needles = [
  'gameId', 'game.id', 'providerId', 'resourceId', 'gameTile', 'onClick', 'openGame', 'playGame', 'startGame',
  'launchGame', 'window.open', 'location.href', 'location.assign', 'fetch(', 'XMLHttpRequest', 'request/player', '/online-games/'
];
const registrationOnlyCallsites = [];
const playerGameActionCallsites = [];
const targetSpecificCandidates = [];
const endpointCandidates = [];
const fileSummaries = [];

for (const file of fetched) {
  const contexts = boundedContexts(file.text, needles);
  for (const hit of contexts) {
    const cls = classifyCallsite(hit.context);
    const record = { file: file.url, needle: hit.needle, index: hit.index, classification: cls, context: hit.context.slice(0, 5000) };
    if (cls.registration && (cls.hasAction || cls.hasGameIdentity)) registrationOnlyCallsites.push(record);
    if (cls.playerGameAction) playerGameActionCallsites.push(record);
    if (cls.targetSpecific) targetSpecificCandidates.push(record);
  }
  const strings = extractStringCandidates(file.text, file.url);
  for (const x of strings) {
    if (x.registration) continue;
    if (/(?:request\/player|game.*(?:start|launch|play)|(?:start|launch|play).*game|online-games)/i.test(x.raw)) {
      endpointCandidates.push({ file: file.url, ...x });
    }
  }
  fileSummaries.push({
    url: file.url,
    source: file.source,
    httpStatus: file.httpStatus,
    bytes: file.bytes,
    sha256: file.sha256,
    contextCount: contexts.length,
    stringCandidateCount: strings.length,
  });
}

const dedupRecords = (records) => [...new Map(records.map((x) => [`${x.file}|${x.index ?? ''}|${x.raw ?? ''}`, x])).values()];
const playerCalls = dedupRecords(playerGameActionCallsites);
const registrationCalls = dedupRecords(registrationOnlyCallsites);
const targets = dedupRecords(targetSpecificCandidates);
const endpoints = dedupRecords(endpointCandidates);
const exactTargetTransport = targets.filter((x) => x.classification?.playerGameAction && x.classification?.hasTransport);
const transportCalls = playerCalls.filter((x) => x.classification.hasTransport);

const output = {
  version: 'botemania-roxor-launch-producer-probe-v3',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  target: {
    game: 'Ultimate Video Poker',
    variant: 'Jotas o Mejor Progresivo',
    slug: 'ultimate-video-poker',
    providerId: 'roxor-gaming',
    monitorKey: 'generic:WAGER_BET',
  },
  pages: pageResults.map(({ html, scriptUrls, ...p }) => ({ ...p, scriptCount: scriptUrls.length })),
  discovery: {
    pageScriptCount: allPageScripts.length,
    seedScriptCount: seedScripts.length,
    seedScripts,
    namedAssetCandidates: unique(discoveredNamedAssets),
    fetchedScriptCount: fetched.length,
    fetchFailureCount: failures.length,
    failures,
    fileSummaries,
  },
  extracted: {
    registrationOnlyCallsiteCount: registrationCalls.length,
    registrationOnlyCallsites: registrationCalls.slice(0, 40),
    playerGameActionCallsiteCount: playerCalls.length,
    playerGameActionCallsites: playerCalls.slice(0, 80),
    transportCallsiteCount: transportCalls.length,
    transportCallsites: transportCalls.slice(0, 60),
    endpointCandidateCount: endpoints.length,
    endpointCandidates: endpoints.slice(0, 100),
    targetSpecificCandidateCount: targets.length,
    targetSpecificCandidates: targets.slice(0, 40),
  },
  decision: {
    seoRegistrationPathExcluded: true,
    actualPlayerGameCallsiteRecovered: playerCalls.length > 0,
    launchTransportRecovered: transportCalls.length > 0,
    launchEndpointRecovered: endpoints.length > 0 && transportCalls.length > 0,
    exactRoxorLaunchRequestRecovered: exactTargetTransport.length > 0,
    providerAssetHostVerified: false,
    helpOrPaytableAssetRecovered: false,
    exactSpainPaytableRecovered: false,
    rulesFingerprintVerified: false,
    realMoneyAllowed: false,
  },
  guards: {
    targetAndCategoryPagesOnly: true,
    noGlobalChunkScan: true,
    noAuthentication: true,
    noCookies: true,
    noGraphqlIntrospection: true,
    noMutationExecuted: true,
    noLaunchRequestExecuted: true,
    noBetting: true,
    registrationPathsNeverCountAsLaunch: true,
    realMoneyAllowed: false,
  },
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({
  pages: output.pages,
  discovery: {
    pageScriptCount: output.discovery.pageScriptCount,
    seedScriptCount: output.discovery.seedScriptCount,
    namedAssetCandidates: output.discovery.namedAssetCandidates,
    fetchedScriptCount: output.discovery.fetchedScriptCount,
    fetchFailureCount: output.discovery.fetchFailureCount,
  },
  counts: {
    registrationOnlyCallsiteCount: output.extracted.registrationOnlyCallsiteCount,
    playerGameActionCallsiteCount: output.extracted.playerGameActionCallsiteCount,
    transportCallsiteCount: output.extracted.transportCallsiteCount,
    endpointCandidateCount: output.extracted.endpointCandidateCount,
    targetSpecificCandidateCount: output.extracted.targetSpecificCandidateCount,
  },
  decision: output.decision,
  endpointCandidates: output.extracted.endpointCandidates.slice(0, 20),
  playerGameActionCallsites: output.extracted.playerGameActionCallsites.slice(0, 10).map((x) => ({ file: x.file, needle: x.needle, classification: x.classification, context: x.context.slice(0, 1200) })),
}, null, 2));
