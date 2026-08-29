import assert from 'node:assert/strict';
import {solveFiniteHorizonExact,simulatePolicy,searchParameterGrid,walkForwardShadow,buildVirtualLabReport} from '../edge-lab/edge-virtual-casino-lab-v1.mjs';

const exact=solveFiniteHorizonExact({
  initialState:{x:0},horizon:2,
  actions:()=>['SAFE','RISKY'],
  outcomes:(state,action)=>action==='SAFE'
    ?[{p:1,nextState:{x:state.x+1},reward:0.10}]
    :[{p:.5,nextState:{x:state.x+1},reward:1},{p:.5,nextState:{x:state.x+1},reward:-1}]
});
assert.equal(exact.bestInitialAction,'SAFE');
assert.ok(Math.abs(exact.expectedNet-.2)<1e-12);
assert.equal(exact.execution.realMoneyAllowed,false);

const mc=simulatePolicy({
  initialStateFactory:()=>({}),policy:()=> 'A',episodes:10000,maxSteps:1,seed:123,
  outcomes:()=>[{p:.6,nextState:{},reward:1,terminal:true},{p:.4,nextState:{},reward:-1,terminal:true}]
});
assert.equal(mc.episodes,10000);
assert.ok(mc.summary.mean>0.1&&mc.summary.mean<0.3);
assert.equal(mc.execution.decision,'NO_PLAY');

const grid=searchParameterGrid({grid:{threshold:[1,2,3],stake:[.1,.2]},evaluate:p=>({score:p.threshold-p.stake})});
assert.equal(grid.combinationsEvaluated,6);
assert.deepEqual(grid.best.params,{threshold:3,stake:.1});
assert.equal(grid.execution.realMoneyAllowed,false);

const events=[{observation:{meter:1},outcome:'W'},{observation:{meter:5},outcome:'L'}];
const wf=walkForwardShadow({events,policy:o=>o.meter<=1?'PLAY':'SKIP',scoreDecision:({decision,event})=>({eligible:decision==='PLAY',score:decision==='PLAY'?(event.outcome==='W'?1:-1):0})});
assert.equal(wf.decisions[0].decision,'PLAY');
assert.equal(wf.decisions[1].decision,'SKIP');
assert.equal(wf.execution.realMoneyAllowed,false);

const report=buildVirtualLabReport({exact,monteCarlo:mc,grid,walkForward:wf,modelFingerprint:'TOY'});
assert.equal(report.simulatedPositiveEdgeObserved,true);
assert.equal(report.promotion,'RESEARCH_ONLY_MODEL_RESULT');
assert.equal(report.execution.decision,'NO_PLAY');
assert.equal(report.execution.realMoneyAllowed,false);

console.log('edge-virtual-casino-lab-v1.test.mjs PASS');
