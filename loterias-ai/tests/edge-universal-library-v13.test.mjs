import assert from 'node:assert/strict';
import fs from 'node:fs';

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const v13=fs.readFileSync('loterias-ai/edge-backend/src/index-v13.mjs','utf8');
const bootstrap=fs.readFileSync('loterias-ai/edge-backend/src/library-bootstrap-v1.mjs','utf8');
const ui=fs.readFileSync('loterias-ai/edge-live/edge-library-client-v1.mjs','utf8');
const ux=fs.readFileSync('loterias-ai/edge-live/edge-live-ux-v1.mjs','utf8');
const semantics=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/universal-library-semantics-v1.json','utf8'));

assert.match(wrangler,/"main"\s*:\s*"src\/index-v13\.mjs"/);
assert.ok(v13.includes("edge-sentinel-v13-universal-library-20260824a"));
assert.ok(v13.includes('CREATE TABLE IF NOT EXISTS library_sources'));
assert.ok(v13.includes('CREATE TABLE IF NOT EXISTS library_records'));
assert.ok(v13.includes('archive_partition TEXT NOT NULL'));
assert.ok(v13.includes("path==='/library/summary'"));
assert.ok(v13.includes("path==='/library/sources'"));
assert.ok(v13.includes("path==='/library/search'"));
assert.ok(v13.includes("path==='/library/record'"));
assert.ok(v13.includes("path==='/library/import'"));
assert.ok(v13.includes('EDGE_LIBRARY_ADMIN_TOKEN'));
assert.ok(v13.includes("recordType:'OBSERVED_ATH'"));
assert.ok(v13.includes("recordType:'CYCLE_CLOSED_CANDIDATE'"));
assert.ok(v13.includes("confidence:'CANDIDATE_BOUNDARY_NOT_AWARD_PROOF'"));
assert.ok(v13.includes('historicalPatternIsNotPredictiveProof:true'));
assert.ok(v13.includes('libraryCannotEnableRealMoney:true'));

assert.ok(bootstrap.includes("sourceId:'es-selae-results'"));
assert.ok(bootstrap.includes("sourceId:'es-once-history'"));
assert.ok(bootstrap.includes("sourceId:'edge-direct-telemetry'"));
assert.ok(bootstrap.includes("uid:'es:selae:euromillones:2026-08-21'"));
assert.ok(bootstrap.includes("eventTimePrecision:'DATE_ONLY'"));
assert.ok(bootstrap.includes("uid:'es:selae:primitiva:2026-08-22'"));
assert.ok(bootstrap.includes("uid:'es:selae:bonoloto:2026-08-22'"));
assert.ok(bootstrap.includes('es:once:eurojackpot:'));

assert.ok(ux.includes("import './edge-library-client-v1.mjs'"));
assert.ok(ui.includes('BIBLIOTECA UNIVERSAL EDGE'));
assert.ok(ui.includes('/library/summary'));
assert.ok(ui.includes('/library/search?limit=20'));
assert.ok(ui.includes('SLOTS/JACKPOTS'));
assert.ok(ui.includes('Los enlaces de fuente son sólo procedencia'));

assert.equal(semantics.status,'ACTIVE_RESEARCH_LIBRARY_NO_PLAY');
assert.equal(semantics.realMoneyAllowed,false);
assert.equal(semantics.backend.storage,'Durable Object SQLite');
assert.equal(semantics.worldScaleDesign.shardingReady,true);
assert.equal(semantics.hardGuards.sourceProvenanceRequired,true);
assert.equal(semantics.hardGuards.timePrecisionMustNotBeFabricated,true);
assert.equal(semantics.hardGuards.candidateResetMustNotBeRelabeledAsVerifiedAward,true);
assert.equal(semantics.hardGuards.historicalPatternDoesNotProvePredictability,true);
assert.equal(semantics.hardGuards.multipleTestingRequiresCorrectionAndHoldout,true);
assert.equal(semantics.hardGuards.libraryRecordCannotEnableExecution,true);
assert.equal(semantics.hardGuards.executionContractRemainsSoleGreenAuthority,true);
assert.equal(semantics.hardGuards.realMoneyAllowed,false);

console.log('edge-universal-library-v13.test.mjs: PASS');
