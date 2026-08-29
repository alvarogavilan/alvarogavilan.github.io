import assert from 'node:assert/strict';
import {classifyPersistentStateTransferability,rankPersistentStateMechanisms} from '../edge-backend/src/persistent-state-transferability-theorem-v1.mjs';

let r=classifyPersistentStateTransferability({exactCurrentOperatorRuleVerified:true,stateSharedAcrossBetSizes:true,stateDependentPayoutScalesWithCurrentBet:true,buildStakeEUR:.2,exerciseStakeEUR:7.5});
assert.equal(r.classification,'REAL_CROSS_BET_STATE_LEVERAGE');
assert.equal(r.stakeLeverageRatio,37.5);

r=classifyPersistentStateTransferability({exactCurrentOperatorRuleVerified:true,stateSavedSeparatelyPerBet:true,stateDependentPayoutScalesWithCurrentBet:true,buildStakeEUR:.2,exerciseStakeEUR:7.5});
assert.equal(r.classification,'CONDITIONAL_STATE_ONLY_NO_CROSS_BET_LEVERAGE');

r=classifyPersistentStateTransferability({exactCurrentOperatorRuleVerified:false,stateSharedAcrossBetSizes:true,stateDependentPayoutScalesWithCurrentBet:true});
assert.equal(r.classification,'UNVERIFIED_STATE_MECHANIC');

r=classifyPersistentStateTransferability({exactCurrentOperatorRuleVerified:true,stateSharedAcrossBetSizes:true,stateSavedSeparatelyPerBet:true,stateDependentPayoutScalesWithCurrentBet:true});
assert.equal(r.classification,'CONTRADICTORY_STATE_SCOPE');

const ranked=rankPersistentStateMechanisms([
  {id:'snakes',exactCurrentOperatorRuleVerified:true,stateSavedSeparatelyPerBet:true,stateDependentPayoutScalesWithCurrentBet:true},
  {id:'mermaid',exactCurrentOperatorRuleVerified:true,stateSharedAcrossBetSizes:true,stateDependentPayoutScalesWithCurrentBet:true,buildStakeEUR:.2,exerciseStakeEUR:7.5}
]);
assert.equal(ranked[0].id,'mermaid');
assert.equal(ranked[0].score,100);
assert.equal(ranked[1].id,'snakes');
assert.equal(ranked[1].score,45);
console.log('persistent-state-transferability-theorem-v1.test.mjs: PASS');
