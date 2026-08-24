import assert from 'node:assert/strict';
import fs from 'node:fs';

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const v14=fs.readFileSync('loterias-ai/edge-backend/src/index-v14.mjs','utf8');
const ui=fs.readFileSync('loterias-ai/edge-live/edge-library-coverage-client-v1.mjs','utf8');
const ux=fs.readFileSync('loterias-ai/edge-live/edge-live-ux-v1.mjs','utf8');
const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/library-coverage-semantics-v1.json','utf8'));

assert.match(wrangler,/"main"\s*:\s*"src\/index-v14\.mjs"/);
assert.ok(v14.includes("edge-sentinel-v14-library-coverage-20260824a"));
assert.ok(v14.includes('CREATE TABLE IF NOT EXISTS library_coverage_targets'));
assert.ok(v14.includes("coverageId:'es-selae-primitiva-historical-through-2026-08-22'"));
assert.ok(v14.includes('expectedCount:4179'));
assert.ok(v14.includes("coverageId:'es-selae-euromillones-historical-through-2026-08-18'"));
assert.ok(v14.includes('expectedCount:1973'));
assert.ok(v14.includes("coverageId:'es-once-eurojackpot-2026-06'"));
assert.ok(v14.includes('expectedCount:9'));
assert.ok(v14.includes("status:expected===null?'TARGET_TOTAL_NOT_FROZEN'"));
assert.ok(v14.includes("path==='/library/coverage'"));
assert.ok(v14.includes("const numbers=parseInts(p.get('numbers'))"));
assert.ok(v14.includes("where.push('numbers_json=?')"));
assert.ok(v14.includes("const secondary=parseInts(p.get('secondary'))"));
assert.ok(v14.includes("exactCombinationFilterAvailable:true"));
assert.ok(v14.includes('coverageCannotEnableRealMoney:true'));

assert.ok(ux.includes("import './edge-library-coverage-client-v1.mjs'"));
assert.ok(ui.includes('/library/coverage'));
assert.ok(ui.includes('COBERTURA HISTÓRICA'));
assert.ok(ui.includes('TOTAL PENDIENTE DE CONGELAR'));
assert.ok(ui.includes('Nunca se marca “completo”'));

assert.equal(e.status,'ACTIVE_COVERAGE_CONTROL_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.frozenTargets.find(x=>x.id.includes('primitiva')).expectedCount,4179);
assert.equal(e.frozenTargets.find(x=>x.id.includes('euromillones')).expectedCount,1973);
assert.equal(e.frozenTargets.find(x=>x.id.includes('eurojackpot')).expectedCount,9);
assert.equal(e.hardGuards.unknownExpectedTotalCannotBeMarkedComplete,true);
assert.equal(e.hardGuards.observedRowsMustBeComparedInsideFrozenDateRange,true);
assert.equal(e.hardGuards.coveragePercentageIsNotModelAccuracy,true);
assert.equal(e.hardGuards.completeHistoryDoesNotProvePredictability,true);
assert.equal(e.hardGuards.exactCombinationMatchIsDescriptiveNotPredictive,true);
assert.equal(e.hardGuards.executionContractRemainsSoleGreenAuthority,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('edge-library-coverage-v14.test.mjs: PASS');
