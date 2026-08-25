import assert from 'node:assert/strict';
import fs from 'node:fs';

// EDGE must never research or recommend promotional/loyalty mechanisms
// (welcome bonuses, cashback, free spins, reload offers, loyalty points),
// regardless of how fail-closed their own gates already were. index-v30.mjs
// is the live deployed Cloudflare Worker entry (see wrangler.jsonc) and
// intercepts every known promotional-research path before any delegation
// to the v9-v29 chain, returning a fixed rejection instead. This test can
// only verify the SOURCE is correct (this environment has no network
// access to actually invoke the deployed Worker), so it checks the file
// content directly rather than making a real HTTP request.
const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v30.mjs','utf8');
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');

assert.match(wrangler,/"main"\s*:\s*"src\/index-v30\.mjs"/);
assert.ok(worker.includes("import { EdgeSentinel as V29EdgeSentinel } from './index-v29.mjs'"));

const rejectedPaths=[
  '/science/playuzu-welcome','/science/playuzu-current-account',
  '/science/jokerbet-stack','/science/jokerbet-promos',
  '/science/paf-group-promos','/science/pinata-points','/science/cgm-zero-deposit',
];
for(const path of rejectedPaths){
  assert.ok(worker.includes(`'${path}'`), `index-v30.mjs must list ${path} as a NON_PROMO_ONLY rejected path`);
}
assert.ok(worker.includes('NON_PROMO_REJECTED_PATHS'));
assert.ok(worker.includes('research:null,positiveEvProven:false,executable:false,realMoneyAllowed:false'));

// Every one of these paths must be intercepted and rejected BEFORE any
// call to super.fetch() - i.e. the rejection check must appear textually
// before the super.fetch(request) delegation inside fetch().
const fetchBody=worker.slice(worker.indexOf('async fetch(request){'));
const rejectionCheckIndex=fetchBody.indexOf('NON_PROMO_REJECTED_PATHS.has(path)');
const delegationIndex=fetchBody.indexOf('super.fetch(request)');
assert.ok(rejectionCheckIndex>=0 && delegationIndex>=0 && rejectionCheckIndex<delegationIndex,
  'the NON_PROMO_ONLY rejection must be checked before delegating to the legacy chain');

// The playuzu-welcome fast-profit lane must be dropped, not filled with
// promotional content.
assert.ok(worker.includes("lane.id!=='playuzu-welcome-50fs'"));

// v29 itself must remain untouched as an immutable historical snapshot -
// its own promo-research content is still verified by
// edge-playuzu-current-account-evidence-v29.test.mjs, which now only
// checks v29's own file content, not deployment.
const v29=fs.readFileSync('loterias-ai/edge-backend/src/index-v29.mjs','utf8');
assert.ok(v29.includes("path==='/science/playuzu-welcome'||path==='/science/playuzu-current-account'"));

console.log('edge-non-promo-only-v30.test.mjs: PASS');
