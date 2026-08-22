#!/usr/bin/env node
// Mandatory first test for EDGE Mobile (iPhone Safari watcher): does the
// browser CORS model actually permit a direct cross-origin POST from a page
// hosted at this repo's own GitHub Pages origin to Botemania's public
// GraphQL endpoint?
//
// This is not testable by literally running Safari - but CORS is enforced
// entirely by the browser based on the server's response headers, which are
// deterministic and origin-independent of who inspects them. So the correct,
// real test is: send the exact preflight (OPTIONS) request a browser would
// send before a cross-origin POST carrying a non-simple content-type and a
// custom header, then send the real POST with an Origin header set, and
// read back the Access-Control-* response headers. A browser would refuse
// the request unless both steps come back permissive - so this script
// reproduces exactly what a browser checks, without guessing.
//
// Uses the exact query/headers already validated in
// botemania-all-network-fast-meter-sample-v1.mjs. Does not invent schema.
import fs from 'node:fs';

const ENDPOINT = 'https://www.botemania.es/es/graphql';
const OUT = 'loterias-ai/mobile/edge-live-watch/evidence/cors-preflight-probe-v1.json';
// The repo is itself a GitHub Pages user site (root index.html, no CNAME),
// so this is the real origin the PWA will be served from once merged.
const CANDIDATE_ORIGIN = 'https://alvarogavilan.github.io';
const QUERY = `query loadJackpots {
  jackpots { id amount }
  redTigerJackpots { id amount }
  blueprintJackpots { id amount }
}`;

function headerObjectFromFetchHeaders(h) {
  const out = {};
  for (const [k, v] of h.entries()) out[k] = v;
  return out;
}

async function preflight() {
  const r = await fetch(ENDPOINT, {
    method: 'OPTIONS',
    headers: {
      origin: CANDIDATE_ORIGIN,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,venture',
    },
    signal: AbortSignal.timeout(10000),
  });
  return { httpStatus: r.status, ok: r.ok, headers: headerObjectFromFetchHeaders(r.headers) };
}

async function actualPost() {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      venture: 'botemania_es',
      origin: CANDIDATE_ORIGIN,
      // Deliberately no referer set to CANDIDATE_ORIGIN's own path - a real
      // browser sets referer to the PAGE's URL, which the server cannot
      // distinguish from this. Testing the origin-gating behavior only.
      'cache-control': 'no-cache, no-store, max-age=0',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    },
    body: JSON.stringify({ operationName: 'loadJackpots', variables: {}, query: QUERY }),
    signal: AbortSignal.timeout(10000),
  });
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  return { httpStatus: r.status, ok: r.ok, headers: headerObjectFromFetchHeaders(r.headers), bodyParsedOk: body !== null, hasJackpotsField: !!body?.data?.jackpots };
}

function evaluateCors(preflightResult, postResult) {
  const acao = (h) => (h?.['access-control-allow-origin'] || '').trim();
  const acam = (h) => (h?.['access-control-allow-methods'] || '').toLowerCase();
  const acah = (h) => (h?.['access-control-allow-headers'] || '').toLowerCase();

  const preflightOriginAllowed = acao(preflightResult?.headers) === CANDIDATE_ORIGIN || acao(preflightResult?.headers) === '*';
  const preflightMethodAllowed = acam(preflightResult?.headers).includes('post');
  const preflightHeadersAllowed = acah(preflightResult?.headers).includes('content-type') && acah(preflightResult?.headers).includes('venture');
  const preflightPermissive = preflightResult?.ok && preflightOriginAllowed && preflightMethodAllowed && preflightHeadersAllowed;

  const postOriginAllowed = acao(postResult?.headers) === CANDIDATE_ORIGIN || acao(postResult?.headers) === '*';
  const postPermissive = postResult?.ok && postOriginAllowed;

  const browserDirectGraphqlSupported = !!(preflightPermissive && postPermissive);
  const corsBlocked = !browserDirectGraphqlSupported;

  return {
    browserDirectGraphqlSupported,
    corsBlocked,
    preflightOriginAllowed,
    preflightMethodAllowed,
    preflightHeadersAllowed,
    preflightPermissive,
    postOriginAllowed,
    postPermissive,
    reasonIfBlocked: browserDirectGraphqlSupported ? null
      : !preflightResult?.ok ? 'PREFLIGHT_HTTP_ERROR'
      : !preflightOriginAllowed ? 'PREFLIGHT_ORIGIN_NOT_ALLOWED'
      : !preflightMethodAllowed ? 'PREFLIGHT_METHOD_NOT_ALLOWED'
      : !preflightHeadersAllowed ? 'PREFLIGHT_CUSTOM_HEADERS_NOT_ALLOWED'
      : !postResult?.ok ? 'POST_HTTP_ERROR'
      : !postOriginAllowed ? 'POST_ORIGIN_NOT_REFLECTED'
      : 'UNKNOWN',
  };
}

async function run() {
  const generatedAt = new Date().toISOString();
  let preflightResult = null, preflightError = null;
  try { preflightResult = await preflight(); } catch (e) { preflightError = String(e?.name || e?.message || e); }

  let postResult = null, postError = null;
  try { postResult = await actualPost(); } catch (e) { postError = String(e?.name || e?.message || e); }

  const cors = evaluateCors(preflightResult, postResult);

  const out = {
    version: 'edge-mobile-cors-preflight-probe-v1',
    generatedAt,
    endpoint: ENDPOINT,
    candidateOrigin: CANDIDATE_ORIGIN,
    method: 'REPRODUCES_EXACT_BROWSER_PREFLIGHT_AND_ACTUAL_REQUEST_THEN_READS_ACCESS_CONTROL_HEADERS',
    preflight: preflightResult,
    preflightError,
    actualPost: postResult,
    postError,
    decision: cors,
    guards: {
      noAssumedResult: true,
      realHttpRequestsOnly: true,
      publicEndpointOnly: true,
      noAuthentication: true,
      noBetting: true,
      realMoneyAllowed: false,
    },
  };
  fs.mkdirSync('loterias-ai/mobile/edge-live-watch/evidence', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify({ decision: cors, preflightHttpStatus: preflightResult?.httpStatus ?? null, postHttpStatus: postResult?.httpStatus ?? null, preflightError, postError }, null, 2));
}

await run();
