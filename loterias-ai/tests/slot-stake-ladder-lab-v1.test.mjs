import assert from 'node:assert/strict';
import {evaluateFixedStakeLadder,compareEqualTurnover,evaluateAdaptiveHistoryStrategy,classifyStakeChangeClaim,EXAMPLE_040_060_100} from '../edge-backend/src/slot-stake-ladder-lab-v1.mjs';
let r=evaluateFixedStakeLadder({rtpPct:95,stages:EXAMPLE_040_060_100});
assert.equal(r.totalSpins,30); assert.equal(r.totalStakeEUR,17); assert.equal(r.expectedReturnEUR,16.15); assert.equal(r.expectedNetEUR,-0.85); assert.equal(r.expectedRoiPct,-5); assert.equal(r.execution.realMoneyAllowed,false);
let c=compareEqualTurnover({rtpPct:95,a:EXAMPLE_040_060_100,b:[{stakeEUR:17/30,spins:30}]}); assert.equal(c.equalTurnover,true); assert.equal(c.expectedNetDifferenceEUR,0);
r=evaluateAdaptiveHistoryStrategy({rtpPct:95,expectedTotalStakeEUR:100}); assert.equal(r.expectedNetEUR,-5); assert.equal(r.canTurnNegativeGamePositive,false);
r=classifyStakeChangeClaim({creatorOrForumOnly:true}); assert.equal(r.status,'DISCOVERY_ONLY_UNVERIFIED');
r=classifyStakeChangeClaim({exactCurrentRulesVerified:true,explicitStakeDependentFeatureProbability:true}); assert.equal(r.status,'REAL_STAKE_DEPENDENT_MECHANIC_RESEARCH_CANDIDATE');
console.log('slot-stake-ladder-lab-v1.test.mjs: PASS');
