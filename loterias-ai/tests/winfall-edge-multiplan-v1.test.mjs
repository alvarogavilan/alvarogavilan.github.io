import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const run=spawnSync(process.execPath,['loterias-ai/edge-live/edge-live-multi-execution-plan-v1.mjs'],{encoding:'utf8'});
assert.equal(run.status,0,run.stderr||run.stdout||'multi-plan failed');
const plan=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/edge-live-multi-execution-plan-v1.json','utf8'));
const lane=(plan.lanes||[]).find(x=>x.id==='botemania-winfall-wishes-progressive');
assert.ok(lane,'Winfall lane must be generated into the EDGE multi-plan');
assert.equal(lane.phase,'RED');
assert.equal(lane.executionReady,false);
assert.equal(lane.prepareOnly,false);
assert.equal(lane.order?.action,'DO_NOT_PLAY');
assert.equal(lane.order?.stakePerSpinEUR,0);
assert.equal(lane.order?.maxSpins,0);
assert.equal(lane.order?.maxTotalStakeEUR,0);
assert.equal(lane.evidence?.identityVerified,false);
assert.equal(lane.evidence?.thresholdKnown,false);
assert.equal(lane.evidence?.economicPass,false);
assert.ok(lane.blockers?.includes('LIVE_COUNTER_IDENTITY_NOT_VERIFIED'));
assert.ok(lane.blockers?.includes('BREAK_EVEN_THRESHOLD_EUR_NOT_VERIFIED'));
assert.equal(plan.guards?.realMoneyAllowed,(plan.lanes||[]).some(x=>x.executionReady===true));

console.log('winfall-edge-multiplan-v1.test.mjs: PASS');
