import assert from 'node:assert/strict';
import fs from 'node:fs';
import { finiteNumberOrNull } from '../edge-live/number-safety-v1.mjs';

assert.equal(finiteNumberOrNull(null), null);
assert.equal(finiteNumberOrNull(undefined), null);
assert.equal(finiteNumberOrNull(''), null);
assert.equal(finiteNumberOrNull(false), null);
assert.equal(finiteNumberOrNull(true), null);
assert.equal(finiteNumberOrNull('not-a-number'), null);
assert.equal(finiteNumberOrNull('2.5'), 2.5);
assert.equal(finiteNumberOrNull(0), 0);

const registry=JSON.parse(fs.readFileSync('loterias-ai/edge-live/opportunity-registry-v1.json','utf8'));
const uvp=registry.mappings.find(x=>x.id==='botemania-ultimate-video-poker-jacks-progressive');
assert.ok(uvp);
assert.deepEqual(uvp.economic.publishedRtpRangePct,[96.77,99.54]);
assert.equal(uvp.economic.exactVariantRtpVerified,false);
assert.equal(uvp.economic.baseRtpForFixedStrategy,null);
assert.equal(uvp.economic.pRoyalFlushForFixedStrategy,null);
assert.equal(uvp.economic.breakEvenRoyalCredits,null);
assert.equal(uvp.economic.breakEvenJackpotEUR,null);
assert.equal(uvp.economic.creditValueEUR,null);
assert.equal(uvp.economic.creditValueVerified,false);
assert.equal(uvp.economic.paytableVerified,false);
assert.equal(uvp.economic.qualifyingStakeVerified,false);
assert.equal(uvp.execution.exactStakeKnown,false);
assert.equal(uvp.execution.strategyVerified,false);
assert.equal(Object.hasOwn(uvp.economic,'publishedBaseRtpPctApprox'),false);
assert.ok(uvp.economic.removedUnverifiedInputs.includes('publishedBaseRtpPctApprox=95.95'));
assert.ok(uvp.economic.removedUnverifiedInputs.includes('breakEvenRoyalCredits=81387'));

console.log('edge-number-and-uvp-evidence-v1.test.mjs: PASS');
