import assert from 'node:assert/strict';
import {contributionCapThreshold,classifyStakeScalingEvidence,compareStakeScalingHypotheses} from '../edge-backend/src/aotg-live-roulette-stake-scaling-gate-v1.mjs';
assert.ok(Math.abs(contributionCapThreshold({contributionRatePct:0.99,contributionCapEUR:0.25})-25.2525252525)<1e-8);
let r=classifyStakeScalingEvidence([
 {sourceClass:'OPERATOR_EDITORIAL',source:'PokerStars Spain',exactProductBinding:false,model:'INDEPENDENT_OF_STAKE'},
 {sourceClass:'SPECIALIST_REVIEW',source:'SportsBoom',exactProductBinding:false,model:'PROPORTIONAL_TO_STAKE'}
]);
assert.equal(r.status,'CROSS_SOURCE_CONFLICT_REQUIRES_EXACT_RULE');
assert.equal(r.execution.realMoneyAllowed,false);
r=classifyStakeScalingEvidence([{sourceClass:'CURRENT_OPERATOR_EXACT_RULE',source:'Exact served rules',exactProductBinding:true,model:'PROPORTIONAL_TO_CONTRIBUTION'}]);
assert.equal(r.status,'EXACT_MODEL_RESEARCH_VERIFIED');
assert.equal(r.executionAllowed,false);
const h=compareStakeScalingHypotheses({contributionRatePct:0.99,contributionCapEUR:0.25,minimumStakeEUR:1,maximumStakeEUR:100,steps:100});
assert.equal(h.ok,true);
assert.ok(Math.abs(h.metrics.contributionCapThresholdStakeEUR-25.25252525)<1e-6);
assert.equal(h.bestByModel.INDEPENDENT_OF_STAKE.stakeEUR,1);
assert.equal(h.bestByModel.PROPORTIONAL_TO_STAKE.stakeEUR,1);
assert.equal(h.bestByModel.PROPORTIONAL_TO_CONTRIBUTION.stakeEUR,1);
assert.equal(h.practiceVerdict,'MODEL_DISCRIMINATION_REQUIRED_BEFORE_ANY_ECONOMIC_USE');
assert.equal(h.execution.realMoneyAllowed,false);
console.log('aotg-live-roulette-stake-scaling-gate-v1.test.mjs: PASS');
