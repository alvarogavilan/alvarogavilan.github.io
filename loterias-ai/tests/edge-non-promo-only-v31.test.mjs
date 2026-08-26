import assert from 'node:assert/strict';
import fs from 'node:fs';

// index-v31.mjs extends V30EdgeSentinel and only adds the Betfair Sporting
// public-config probe route - it must never re-introduce or shadow any of
// the promotional-research routes NON_PROMO_ONLY retired at v30, and must
// inherit that rejection via super.fetch() rather than re-implementing it.
// This file verifies v31's OWN content only, matching this codebase's own
// established pattern for its versioned Worker chain (each version file is
// an immutable historical snapshot once superseded - see the identical
// wrangler-assertion removal already done in
// edge-playuzu-current-account-evidence-v29.test.mjs and
// edge-non-promo-only-v30.test.mjs). It deliberately does NOT assert that
// v31 is the currently deployed entry - see
// edge-non-promo-only-deployed-entry-v1.test.mjs for a version-agnostic
// test of whatever wrangler.jsonc currently points to.
const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v31.mjs','utf8');

assert.ok(worker.includes("import { EdgeSentinel as V30EdgeSentinel } from './index-v30.mjs'"));
assert.ok(worker.includes('extends V30EdgeSentinel'));

// v31 must delegate to super.fetch() for any path it does not itself
// special-case, so v30's NON_PROMO_REJECTED_PATHS interception still runs.
assert.ok(worker.includes('super.fetch(request)'));

const rejectedPaths=[
  '/science/playuzu-welcome','/science/playuzu-current-account',
  '/science/jokerbet-stack','/science/jokerbet-promos',
  '/science/paf-group-promos','/science/pinata-points','/science/cgm-zero-deposit',
];
for(const path of rejectedPaths){
  assert.ok(!worker.includes(`'${path}'`), `index-v31.mjs must not re-declare or shadow the retired promotional path ${path}`);
}

console.log('edge-non-promo-only-v31.test.mjs: PASS');
