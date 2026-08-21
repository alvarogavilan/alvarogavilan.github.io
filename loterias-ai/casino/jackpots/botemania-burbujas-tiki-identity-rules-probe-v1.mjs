#!/usr/bin/env node
// Carril 1/2: close the identity + RTP-semantics gap for the two lanes that
// already show REAL demonstrated dynamic movement (generic:bouncy_bubbles_id,
// generic:tikitemple2_1). Reuses the exact GraphQL contentfulGame/pageOrGame
// pattern that already recovered providerId for Irish Riches and Ultimate
// Video Poker, plus the rules-page RTP/contribution context extractor from
// botemania-progressive-catalog-v1.mjs (which already found, for Tiki Templo,
// that the published RTP range is explicitly labelled "(Base)" - i.e. it
// EXCLUDES the jackpot contribution, which is listed as a separate add-on
// percentage). This script fetches the exact lane URLs directly instead of
// relying on the catalog's sitemap-priority scan, which never reached
// Burbujas Saltarinas or Diamond Bonanza (their URLs don't contain any of the
// jackpot/bote/pot/king keyword the catalog script prioritises on).
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN = 'https://www.botemania.es';
const GRAPHQL = `${ORIGIN}/es/graphql`;
const VENTURE = 'botemania_es';
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-burbujas-tiki-identity-rules-probe-v1.json';
const UA = 'loterias-ai-botemania-burbujas-tiki-identity-rules-probe/1.0';

const TARGETS = [
  { laneId: 'botemania-burbujas-saltarinas-progressive', monitorKey: 'generic:bouncy_bubbles_id', slug: 'burbujas-saltarinas', pathPrefix: 'slots-online' },
  { laneId: 'botemania-tiki-templo-progressive', monitorKey: 'generic:tikitemple2_1', slug: 'tiki-templo', pathPrefix: 'slots-online' },
  { laneId: 'botemania-diamond-bonanza-25c', monitorKey: 'generic:diamondbonanza25BTM', slug: 'danza-de-los-diamantes', pathPrefix: 'slots-online' },
];

const fields = 'id title link providerId authorName categoryId subCategoryId imageSlug imageVariants howToPlay jackpot { id amount }';

async function gql(headers, query, variables) {
  const r = await fetch(GRAPHQL, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  return { httpStatus: r.status, body, sha256: crypto.createHash('sha256').update(text).digest('hex'), rawPreview: body ? null : text.slice(0, 500) };
}

const clean = (t) => t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();
const pct = (s) => [...s.matchAll(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%/g)].map((m) => Number(m[1].replace(',', '.'))).filter(Number.isFinite);
function contribContexts(text) {
  const out = [];
  for (const key of ['Contribución al Bote', 'contribuye al Bote', 'Bote Reserva', 'Retorno Para el Jugador', 'Porcentaje de Retorno al Jugador', 'RTP']) {
    const i = text.toLowerCase().indexOf(key.toLowerCase());
    if (i >= 0) out.push({ key, context: text.slice(Math.max(0, i - 260), Math.min(text.length, i + 620)) });
  }
  return out;
}

const results = [];
for (const t of TARGETS) {
  const referer = `${ORIGIN}/juegos/${t.pathPrefix}/${t.slug}`;
  const headers = { accept: 'application/json', 'content-type': 'application/json', venture: VENTURE, referer, origin: ORIGIN, 'user-agent': UA };
  const specs = [
    ['contentfulGame', `query G($gameId:String!){ contentfulGame(gameId:$gameId){ ${fields} } }`, { gameId: t.slug }],
    ['pageOrGameFullPath', `query P($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`, { path: `/juegos/${t.pathPrefix}/${t.slug}` }],
  ];
  const probes = [];
  for (const [name, query, variables] of specs) {
    try {
      const x = await gql(headers, query, variables);
      probes.push({ name, httpStatus: x.httpStatus, data: x.body?.data || null, errors: (x.body?.errors || []).map((e) => String(e?.message || e)).slice(0, 10), responseSha256: x.sha256, rawPreview: x.rawPreview });
    } catch (e) {
      probes.push({ name, httpStatus: null, data: null, errors: [String(e?.message || e)] });
    }
  }
  const games = probes.map((p) => p.data?.contentfulGame || p.data?.pageOrGame?.game).filter((g) => g && typeof g === 'object');

  let page = null, html = '', pageError = null;
  try {
    page = await fetch(referer, { headers: { accept: 'text/html,*/*', 'user-agent': UA, 'cache-control': 'no-cache' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    html = await page.text();
  } catch (e) { pageError = String(e?.name || e?.message || e); }
  const text = html ? clean(html) : '';
  const contexts = text ? contribContexts(text) : [];
  const percentMentions = [...new Set(pct(contexts.map((c) => c.context).join(' ')))];
  // Stop at a legal-entity suffix (S.A.U./S.L.U./S.A./S.L.), not the first bare
  // period, since those abbreviations themselves contain periods.
  const operatorEntityMatch = text.match(/Operada por ([^]{2,120}?S\.[AL]\.(?:U\.)?)/);
  const paramHints = [];
  for (const m of html.matchAll(/(?:gameEngineID|gameEngineId|profile|customer|providerId|gameId|clientId)["'\\\s:=]+([A-Za-z0-9_.-]{2,100})/gi)) paramHints.push({ term: m[0].slice(0, 80), value: m[1] });
  // Direct cross-match: does the page's own markup/config reference the live
  // feed's monitor id literally? This is the strongest possible identity link
  // short of a manual in-game screenshot cross-match.
  const feedIdFragment = t.monitorKey.split(':')[1];
  const feedIdLiteralFoundInHtml = html.toLowerCase().includes(feedIdFragment.toLowerCase());

  results.push({
    laneId: t.laneId,
    monitorKey: t.monitorKey,
    slug: t.slug,
    referer,
    graphql: { probes, games },
    page: page ? { httpStatus: page.status, bytes: html.length, sha256: crypto.createHash('sha256').update(html).digest('hex') } : null,
    pageError,
    identity: {
      feedIdFragment,
      feedIdLiteralFoundInHtml,
      graphqlGameIdMatchesSlug: games.some((g) => typeof g.id === 'string' && g.id.toLowerCase() === t.slug.toLowerCase()),
      providerIdRecovered: games.some((g) => typeof g.providerId === 'string' && g.providerId.length > 0),
      providerIds: [...new Set(games.map((g) => g.providerId).filter(Boolean))],
    },
    rtpSemantics: {
      percentMentions,
      contexts,
      operatorEntity: operatorEntityMatch ? operatorEntityMatch[1].trim() : null,
    },
    paramHints: [...new Map(paramHints.map((x) => [`${x.term}|${x.value}`, x])).values()].slice(0, 50),
  });
}

const out = {
  version: 'botemania-burbujas-tiki-identity-rules-probe-v1',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  scope: 'DIRECT_LANE_URL_GRAPHQL_AND_RULES_PAGE_ONLY',
  results,
  guards: { publicGraphqlOnly: true, knownWebsiteFieldsOnly: true, noIntrospection: true, noAuthentication: true, noCookies: true, noMutation: true, noBetting: true, realMoneyAllowed: false, doNotFabricateSeedOrAverageHit: true, doNotImportExternalRtpAsBotemaniaFact: true },
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(results.map((r) => ({
  laneId: r.laneId,
  identity: r.identity,
  percentMentions: r.rtpSemantics.percentMentions,
  operatorEntity: r.rtpSemantics.operatorEntity,
  pageHttpStatus: r.page?.httpStatus ?? null,
  pageError: r.pageError,
})), null, 2));
