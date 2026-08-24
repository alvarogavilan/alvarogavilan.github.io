import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chiSquareQuantile, exponentialMeanConfidence } from '../edge-backend/src/winfall-confidence-v1.mjs';

const near=(actual,expected,tol=1e-9)=>assert.ok(Math.abs(actual-expected)<=tol,`${actual} != ${expected} ± ${tol}`);

near(chiSquareQuantile(0.05,20),10.85081139418259,1e-9);
near(chiSquareQuantile(0.95,20),31.410432844230918,1e-9);
near(chiSquareQuantile(0.025,20),9.590777392264867,1e-9);
near(chiSquareQuantile(0.975,20),34.16960690283833,1e-9);

assert.equal(exponentialMeanConfidence(Array(9).fill(1000),{confidence:0.95,minimumSampleSize:10}),null);
const ci=exponentialMeanConfidence(Array(10).fill(1000),{confidence:0.95,minimumSampleSize:10});
assert.equal(ci.sampleSize,10);
near(ci.meanPointEUR,1000);
near(ci.meanOneSidedUpperEUR,1843.1801340425595,1e-8);
assert.ok(ci.meanTwoSidedLowerEUR<ci.meanPointEUR);
assert.ok(ci.meanTwoSidedUpperEUR>ci.meanPointEUR);
assert.match(ci.method,/EXACT_CHI_SQUARE_INTERVAL/);

const factor=(1-0.9485)/0.006;
near(factor*ci.meanOneSidedUpperEUR,15820.629483865301,1e-8);
assert.ok(factor*ci.meanOneSidedUpperEUR>factor*ci.meanPointEUR);

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v10.mjs','utf8');
const client=fs.readFileSync('loterias-ai/edge-live/edge-science-client-v1.mjs','utf8');
const protocol=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/winfall-durable-prospective-protocol-v1.json','utf8'));
const priority=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/green-distance-priority-v1.json','utf8'));

assert.match(wrangler,/"main"\s*:\s*"src\/index-v10\.mjs"/);
assert.match(worker,/edge-sentinel-v10-winfall-confidence-20260824a/);
assert.ok(worker.includes('conservativeBreakEvenUpper95EUR'));
assert.ok(worker.includes('pointEstimateCannotEnableExecution:true'));
assert.ok(worker.includes('confidenceIntervalDoesNotRepairIdentityOrAwardAttribution:true'));
assert.ok(worker.includes('confidenceBoundCannotEnableRealMoney:true'));
assert.ok(client.includes('upper 95% conservador'));
assert.ok(client.includes('La media no basta'));
assert.equal(protocol.hardGuards.pointEstimateCannotEnableExecution,true);
assert.equal(protocol.hardGuards.oneSided95UpperBreakEvenRequiredForFutureStatisticalPromotion,true);
assert.equal(protocol.hardGuards.confidenceIntervalCannotRepairIdentityOrAwardAttribution,true);
assert.equal(protocol.hardGuards.realMoneyAllowed,false);
assert.equal(priority.hardGuards.pointEstimateCannotEnableExecution,true);
assert.equal(priority.realMoneyAllowed,false);

console.log('edge-winfall-confidence-v10.test.mjs: PASS');
