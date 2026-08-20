#!/usr/bin/env node
// Carril B: Ultimate Video Poker's help page confirms it bundles 10 variants
// including "Jotas o Mejor Progresivo" (WAGER_BET-monitored, verified live at
// 3,448.25 EUR per progressive-score-research-v1.json's manual screenshot
// cross-match) with 1/5/10/25 simultaneous hands - but no paytable numbers
// appear in the static help text (botemania-video-poker-jackpot-probe-v1.json).
// Paytables for these games are almost certainly rendered inside the game
// CLIENT itself, not the marketing/SEO page. This mirrors exactly the
// botemania-irish-metadata-probe-v1.mjs pattern that successfully recovered
// Irish Riches' provider/launch/fileservice parameters via Botemania's public
// GraphQL - reused here unchanged, just retargeted at ultimate-video-poker,
// to find the provider ID and any gameEngineID/profile/customer hints that
// could locate a vendor help/rules asset (the same class of endpoint that
// worked for Blueprint's Irish Riches fileservice).
import fs from 'node:fs';
import crypto from 'node:crypto';

const ENDPOINT = 'https://www.botemania.es/es/graphql';
const VENTURE = 'botemania_es';
const SLUG = 'ultimate-video-poker';
const REFERER = `https://www.botemania.es/juegos/casino-online/${SLUG}`;
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-ultimate-video-poker-metadata-probe-v1.json';
const headers = {
  accept: 'application/json',
  'content-type': 'application/json',
  venture: VENTURE,
  referer: REFERER,
  origin: 'https://www.botemania.es',
  'user-agent': 'loterias-ai-botemania-ultimate-video-poker-metadata-probe/1.0',
};

async function gql(query, variables) {
  const r = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  return { httpStatus: r.status, body, sha256: crypto.createHash('sha256').update(text).digest('hex'), rawPreview: body ? null : text.slice(0, 500) };
}

const fields = `id title link providerId authorName categoryId subCategoryId imageSlug imageVariants customRegistrationUrl howToPlay jackpot { id amount }`;
const specs = [
  ['contentfulGame', `query BotemaniaUVPContentful($gameId:String!){ contentfulGame(gameId:$gameId){ ${fields} } }`, { gameId: SLUG }],
  ['pageOrGameFullPath', `query BotemaniaUVPPage($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`, { path: `/juegos/casino-online/${SLUG}` }],
  ['pageOrGameRelativePath', `query BotemaniaUVPPageRel($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`, { path: `casino-online/${SLUG}` }],
];

const probes = [];
for (const [name, query, variables] of specs) {
  try {
    const x = await gql(query, variables);
    probes.push({ name, httpStatus: x.httpStatus, data: x.body?.data || null, errors: (x.body?.errors || []).map((e) => String(e?.message || e)).slice(0, 10), responseSha256: x.sha256, rawPreview: x.rawPreview });
  } catch (e) {
    probes.push({ name, httpStatus: null, data: null, errors: [String(e?.message || e)] });
  }
}
const games = [];
for (const p of probes) {
  const g = p.data?.contentfulGame || p.data?.pageOrGame?.game;
  if (g && typeof g === 'object') games.push({ source: p.name, ...g });
}

const page = await fetch(REFERER, { headers: { accept: 'text/html,*/*', 'user-agent': 'loterias-ai-botemania-ultimate-video-poker-metadata-probe/1.0', 'cache-control': 'no-cache' }, redirect: 'follow' });
const html = await page.text();
const urls = [...new Set([...html.matchAll(/https?:\\?\/?\\?\/?[^"'<>\s]+/g)].map((m) => m[0].replace(/\\u0026/g, '&').replace(/\\\//g, '/')).filter((x) => /provider|game|launch|poker|fileservice/i.test(x)))].slice(0, 100);
const paramHints = [];
for (const m of html.matchAll(/(?:gameEngineID|gameEngineId|profile|customer|providerId|gameId|clientId)["'\\\s:=]+([A-Za-z0-9_.-]{2,100})/gi)) paramHints.push({ term: m[0].slice(0, 80), value: m[1] });

const out = {
  version: 'botemania-ultimate-video-poker-metadata-probe-v1',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  gameSlug: SLUG,
  variantOfInterest: 'Jotas o Mejor Progresivo',
  monitorFeedRef: 'generic:WAGER_BET (loterias-ai/edge-live/evidence/progressive-score-research-v1.json - MANUAL_SCREENSHOT_LIVE_AMOUNT_CROSS_MATCH, VERY_HIGH confidence)',
  probes,
  games,
  page: { url: REFERER, httpStatus: page.status, bytes: html.length, sha256: crypto.createHash('sha256').update(html).digest('hex') },
  publicUrlCandidates: urls,
  paramHints: [...new Map(paramHints.map((x) => [`${x.term}|${x.value}`, x])).values()].slice(0, 100),
  decision: {
    metadataRecovered: games.length > 0,
    providerIdRecovered: games.some((g) => typeof g.providerId === 'string' && g.providerId.length > 0),
    launchLinkRecovered: games.some((g) => typeof g.link === 'string' && g.link.length > 0),
    exactPaytableRecovered: false,
    pRoyalFlushRecovered: false,
    realMoneyAllowed: false,
  },
  guards: { publicGraphqlOnly: true, knownWebsiteFieldsOnly: true, noIntrospection: true, noAuthentication: true, noCookies: true, noMutation: true, noBetting: true, realMoneyAllowed: false },
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ games: games.map((g) => ({ source: g.source, id: g.id, title: g.title, link: g.link, providerId: g.providerId })), paramHints: out.paramHints, decision: out.decision }, null, 2));
