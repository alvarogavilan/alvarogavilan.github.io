import {breakEvenCompletionProbability,evaluateTerminalWait} from '../edge-backend/src/shared-terminal-wait-cost-v1.mjs';

const a=breakEvenCompletionProbability({exerciseStakeEUR:40,featureGrossFloorX:3.2,netBuildCostEUR:0});
if(Math.abs(a.breakEvenProbability-0.3125)>1e-12)throw new Error(`unexpected zero-build threshold ${JSON.stringify(a)}`);
const b=breakEvenCompletionProbability({exerciseStakeEUR:40,featureGrossFloorX:3.2,netBuildCostEUR:4});
if(Math.abs(b.breakEvenProbability-(1/3.1))>1e-8)throw new Error(`unexpected build-cost threshold ${JSON.stringify(b)}`);
const c=evaluateTerminalWait({exerciseStakeEUR:40,completionProbabilityPerExerciseSpin:.4,featureGrossFloorX:3.2,netBuildCostEUR:0});
if(c.practiceVerdict!=='ROBUST_POSITIVE_TERMINAL_WAIT_CYCLE')throw new Error(`unexpected verdict ${JSON.stringify(c)}`);
console.log('shared-terminal-wait-cost-v1.test.mjs: PASS');
