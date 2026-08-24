import assert from 'node:assert/strict';
import fs from 'node:fs';

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const v6=fs.readFileSync('loterias-ai/edge-backend/src/index-v6.mjs','utf8');
const v11=fs.readFileSync('loterias-ai/edge-backend/src/index-v11.mjs','utf8');
const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/ath-ledger-semantics-v1.json','utf8'));

assert.match(wrangler,/"main"\s*:\s*"src\/index-v11\.mjs"/);
assert.ok(v6.includes('minEUR:value,maxEUR:value'));
assert.ok(v6.includes('s.maxEUR=Math.max(Number(s.maxEUR),value)'));
assert.ok(v11.includes("edge-sentinel-v11-ath-ledger-20260824a"));
assert.ok(v11.includes('CREATE TABLE IF NOT EXISTS meter_ath'));
assert.ok(v11.includes("path==='/science/ath'"));
assert.ok(v11.includes("type:'ALL_TIME_HIGH_OBSERVED'"));
assert.ok(v11.includes("scope:'SINCE_EDGE_MONITORING'"));
assert.ok(v11.includes('globalAllTimeHighBeforeEdge:null'));
assert.ok(v11.includes('athTimestampExact:Number(r.max_timestamp_exact)===1'));
assert.ok(v11.includes('currentPctOfObservedATH'));
assert.ok(v11.includes('distanceBelowObservedATH_EUR'));
assert.ok(v11.includes('observedAthIsNotGlobalPreMonitoringAth:true'));
assert.ok(v11.includes('athProximityIsNotPositiveEv:true'));
assert.ok(v11.includes('athCannotReplaceHazardOrThreshold:true'));
assert.ok(v11.includes('realMoneyAllowed:false'));
assert.equal(e.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.existingPreV11Coverage.samplingCadenceTargetMs,5000);
assert.ok(e.existingPreV11Coverage.fieldsAlreadyPersisted.includes('maxEUR'));
assert.equal(e.v11Ledger.endpoint,'/science/ath');
assert.equal(e.v11Ledger.newAthEventType,'ALL_TIME_HIGH_OBSERVED');
assert.equal(e.hardGuards.observedAthIsNotGlobalPreMonitoringAth,true);
assert.equal(e.hardGuards.athProximityIsNotPositiveEv,true);
assert.equal(e.hardGuards.athCannotReplaceVerifiedThreshold,true);
assert.equal(e.hardGuards.executionContractRemainsSoleGreenAuthority,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('edge-ath-ledger-v11.test.mjs: PASS');
