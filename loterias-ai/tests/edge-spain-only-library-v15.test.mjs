import assert from 'node:assert/strict';
import fs from 'node:fs';

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const v15=fs.readFileSync('loterias-ai/edge-backend/src/index-v15.mjs','utf8');
const universe=fs.readFileSync('loterias-ai/edge-backend/src/spain-playable-universe-v1.mjs','utf8');
const ui=fs.readFileSync('loterias-ai/edge-live/edge-spain-universe-client-v1.mjs','utf8');
const loader=fs.readFileSync('loterias-ai/edge-live/edge-live-ux-v1.mjs','utf8');
const policy=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-only-library-policy-v1.json','utf8'));

assert.match(wrangler,/"main"\s*:\s*"src\/index-v15\.mjs"/);
assert.ok(v15.includes("edge-sentinel-v15-spain-only-library-20260824a"));
assert.ok(v15.includes("SPAIN_ONLY_LIBRARY_REJECTS_NON_ES_RECORD"));
assert.ok(v15.includes("DELETE FROM library_records WHERE jurisdiction <> 'ES'"));
assert.ok(v15.includes("path==='/library/universe'"));
assert.ok(v15.includes("copy.searchParams.set('jurisdiction','ES')"));
assert.ok(v15.includes('foreignHistoricalRowsAllowed:0'));
assert.ok(universe.includes("jurisdiction:'ES'"));
assert.ok(universe.includes("registryObservedOperators:78"));
assert.ok(universe.includes("'Máquinas de azar'"));
assert.ok(universe.includes("'Ruleta'"));
assert.ok(universe.includes("'Black Jack'"));
assert.ok(universe.includes("'Póquer'"));
assert.ok(universe.includes("regionalLandBased"));
assert.ok(universe.includes("operationalLibraryAllowed:false"));
assert.ok(loader.includes("import './edge-spain-universe-client-v1.mjs'"));
assert.ok(ui.includes('UNIVERSO ESPAÑA'));
assert.ok(ui.includes('ES ONLY'));
assert.equal(policy.operationalLibraryJurisdiction,'ES');
assert.equal(policy.foreignHistoricalRowsAllowed,0);
assert.equal(policy.foreignExecutionCandidatesAllowed,false);
assert.equal(policy.hardGuards.rejectNonESLibraryRecord,true);
assert.equal(policy.hardGuards.searchForcedToES,true);
assert.equal(policy.hardGuards.foreignMechanismReferenceNeverExecutionEvidence,true);
assert.equal(policy.hardGuards.realMoneyAllowed,false);

console.log('edge-spain-only-library-v15.test.mjs: PASS');
