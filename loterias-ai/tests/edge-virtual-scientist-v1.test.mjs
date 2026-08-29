import assert from 'node:assert/strict';
import {runDiscoveryTournament,validateFrozenPolicy,prospectivelyScoreFrozenPolicy} from '../edge-lab/edge-virtual-scientist-v1.mjs';

const modelFactory=params=>({
  initialStateFactory:()=>({}),
  outcomes:(_state,action)=>action==='PLAY'
    ?[{p:.60,nextState:{},reward:1,terminal:true},{p:.40,nextState:{},reward:-1,terminal:true}]
    :[{p:1,nextState:{},reward:0,terminal:true}]
});
const buildPolicy=params=>()=>params.threshold<=2?'PLAY':'SKIP';

const d=runDiscoveryTournament({grid:{threshold:[1,2,3]},buildPolicy,modelFactory,episodesPerCandidate:5000,maxSteps:1,seedBase:44});
assert.equal(d.candidatesEvaluated,3);
assert.ok([1,2].includes(d.best.params.threshold));
assert.equal(d.execution.realMoneyAllowed,false);

const v=validateFrozenPolicy({frozenParams:{threshold:1},buildPolicy,modelFactory,validationSeeds:[101,102],episodesPerSeed:5000,maxSteps:1});
assert.equal(v.runs.length,2);
assert.equal(v.execution.decision,'NO_PLAY');
assert.equal(v.execution.realMoneyAllowed,false);

const p=prospectivelyScoreFrozenPolicy({
  frozenParams:{threshold:1},
  observations:[{observation:{x:1},outcome:1},{observation:{x:2},outcome:-1}],
  decide:()=> 'PLAY',
  score:({decision,observation})=>({eligible:decision==='PLAY',score:observation.outcome})
});
assert.equal(p.eligible,2);
assert.equal(p.cumulativeScore,0);
assert.equal(p.execution.realMoneyAllowed,false);

console.log('edge-virtual-scientist-v1.test.mjs PASS');
