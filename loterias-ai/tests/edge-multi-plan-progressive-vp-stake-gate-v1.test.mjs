import assert from 'node:assert/strict';
import {qualifyingStakeStatus,laneExecutionReadyWithLifecycle} from '../edge-live/edge-live-multi-execution-plan-v1.mjs';

const ultimate={
  type:'PROGRESSIVE_VIDEO_POKER',
  economic:{qualifyingStakeVerified:false},
  execution:{exactStakeKnown:true,stakePerDecisionEUR:2.50,strategyVerified:false}
};
let s=qualifyingStakeStatus(ultimate);
assert.equal(s.configuredStake,2.5);
assert.equal(s.configuredExact,true);
assert.equal(s.requiresJackpotQualification,true);
assert.equal(s.jackpotQualifyingStakeVerified,false);
assert.equal(s.exactStakeKnown,false);
assert.equal(laneExecutionReadyWithLifecycle(null,true,s.exactStakeKnown,true),false);

s=qualifyingStakeStatus({...ultimate,economic:{qualifyingStakeVerified:true}});
assert.equal(s.jackpotQualifyingStakeVerified,true);
assert.equal(s.exactStakeKnown,true);
assert.equal(laneExecutionReadyWithLifecycle(null,true,s.exactStakeKnown,true),true);

const regular={type:'MUST_BE_WON_BY_PROGRESSIVE_NETWORK',execution:{exactStakeKnown:true,stakePerDecisionEUR:0.10}};
s=qualifyingStakeStatus(regular);
assert.equal(s.requiresJackpotQualification,false);
assert.equal(s.exactStakeKnown,true);

assert.equal(qualifyingStakeStatus({...ultimate,execution:{exactStakeKnown:true,stakePerDecisionEUR:null}}).exactStakeKnown,false);
assert.equal(qualifyingStakeStatus({...ultimate,execution:{exactStakeKnown:false,stakePerDecisionEUR:2.5},economic:{qualifyingStakeVerified:true}}).exactStakeKnown,false);

console.log('edge-multi-plan-progressive-vp-stake-gate-v1.test.mjs: PASS');
