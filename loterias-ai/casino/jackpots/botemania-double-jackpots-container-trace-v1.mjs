#!/usr/bin/env node
// Misión A (data-flow tracing): the settings-bundle static scan is exhausted
// (v1 7 needles -> v2 29 needles, both 0 object-literal hits). But the
// DoubleJackpots component family has SIX chunks the mustdrop extractors
// never fetched at all: the container (most likely home of the actual
// GraphQL query / data source), the base presentational component, and
// three shared "vendors~...DoubleJackpots~..." bundles. This script fetches
// those, extracts GraphQL/REST/data-source signatures, and builds a
// moduleID -> chunk-name reference graph so a later pass can walk from
// "who instantiates DoubleJackpots" back to "who fetches jackpot.mustDropWithin".
import fs from 'node:fs';
import crypto from 'node:crypto';

const LAZY = 'loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-probe-v1.json';
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-double-jackpots-container-trace-v1.json';
const lazy = JSON.parse(fs.readFileSync(LAZY, 'utf8'));
const allChunks = lazy.chunks || [];
const idToName = Object.fromEntries(allChunks.map((c) => [String(c.id), c.name]));

const TARGET_NAME_RE = /^(containers-DoubleJackpots-index-js|albatross-common-components-dist-components-DoubleJackpots|vendors~albatross-common-components-dist-components-DoubleJackpots~.*)$/;
const targets = allChunks.filter((c) => TARGET_NAME_RE.test(String(c.name || '')));

const DATA_SOURCE_NEEDLES = [
  'query', 'gql', 'useQuery', 'useLazyQuery', 'operationName', 'mutation',
  'fetch(', 'axios', 'graphql', 'Apollo', 'apollo',
  'mustDropWithin', 'endTime', 'expiresAt', 'deadline', 'duration',
  'remainingTime', 'resetAt', 'startTime', 'jackpotId', 'jackpotID',
  'venture', 'customer', 'gameEngineID', 'network', 'DoubleJackpots',
];

// webpack chunk-load arrays look like: (window.webpackJsonp=window.webpackJsonp||[]).push([[354],{...}])
// or, for later webpack versions, self.webpackChunk...push([[id],{...}])
const CHUNK_ARRAY_RE = /\.push\(\[\[([^\]]+)\]/g;
// individual module require calls: __webpack_require__(123) or n(123) style minified aliases are too ambiguous to trust alone,
// so we only trust the push-array form above plus explicit numeric-looking module maps like {123:function(...)}.
const MODULE_DEF_RE = /\b(\d{1,4}):function\(/g;

const chunks = [];
const findings = [];
const referencedModuleIds = new Set();
const graphqlLikeSnippets = [];

for (const meta of targets) {
  const r = await fetch(meta.url, { headers: { accept: 'application/javascript,*/*', 'user-agent': 'loterias-ai-doublejackpots-container-trace/1.0', 'cache-control': 'no-cache' }, redirect: 'follow' });
  const text = await r.text();
  chunks.push({ name: meta.name, id: meta.id, url: meta.url, httpStatus: r.status, bytes: text.length, sha256: crypto.createHash('sha256').update(text).digest('hex') });

  for (const needle of DATA_SOURCE_NEEDLES) {
    let p = 0, c = 0;
    const lower = text.toLowerCase(), needleLower = needle.toLowerCase();
    while (c < 8) {
      const i = lower.indexOf(needleLower, p);
      if (i < 0) break;
      findings.push({ chunk: meta.name, needle, index: i, context: text.slice(Math.max(0, i - 250), Math.min(text.length, i + needle.length + 450)) });
      p = i + needle.length;
      c++;
    }
  }

  // GraphQL operation signatures: `query Something(...` / `query Something{` / gql`...`
  for (const m of text.matchAll(/(?:query|mutation)\s+[A-Z]\w*\s*[({]/g)) {
    graphqlLikeSnippets.push({ chunk: meta.name, index: m.index, snippet: text.slice(Math.max(0, m.index - 40), Math.min(text.length, m.index + 300)) });
  }

  for (const m of text.matchAll(CHUNK_ARRAY_RE)) {
    for (const idStr of m[1].split(',')) {
      const id = idStr.trim().replace(/^["']|["']$/g, '');
      if (id) referencedModuleIds.add(id);
    }
  }
  let modDefCount = 0;
  for (const m of text.matchAll(MODULE_DEF_RE)) {
    if (modDefCount++ > 500) break; // minified bundles can have hundreds of local closures; cap to avoid noise explosion
    referencedModuleIds.add(m[1]);
  }
}

const referenceGraph = [...referencedModuleIds]
  .filter((id) => idToName[id])
  .map((id) => ({ referencedModuleId: id, resolvesToChunkName: idToName[id] }));

const out = {
  version: 'botemania-double-jackpots-container-trace-v1',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  scope: 'PUBLIC_STATIC_BUNDLE_TRACE_CONTAINER_AND_VENDOR_CHUNKS_NOT_PREVIOUSLY_FETCHED',
  targetsFetched: targets.length,
  chunks,
  findingsCount: findings.length,
  findings,
  graphqlLikeSnippetCount: graphqlLikeSnippets.length,
  graphqlLikeSnippets: graphqlLikeSnippets.slice(0, 100),
  referenceGraph,
  decision: {
    anyGraphqlOperationSignatureFound: graphqlLikeSnippets.length > 0,
    anyDataSourceNeedleFoundInContainer: findings.some((f) => f.chunk === 'containers-DoubleJackpots-index-js'),
    referenceGraphEdgeCount: referenceGraph.length,
    exactEndpointRecovered: false, // never auto-set true; requires a human/model read of graphqlLikeSnippets/findings
    requiresManualReviewOfFindings: true,
    realMoneyAllowed: false,
  },
  guards: {
    publicStaticBundlesOnly: true,
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
console.log(JSON.stringify({ chunks, decision: out.decision, findingsCount: out.findingsCount, graphqlLikeSnippetCount: out.graphqlLikeSnippetCount, referenceGraphEdgeCount: referenceGraph.length }, null, 2));
