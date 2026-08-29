import assert from 'node:assert/strict';
import {screenOperatorCrossBetFrontier} from '../edge-backend/src/cross-bet-operator-frontier-v1.mjs';
const r=screenOperatorCrossBetFrontier([
  {id:'jokerbet',operator:'JOKERBET Spain',title:'Mermaid Frenzy',minStakeEUR:.20,maxStakeEUR:7.50,exactCurrentStakeEndpointsVerified:true,exactCurrentCrossBetStateRuleVerified:true,currentStakeScalesStatePayout:true},
  {id:'enracha',operator:'enracha Spain',title:'Mermaid Frenzy',minStakeEUR:.10,maxStakeEUR:10,exactCurrentStakeEndpointsVerified:true,exactCurrentCrossBetStateRuleVerified:false,currentStakeScalesStatePayout:false}
]);
assert.equal(r.verifiedMechanicLeader.id,'jokerbet');
assert.equal(r.verifiedMechanicLeader.stakeRatio,37.5);
assert.equal(r.potentialRatioLeader.id,'enracha');
assert.equal(r.potentialRatioLeader.stakeRatio,100);
assert.equal(r.potentialRatioLeader.classification,'DISCOVERY_RULE_BINDING_REQUIRED');
assert.equal(r.execution.realMoneyAllowed,false);
console.log('cross-bet-operator-frontier-v1.test.mjs: PASS');
