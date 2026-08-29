import assert from 'node:assert/strict';
import {generateScalarThresholdPolicies,generateVectorScorePolicies,generateMagicOfTheNileGemPolicies,generatePersistentMeterPolicies,generateTimedJackpotPolicies,generateProgressiveVideoPokerPolicies,getShadowPolicyLibraryManifest} from '../edge-backend/src/shadow-policy-library-v1.mjs';

const manifest=getShadowPolicyLibraryManifest();
assert.equal(manifest.execution.realMoneyAllowed,false);
assert.equal(manifest.hardGuards.generatedPolicyIsNotExecutionAdvice,true);

const scalar=generateScalarThresholdPolicies({field:'meter',thresholds:[10,20],playAction:{type:'PLAY'}});
assert.equal(scalar.length,2);
assert.deepEqual(scalar[0].policy({meter:15},[{type:'PLAY'}]),{type:'PLAY'});
assert.equal(scalar[1].policy({meter:15},[{type:'PLAY'}]),null);

const vector=generateVectorScorePolicies({fields:['a','b'],weightSets:[[1,2]],thresholds:[5],playAction:{type:'PLAY'}});
assert.equal(vector.length,1);
assert.deepEqual(vector[0].policy({a:1,b:2},[{type:'PLAY'}]),{type:'PLAY'});

const magic=generateMagicOfTheNileGemPolicies();
assert.ok(magic.length>20);
assert.ok(magic.some(x=>x.metadata.family==='MAGIC_WEIGHTED_GEMS'));

const meters=generatePersistentMeterPolicies({meterFields:['minor','major'],boundaries:{minor:75,major:100}});
assert.ok(meters.length>5);

const timed=generateTimedJackpotPolicies({amountThresholds:[100,500],secondsPastGhtThresholds:[0,5],raceProbabilityThresholds:[.001,.01]});
assert.equal(timed.length,8);

const vp=generateProgressiveVideoPokerPolicies({jackpotThresholds:[1000,5000,10000]});
assert.equal(vp.length,3);
assert.equal(vp[1].metadata.jackpotThreshold,5000);

console.log('shadow-policy-library-v1.test.mjs PASS');
