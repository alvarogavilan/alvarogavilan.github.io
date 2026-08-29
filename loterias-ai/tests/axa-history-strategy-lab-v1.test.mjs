import assert from 'node:assert/strict';
import {predictFromHistory,exactFairHistoryOnlyEV,simulateAxaLike,sweepAxaLike} from '../edge-backend/src/axa-history-strategy-lab-v1.mjs';
assert.deepEqual(predictFromHistory([1,2,1,3,4,1],{lookback:6,minRepeats:2}),[1]);
const ev=exactFairHistoryOnlyEV(6);assert.equal(ev.hitProbability,6/37);assert.equal(ev.breakEvenHitProbability,6/36);assert.equal(ev.houseEdgeOnTotalStakePct,100/37);
let r=simulateAxaLike({spins:20000,seed:77,lookback:6,minRepeats:2,horizon:3});assert.equal(r.execution.realMoneyAllowed,false);assert.ok(r.totalStakeUnits>0);assert.equal(r.hardGuards.historyOnlyCannotBeatFairIndependentRng,true);
const biased=simulateAxaLike({spins:100000,seed:77,bias:{17:5},lookback:12,minRepeats:2,horizon:3});assert.ok(biased.roiPct>0);assert.equal(biased.execution.decision,'NO_PLAY');
const sw=sweepAxaLike({spins:5000,seed:3,lookbacks:[6,12],minRepeatsList:[2],neighborRadii:[0,1]});assert.equal(sw.variants.length,4);assert.equal(sw.execution.realMoneyAllowed,false);
console.log('axa-history-strategy-lab-v1.test.mjs: PASS');
