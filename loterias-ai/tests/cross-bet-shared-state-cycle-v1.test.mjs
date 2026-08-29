import assert from 'node:assert/strict';
import {screenSharedStateCycle,screenTerminalIndicatorLeverage,rankSharedStateFrontier} from '../edge-backend/src/cross-bet-shared-state-cycle-v1.mjs';

let r=screenSharedStateCycle({exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:8});
assert.equal(r.classification,'STRUCTURAL_SHARED_STATE_LEVERAGE_UNCLOSED');
assert.equal(r.metrics.stakeLeverageRatio,40);

r=screenSharedStateCycle({exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:8,expectedNetBuildCostInBuildStakeUnits:20,expectedNetExerciseGainInExerciseStakeUnits:1});
assert.equal(r.classification,'POSITIVE_CYCLE_MATH_REQUIRES_PROSPECTIVE_VALIDATION');
assert.equal(r.metrics.breakEvenStakeLeverageRatio,20);
assert.equal(r.metrics.cycleNetEvEUR,4);
assert.equal(r.execution.realMoneyAllowed,false);

r=screenTerminalIndicatorLeverage({exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,featureUsesTriggeringSpinStake:true,indicatorsFilled:4,totalIndicators:5,buildStakeEUR:.20,exerciseStakeEUR:40});
assert.equal(r.classification,'ONE_EVENT_FROM_SHARED_STATE_TERMINAL_TRIGGER');
assert.equal(r.metrics.indicatorsNeeded,1);
assert.equal(r.metrics.stakeLeverageRatio,200);

const ranked=rankSharedStateFrontier([
  {id:'athena',exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,stateDependentAwardUsesCurrentOrTriggerStake:true,buildStakeEUR:.20,exerciseStakeEUR:8},
  {id:'unstoppable',terminal:true,exactCurrentOperatorRuleVerified:true,stateSurvivesBetChange:true,featureUsesTriggeringSpinStake:true,indicatorsFilled:4,totalIndicators:5,buildStakeEUR:.20,exerciseStakeEUR:40}
]);
assert.equal(ranked[0].id,'unstoppable');
assert.equal(ranked[0].result.metrics.stakeLeverageRatio,200);
console.log('cross-bet-shared-state-cycle-v1.test.mjs: PASS');
