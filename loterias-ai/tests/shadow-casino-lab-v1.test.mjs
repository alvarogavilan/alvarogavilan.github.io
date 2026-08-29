import assert from 'node:assert/strict';
import {getShadowCasinoLabManifest,runShadowEpisode,runMonteCarlo,searchPoliciesOutOfSample,enumerateFiniteStateActions,makeEuropeanRouletteControlModel} from '../edge-backend/src/shadow-casino-lab-v1.mjs';

const manifest=getShadowCasinoLabManifest();
assert.equal(manifest.execution.realMoneyAllowed,false);
assert.equal(manifest.hardGuards.noRealMoney,true);
assert.equal(manifest.hardGuards.negativeEvGamesDoNotBecomePositiveByBettingPattern,true);

const incomplete={id:'INCOMPLETE',initialState:()=>({}),actions:()=>[],transition:()=>({state:{}}),evidence:{}};
const refused=runShadowEpisode({model:incomplete,mode:'VERIFIED'});
assert.equal(refused.valid,false);
assert.ok(refused.missing.includes('evidence.exactRulesVerified'));
assert.equal(refused.execution.realMoneyAllowed,false);

const roulette=makeEuropeanRouletteControlModel({unit:1});
const one=runShadowEpisode({model:roulette,policy:()=>({type:'RED',stake:1}),seed:'deterministic',maxSteps:100,mode:'VERIFIED'});
assert.equal(one.valid,true);
assert.equal(one.steps,100);
assert.equal(one.totalStake,100);
assert.equal(one.execution.realMoneyAllowed,false);

const mc=runMonteCarlo({model:roulette,policy:()=>({type:'RED',stake:1}),episodes:20,maxSteps:100,seed:'mc-control',mode:'VERIFIED'});
assert.equal(mc.valid,true);
assert.equal(mc.episodes,20);
assert.equal(mc.aggregateStake,2000);
assert.equal(mc.execution.realMoneyAllowed,false);

const enumeration=enumerateFiniteStateActions({
  states:['S'],
  actionsForState:()=>['A'],
  transitionDistribution:()=>[{probability:.5,outcome:'W'},{probability:.5,outcome:'L'}],
  reward:(_s,_a,o)=>o.outcome==='W'?1:-1,
  stake:()=>1
});
assert.equal(enumeration.valid,true);
assert.equal(enumeration.rows[0].expectedNet,0);
assert.equal(enumeration.rows[0].expectedRoi,0);

const policySearch=searchPoliciesOutOfSample({
  model:roulette,
  policies:[
    {id:'always-red',policy:()=>({type:'RED',stake:1})},
    {id:'always-black',policy:()=>({type:'BLACK',stake:1})},
    {id:'always-17',policy:()=>({type:'STRAIGHT',number:17,stake:1})}
  ],
  discoveryEpisodes:5,
  validationEpisodes:5,
  holdoutEpisodes:5,
  maxSteps:50,
  seed:'anti-overfit',
  mode:'VERIFIED'
});
assert.equal(policySearch.valid,true);
assert.equal(policySearch.selectionRule,'DISCOVERY_ONLY');
assert.equal(policySearch.execution.realMoneyAllowed,false);
assert.equal(policySearch.hardGuards.holdoutNeverUsedForPolicySelection,true);

console.log('shadow-casino-lab-v1.test.mjs PASS');
