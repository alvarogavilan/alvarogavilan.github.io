import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const run=spawnSync(process.execPath,['loterias-ai/edge-live/progressive-score-research-v1.mjs'],{encoding:'utf8'});
assert.equal(run.status,0,run.stderr||run.stdout||'SCORE research failed');
const score=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/progressive-score-research-v1.json','utf8'));
const row=(score.rows||[]).find(x=>x.id==='botemania-winfall-wishes-progressive');
assert.ok(row,'Winfall must be present in SCORE research after registry integration');
assert.equal(row.monitor?.key,'generic:tikitemple2_1');
assert.equal(row.identity?.verified,false);
assert.equal(row.score?.seed,0);
assert.equal(row.score?.averageHit,null);
assert.equal(row.score?.exactScore,null);
assert.equal(row.score?.nominalCrossUnitResearchScore,null);
assert.equal(row.score?.inputsComparable,false);
assert.equal(row.economic?.estimatedCurrentRtpPct,null);
assert.equal(row.economic?.exactEconomicPass,false);
assert.equal(row.economic?.executionPromotionAllowed,false);
assert.ok(row.blockers?.includes('COUNTER_IDENTITY_NOT_FULLY_VERIFIED'));
assert.ok(row.blockers?.includes('SCORE_INPUT_UNITS_NOT_COMPARABLE'));
assert.ok(row.blockers?.includes('RTP_COMPONENTS_NOT_VERIFIED'));
assert.ok(row.blockers?.includes('EXECUTION_STRATEGY_NOT_VERIFIED'));
assert.equal(score.guards?.nullNeverCoercedToZero,true);
assert.equal(score.guards?.realMoneyAllowed,false);

console.log('winfall-score-failclosed-v1.test.mjs: PASS');
