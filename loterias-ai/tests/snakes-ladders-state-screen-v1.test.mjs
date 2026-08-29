import assert from 'node:assert/strict';
import {screenSnakeProgressNextSpin} from '../edge-backend/src/snakes-ladders-state-screen-v1.mjs';
let r=screenSnakeProgressNextSpin({totalStakeEUR:1,observedActiveSegments:10,exactCurrentOperatorProgressRuleVerified:true,exactCurrentOperatorBonusFloorVerified:true});
assert.equal(r.ok,true);assert.equal(r.minimumAdditionalProgressPointsNeeded,1);assert.equal(r.metrics.breakEvenCompletionProbabilityPct,5);assert.equal(r.execution.realMoneyAllowed,false);
r=screenSnakeProgressNextSpin({totalStakeEUR:1,observedActiveSegments:10,probabilityCompletesSnakeNextSpin:.06,exactCurrentOperatorProgressRuleVerified:true,exactCurrentOperatorBonusFloorVerified:true});
assert.equal(r.practiceVerdict,'CONSERVATIVE_POSITIVE_SNAKE_COMPLETION_ONE_SPIN_CANDIDATE');assert.equal(r.metrics.oneSpinNetEvFloorEUR,.2);
r=screenSnakeProgressNextSpin({totalStakeEUR:1,observedActiveSegments:10,probabilityCompletesSnakeNextSpin:.04,exactCurrentOperatorProgressRuleVerified:true,exactCurrentOperatorBonusFloorVerified:true});
assert.equal(r.practiceVerdict,'NON_POSITIVE_SNAKE_COMPLETION_LOWER_BOUND');
console.log('snakes-ladders-state-screen-v1.test.mjs: PASS');
