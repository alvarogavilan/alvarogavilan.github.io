import assert from 'node:assert/strict';
import {exactFairSetMath,auditAxaRecoveredSelector} from '../edge-backend/src/axa-recovered-selector-theorem-v1.mjs';
for (const k of [1,5,18,36]) {
  const r=exactFairSetMath(k,{horizon:3});
  assert.equal(r.ok,true);
  assert.ok(Math.abs(r.expectedRoi+1/37)<1e-12);
  assert.equal(r.execution.realMoneyAllowed,false);
}
const a=auditAxaRecoveredSelector({setSizes:[5,18,36],selectorIndependentOfCasinoOutcome:true,horizon:3});
assert.equal(a.conclusion,'INTERNAL_RANDOM_SET_SELECTION_CANNOT_CHANGE_FAIR_ROULETTE_EXPECTATION');
assert.ok(Math.abs(a.exactFairRoiIfIndependent+1/37)<1e-12);
assert.equal(a.execution.decision,'NO_PLAY');
console.log('axa-recovered-selector-theorem-v1.test.mjs: PASS');
