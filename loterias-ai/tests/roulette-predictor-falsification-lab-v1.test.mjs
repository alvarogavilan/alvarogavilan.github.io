import assert from 'node:assert/strict';
import {evaluatePredictionLog,axaClaimModel} from '../edge-backend/src/roulette-predictor-falsification-lab-v1.mjs';
const fair=[];for(let i=0;i<3700;i++)fair.push({outcome:i%37,predicted:[0,1,2,3,4,5],createdBeforeOutcome:true});
let r=evaluatePredictionLog(fair,{discoveryFraction:.5});assert.equal(r.ok,true);assert.equal(r.practiceVerdict,'NO_PROSPECTIVE_EDGE');assert.equal(r.execution.realMoneyAllowed,false);
const strong=[];for(let i=0;i<1000;i++){const out=i%37;strong.push({outcome:out,predicted:[out],createdBeforeOutcome:true})}r=evaluatePredictionLog(strong,{discoveryFraction:.5});assert.equal(r.practiceVerdict,'PROSPECTIVE_PREDICTOR_RESEARCH_CANDIDATE');
r=evaluatePredictionLog([{outcome:1,predicted:[1],createdBeforeOutcome:false},{outcome:2,predicted:[2],createdBeforeOutcome:true}]);assert.equal(r.reason,'NON_PROSPECTIVE_PREDICTION_PRESENT');
assert.equal(axaClaimModel().execution.decision,'NO_PLAY');console.log('roulette-predictor-falsification-lab-v1.test.mjs: PASS');
