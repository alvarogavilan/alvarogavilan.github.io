import assert from 'node:assert/strict';
import {analyzeEdgeP0HarText} from '../scripts/analyze-edge-p0-har.mjs';

const raw=JSON.stringify({log:{entries:[]}});
const lanes=['apmccoy','frank','ultimate-vp','ocean-magic'];
for(const lane of lanes){
  const out=analyzeEdgeP0HarText(raw,{lane,sourceName:`${lane}.har`});
  assert.equal(out.ok,true,`${lane} should route through the unified offline dispatcher`);
  assert.equal(out.execution.decision,'NO_PLAY');
  assert.equal(out.execution.realMoneyAllowed,false);
  assert.equal(out.execution.realStakeEUR,0);
  assert.equal(out.execution.maxSpins,0);
  assert.equal(out.execution.maxTotalStakeEUR,0);
  assert.equal(out.hardGuards.offlineOnly,true);
  assert.equal(out.hardGuards.passiveHarOnly,true);
  assert.equal(out.hardGuards.noNetwork,true);
  assert.equal(out.hardGuards.noWagerProbe,true);
  assert.equal(out.hardGuards.reviewCandidatesCannotSelfApprove,true);
}
const bad=analyzeEdgeP0HarText(raw,{lane:'regal-riches',sourceName:'regal.har'});
assert.equal(bad.ok,false);
assert.equal(bad.reason,'SUPPORTED_LANE_REQUIRED');
assert.equal(bad.execution.decision,'NO_PLAY');
assert.equal(bad.execution.realMoneyAllowed,false);
assert.deepEqual(bad.supportedLanes,lanes);
console.log('analyze-edge-p0-har-v1.test.mjs PASS');