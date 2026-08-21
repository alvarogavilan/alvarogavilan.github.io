#!/usr/bin/env node
// Priority #1: bind Winfall Wishes Jackpot's exact live meter ID.
//
// The existing botemania-zero-reset-live-id-probe-v1.mjs only searched each
// game's own marketing/rules page HTML for literal ID substrings and a fixed
// needle list - 0/6 zero-reset games matched. That layer is exhausted. This
// attacks three layers it never tried:
//
// 1. contentfulGame's `jackpot { id amount }` GraphQL field. Already proven
//    null for 3 unrelated games in prior probes, including Fishin' Frenzy
//    Jackpot King - a game with a KNOWN real bound jackpot network - so this
//    field looks like an unused CMS placeholder, not a live binding. Tested
//    once more here for completeness/to catch a possible exception, not
//    expected to resolve anything.
// 2. Embedded SSR/hydration state blobs in the page HTML itself
//    (__NEXT_DATA__/__APOLLO_STATE__/__INITIAL_STATE__-style markers),
//    extracted with a bounded brace-counting walk (no regex backtracking
//    risk regardless of page size).
// 3. A parameterized "jackpot for this specific game" GraphQL operation
//    inside the page's own loaded scripts - anchored on the literal
//    "jackpot" occurrence via indexOf and checked only within a small fixed
//    window, never a global backtracking-prone regex over the whole file
//    (same safety discipline as the Roxor probe fix).
//
// Controls (mandatory - a shared/global response never counts as binding):
// a second zero-reset page from the same catalog (Paper Wins Jackpot) and
// one unrelated, non-proportional page (Boteman). A candidate is only
// reported as a genuine binding candidate if it does NOT also appear on
// either control's fetched content.
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN = 'https://www.botemania.es';
const GRAPHQL = `${ORIGIN}/es/graphql`;
const VENTURE = 'botemania_es';
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-winfall-wishes-identity-binding-probe-v1.json';
const UA = 'loterias-ai-winfall-identity-binding-probe/1.0';

const PRIMARY = { slug: 'winfall-wishes-jackpot', role: 'PRIMARY_TARGET' };
const ZERO_RESET_CONTROL = { slug: 'paper-wins-jackpot', role: 'ZERO_RESET_CONTROL_SAME_CATALOG' };
const UNRELATED_CONTROL = { slug: 'boteman', role: 'UNRELATED_NON_PROPORTIONAL_CONTROL' };
const TARGETS = [PRIMARY, ZERO_RESET_CONTROL, UNRELATED_CONTROL];

// Specific, non-ambiguous live IDs already known from the network feed -
// never the ambiguous shared ones (JACKPOT/pool1/GRAND/WAGER_BET/etc).
const KNOWN_SPECIFIC_LIVE_IDS = ['bouncy_bubbles_id', 'classicwildsprogressive', 'diamondbonanza25BTM', 'DealOrNoDealStateful3', 'tikitemple2_1', 'progressivealice1'];

const WALL_CLOCK_BUDGET_MS = 9 * 60 * 1000;
const startedAt = Date.now();
function progress(msg) { console.error(`[${((Date.now() - startedAt) / 1000).toFixed(1)}s] ${msg}`); }

async function fetchText(url, accept = '*/*') {
  const r = await fetch(url, { headers: { accept, 'user-agent': UA, 'cache-control': 'no-cache' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
  const text = await r.text();
  return { r, text };
}
async function gql(referer, query, variables) {
  const headers = { accept: 'application/json', 'content-type': 'application/json', venture: VENTURE, referer, origin: ORIGIN, 'user-agent': UA };
  const r = await fetch(GRAPHQL, { method: 'POST', headers, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(8000) });
  const text = await r.text();
  let body = null; try { body = JSON.parse(text); } catch {}
  return { httpStatus: r.status, body };
}
function sha(t) { return crypto.createHash('sha256').update(t).digest('hex'); }

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0, budgetExceeded = false;
  async function runOne() {
    while (next < items.length) {
      if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) { budgetExceeded = true; return; }
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runOne));
  return { results: results.filter(Boolean), budgetExceeded };
}

// Bounded brace-counting walk - no regex over full page text, so no
// backtracking risk regardless of page size.
export function findStateBlobs(html) {
  const markers = ['__NEXT_DATA__', '__APOLLO_STATE__', '__INITIAL_STATE__', '__PRELOADED_STATE__'];
  const hits = [];
  for (const marker of markers) {
    let from = 0;
    while (hits.length < 10) {
      const idx = html.indexOf(marker, from);
      if (idx < 0) break;
      from = idx + marker.length;
      const searchWindow = html.slice(idx, Math.min(html.length, idx + 200));
      const braceOffset = searchWindow.indexOf('{');
      if (braceOffset < 0) continue;
      const start = idx + braceOffset;
      let depth = 0, i = start, found = false;
      const HARD_CAP = 300000;
      while (i < html.length && i - start < HARD_CAP) {
        const ch = html[i];
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { found = true; i++; break; } }
        i++;
      }
      if (!found) continue;
      const raw = html.slice(start, i);
      let parsed = null; try { parsed = JSON.parse(raw); } catch {}
      hits.push({ marker, index: idx, bytes: raw.length, parsedOk: parsed !== null, rawPreview: raw.slice(0, 600) });
    }
  }
  return hits;
}

// Anchored on the literal "jackpot" substring via indexOf (safe, linear);
// only a small fixed window around each hit is regex-tested, so worst-case
// cost per anchor is a small constant regardless of file size.
export function findParameterizedJackpotQuery(text) {
  const hits = [];
  const lower = text.toLowerCase();
  let from = 0;
  while (hits.length < 20) {
    const idx = lower.indexOf('jackpot', from);
    if (idx < 0) break;
    from = idx + 7;
    const window = text.slice(Math.max(0, idx - 600), Math.min(text.length, idx + 600));
    const hasGameVar = /\$(gameId|slug|gameSlug|productId|game)\b/i.test(window);
    const hasQueryKeyword = /\b(query|mutation)\b/.test(window);
    if (hasGameVar && hasQueryKeyword) hits.push({ index: idx, context: window.replace(/\s+/g, ' ').slice(0, 1000) });
  }
  return hits;
}

export function findLiteralIdHits(text, ids) {
  const hits = [];
  for (const id of ids) {
    let from = 0, count = 0;
    while (count < 3) {
      const idx = text.indexOf(id, from);
      if (idx < 0) break;
      from = idx + id.length; count++;
      hits.push({ id, context: text.slice(Math.max(0, idx - 300), Math.min(text.length, idx + id.length + 500)).replace(/\s+/g, ' ').slice(0, 900) });
    }
  }
  return hits;
}

async function probeTarget(target) {
  const referer = `${ORIGIN}/juegos/slots-online/${target.slug}`;
  progress(`probing ${target.slug}`);
  let page = null, html = '', pageError = null;
  try {
    const r = await fetchText(referer, 'text/html,*/*');
    page = r.r; html = r.text;
  } catch (e) { pageError = String(e?.name || e?.message || e); }

  let contentfulGame = null, graphqlError = null;
  try {
    const fields = 'id title providerId jackpot { id amount }';
    const g = await gql(referer, `query G($gameId:String!){ contentfulGame(gameId:$gameId){ ${fields} } }`, { gameId: target.slug });
    contentfulGame = g.body?.data?.contentfulGame || null;
    if (g.body?.errors?.length) graphqlError = g.body.errors.map((e) => String(e?.message || e)).slice(0, 5);
  } catch (e) { graphqlError = [String(e?.name || e?.message || e)]; }

  const stateBlobs = html ? findStateBlobs(html) : [];
  const pageParamHits = html ? findParameterizedJackpotQuery(html) : [];
  const pageLiteralIdHits = html ? findLiteralIdHits(html, KNOWN_SPECIFIC_LIVE_IDS) : [];

  const scriptUrls = html ? [...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => new URL(m[1], ORIGIN).href))] : [];
  const scriptResults = [];
  const scriptFailures = [];
  let scriptsFetchedOk = 0;
  const { budgetExceeded } = await mapWithConcurrency(scriptUrls, 6, async (url) => {
    try {
      const { r, text } = await fetchText(url, 'application/javascript,text/javascript,*/*');
      if (!r.ok) { scriptFailures.push({ url, httpStatus: r.status }); return; }
      scriptsFetchedOk++;
      const paramHits = findParameterizedJackpotQuery(text);
      const literalHits = findLiteralIdHits(text, KNOWN_SPECIFIC_LIVE_IDS);
      if (paramHits.length || literalHits.length) scriptResults.push({ url, bytes: text.length, sha256: sha(text), paramHits: paramHits.slice(0, 10), literalIdHits: literalHits.slice(0, 10) });
    } catch (e) { scriptFailures.push({ url, httpStatus: null, error: String(e?.name || e?.message || e) }); }
  });

  return {
    slug: target.slug, role: target.role, referer,
    page: page ? { httpStatus: page.status, bytes: html.length, sha256: html ? sha(html) : null } : null,
    pageError,
    contentfulGame: { data: contentfulGame, errors: graphqlError, jackpotFieldNonNull: !!(contentfulGame?.jackpot?.id || contentfulGame?.jackpot?.amount) },
    stateBlobs,
    pageParamHits,
    pageLiteralIdHits,
    coverage: { scriptsDiscovered: scriptUrls.length, scriptsFetchedSuccessfully: scriptsFetchedOk, scriptFetchFailureCount: scriptFailures.length, scriptFetchFailures: scriptFailures.slice(0, 20), wallClockBudgetExceeded: budgetExceeded, scanComplete: !budgetExceeded && scriptsFetchedOk + scriptFailures.length === scriptUrls.length },
    scriptResults,
  };
}

const state = { results: [] };
async function main() {
  for (const t of TARGETS) state.results.push(await probeTarget(t));
  return state.results;
}

export function summarizeCandidates(results) {
  const primary = results.find((r) => r.role === 'PRIMARY_TARGET');
  const controls = results.filter((r) => r.role !== 'PRIMARY_TARGET');
  if (!primary) return { candidatesFound: 0, candidates: [] };

  const primaryLiteralIds = new Set([...primary.pageLiteralIdHits.map((h) => h.id), ...primary.scriptResults.flatMap((s) => s.literalIdHits.map((h) => h.id))]);
  const controlLiteralIds = new Set(controls.flatMap((c) => [...c.pageLiteralIdHits.map((h) => h.id), ...c.scriptResults.flatMap((s) => s.literalIdHits.map((h) => h.id))]));
  const genuineCandidateIds = [...primaryLiteralIds].filter((id) => !controlLiteralIds.has(id));

  const primaryHasParamQuery = primary.pageParamHits.length > 0 || primary.scriptResults.some((s) => s.paramHits.length > 0);
  const controlsAlsoHaveParamQuery = controls.some((c) => c.pageParamHits.length > 0 || c.scriptResults.some((s) => s.paramHits.length > 0));

  return {
    candidatesFound: genuineCandidateIds.length,
    candidates: genuineCandidateIds,
    controlsReproducedSameLiteralIds: [...primaryLiteralIds].filter((id) => controlLiteralIds.has(id)),
    primaryHasParameterizedJackpotQuery: primaryHasParamQuery,
    controlsAlsoHaveParameterizedJackpotQuery: controlsAlsoHaveParamQuery,
    parameterizedQuerySpecificToPrimary: primaryHasParamQuery && !controlsAlsoHaveParamQuery,
    contentfulGameJackpotFieldPopulated: primary.contentfulGame.jackpotFieldNonNull,
  };
}

function buildAndWriteEvidence(extra = {}) {
  const results = state.results;
  const candidateSummary = summarizeCandidates(results);
  const out = {
    version: 'botemania-winfall-wishes-identity-binding-probe-v1',
    generatedAt: new Date().toISOString(),
    operator: 'botemania-es',
    targets: TARGETS,
    results,
    candidateSummary,
    decision: {
      exactBindingCandidateFound: candidateSummary.candidatesFound > 0 || candidateSummary.parameterizedQuerySpecificToPrimary,
      // Per instruction: a candidate here is discovery evidence only. Real
      // identityVerified=true requires a second frozen prospective
      // replication plus controls still not reproducing it - neither can
      // happen inside a single script run, so this must never self-promote.
      identityVerified: false,
      requiresSecondFrozenReplicationBeforeVerification: true,
      realMoneyAllowed: false,
      ...extra,
    },
    guards: {
      publicPagesAndPageLoadedScriptsOnly: true,
      noGlobalChunkRescan: true,
      noAuthentication: true,
      noCookies: true,
      noGraphqlIntrospection: true,
      noMutationExecuted: true,
      globalOrSharedResponseNeverCountsAsBinding: true,
      ambiguousGenericIdsNeverCountAsMapping: true,
      controlsMandatory: true,
      noBetting: true,
      realMoneyAllowed: false,
    },
  };
  fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify({ candidateSummary, decision: out.decision, coveragePerTarget: results.map((r) => ({ slug: r.slug, coverage: r.coverage, pageHttpStatus: r.page?.httpStatus ?? null, stateBlobCount: r.stateBlobs.length, contentfulGameJackpot: r.contentfulGame.data?.jackpot ?? null })) }, null, 2));
}

// Top-level watchdog independent of any single request's own AbortSignal -
// a real prior incident on this repo (Roxor probe) showed a job can still
// hang silently past its own per-request timeouts. All extraction here is
// already backtracking-safe (bounded windows, no risky regex), but this
// stays as a defense-in-depth backstop that writes an honest partial result
// instead of leaving nothing behind if anything still hangs.
//
// Guarded so importing the pure helpers above for tests never triggers a
// real network probe or file write as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
const WATCHDOG_MS = 10 * 60 * 1000;
let watchdogTimer;
const watchdog = new Promise((resolve) => { watchdogTimer = setTimeout(() => resolve('WATCHDOG'), WATCHDOG_MS); });
const winner = await Promise.race([main().then(() => 'MAIN_DONE').catch((e) => { progress(`main() threw: ${String(e?.message || e)}`); return 'MAIN_ERROR'; }), watchdog]);
clearTimeout(watchdogTimer);

if (winner === 'WATCHDOG') {
  progress('WATCHDOG fired before main() finished - writing partial evidence honestly.');
  buildAndWriteEvidence({ timedOutBeforeCompletion: true });
  process.exitCode = 0;
} else if (winner === 'MAIN_ERROR') {
  buildAndWriteEvidence({ scriptThrew: true });
  process.exitCode = 1;
} else {
  buildAndWriteEvidence();
}
}
