import assert from 'node:assert/strict';
import fs from 'node:fs';

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const source=fs.readFileSync('loterias-ai/edge-backend/src/index-v8.mjs','utf8');
const client=fs.readFileSync('loterias-ai/edge-live/edge-science-client-v1.mjs','utf8');

assert.match(wrangler,/"main"\s*:\s*"src\/index-v8\.mjs"/);
assert.match(source,/DEPLOYMENT_FINGERPRINT='edge-sentinel-v8-jpk-reset-distributions-20260824a'/);
for(const key of ['blueprint:JACKPOTKING','blueprint:JACKPOTKING_REGAL','blueprint:JACKPOTKING_ROYAL'])assert.ok(source.includes(key));
assert.ok(source.includes("path==='/science/jpk'"));
assert.match(source,/resetCandidateIsNotAwardProof:true/);
assert.match(source,/candidateEndpointIsNotMustBeWonByEndpoint:true/);
assert.match(source,/capProximityIsNotPositiveEV:true/);
assert.match(source,/noHazardInferredFromDropDistribution:true/);
assert.match(source,/noThresholdInferredFromDropDistribution:true/);
assert.match(source,/telemetryCannotEnableRealMoney:true/);
assert.match(source,/executionContractRemainsSoleGreenAuthority:true/);
assert.ok(client.includes('/science/jpk?limit=200'));
assert.ok(client.includes('Caída ≠ premio'));
assert.ok(client.includes('distribución ≠ hazard/EV'));

console.log('edge-jpk-reset-distributions-v1.test.mjs: PASS');
