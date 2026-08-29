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
  assert.equal(out.hardGuards.laneSpecificSummaryRequired,true);
}
const bad=analyzeEdgeP0HarText(raw,{lane:'regal-riches',sourceName:'regal.har'});
assert.equal(bad.ok,false);
assert.equal(bad.reason,'SUPPORTED_LANE_REQUIRED');
assert.equal(bad.execution.decision,'NO_PLAY');
assert.equal(bad.execution.realMoneyAllowed,false);
assert.deepEqual(bad.supportedLanes,lanes);

const entry=(url,text)=>({request:{url,headers:[]},response:{status:200,content:{mimeType:'text/plain',text}}});
const oceanRaw=JSON.stringify({log:{entries:[
  entry('https://www.enracha.es/juegos/ocean-magic','Ocean Magic'),
  entry('https://games.example/config','Ocean Magic IGT RTP 92.18 minimum 0.50 maximum 250'),
  entry('https://games.example/help','Ocean Magic IGT bubble positions remain persistent per bet level')
]}});
const ocean=analyzeEdgeP0HarText(oceanRaw,{lane:'ocean-magic',sourceName:'ocean.har'});
assert.equal(ocean.ok,true);
assert.equal(ocean.closed.exactTargetSessionObserved,true);
assert.equal(ocean.closed.configurationCandidateObserved,true);
assert.equal(ocean.closed.persistentStateCandidateObserved,true);
assert.equal(ocean.closed.crossPlayerPersistenceVerified,false);
assert.equal(Object.hasOwn(ocean.closed,'servedRuleReviewCandidatesFound'),false,'Ocean Magic must never receive the Ultimate VP summary shape just because targetPageObserved=true');
assert.equal(ocean.execution.decision,'NO_PLAY');
assert.equal(ocean.execution.realMoneyAllowed,false);

console.log('analyze-edge-p0-har-v1.test.mjs PASS');
