import assert from 'node:assert/strict';
import {generateFairEuropeanSpins,runAxaRepeatedNumberProxy,practiceAxaProxy,exactFairStraightSetExpectation} from '../edge-backend/src/roulette-axa-proxy-practice-v1.mjs';
let g=generateFairEuropeanSpins({spins:10,seed:7});assert.equal(g.length,10);
let r=runAxaRepeatedNumberProxy({spins:[1,2,1,3,4,5,6,1,7,1,8,9],lookback:6,minRepeat:2,betWindow:3});assert.equal(r.isExactAxaAlgorithm,false);assert.equal(r.execution.realMoneyAllowed,false);
r=practiceAxaProxy({spins:10000,seed:42});assert.equal(r.spinCount,10000);assert.equal(r.sourceModel,'FAIR_SINGLE_ZERO_RNG');
const e=exactFairStraightSetExpectation();assert.ok(Math.abs(e.expectedRoiPct+2.7027027027)<1e-9);assert.equal(e.execution.decision,'NO_PLAY');
console.log('roulette-axa-proxy-practice-v1.test.mjs: PASS');
