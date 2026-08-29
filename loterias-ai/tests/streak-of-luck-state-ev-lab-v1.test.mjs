import assert from 'node:assert/strict';
import {solveAcyclicStreakKernel} from '../edge-backend/src/streak-of-luck-state-ev-lab-v1.mjs';
const states={};
for(let s=0;s<=9;s++){
  states[s]={paidStakeEUR:1,branches:s===9?
    [{probability:.5,immediateReturnEUR:1.8,terminal:true,terminalAwardEUR:20},{probability:.5,immediateReturnEUR:0,terminal:true,terminalAwardEUR:s>=4?5:0}]:
    [{probability:.5,immediateReturnEUR:1.8,nextState:s+1},{probability:.5,immediateReturnEUR:0,terminal:true,terminalAwardEUR:s>=4?5:0}]};
}
const r=solveAcyclicStreakKernel({states});
assert.equal(r.ok,true);
assert.equal(r.execution.realMoneyAllowed,false);
assert.ok(r.stateValuesEUR[9]>0);
assert.equal(r.rows.find(x=>x.state===9).decision,'CONTINUE_IN_PRACTICE_MODEL');
console.log('streak-of-luck-state-ev-lab-v1.test.mjs: PASS');
