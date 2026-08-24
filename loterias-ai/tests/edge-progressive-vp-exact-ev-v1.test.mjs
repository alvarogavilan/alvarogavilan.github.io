import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateFixedStrategyProgressiveVp } from '../edge-live/progressive-vp-exact-ev-v1.mjs';

const flags={exactPaytableVerified:true,exactStakeVerified:true,exactEventProbabilityVerified:true,baselineAwardVerified:true,sameFixedStrategyVerified:true,rulesFingerprintVerified:true,configurationIdentityVerified:true};
const exact=evaluateFixedStrategyProgressiveVp({baseRtpWithBaselineAward:0.96,progressiveEventProbabilityPerDecision:1/100000,totalStakePerDecisionEUR:1,baselineProgressiveAwardEUR:1000,currentProgressiveAwardEUR:5000,...flags});
assert.equal(exact.scientificInputsVerified,true);
assert.ok(Math.abs(exact.breakEvenAwardEUR-5000)<1e-9);
assert.ok(Math.abs(exact.currentRtp-1)<1e-12);
assert.ok(Math.abs(exact.edgeFraction)<1e-12);

const above=evaluateFixedStrategyProgressiveVp({baseRtpWithBaselineAward:0.96,progressiveEventProbabilityPerDecision:1/100000,totalStakePerDecisionEUR:1,baselineProgressiveAwardEUR:1000,currentProgressiveAwardEUR:6000,...flags});
assert.ok(above.currentRtp>1);
assert.equal(above.guards.noExecutionPromotion,true);

const blocked=evaluateFixedStrategyProgressiveVp({baseRtpWithBaselineAward:0.96,progressiveEventProbabilityPerDecision:1/100000,totalStakePerDecisionEUR:1,baselineProgressiveAwardEUR:1000,currentProgressiveAwardEUR:6000});
assert.equal(blocked.status,'BLOCKED_UNVERIFIED_INPUTS');
assert.equal(blocked.scientificInputsVerified,false);
assert.equal(blocked.currentRtp,null);
assert.equal(blocked.breakEvenAwardEUR,null);

const evidence=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/progressive-vp-exact-ev-method-v1.json','utf8'));
assert.equal(evidence.realMoneyAllowed,false);
assert.equal(evidence.botemaniaUltimateVideoPoker.breakEvenAwardEUR,null);
assert.equal(evidence.botemaniaUltimateVideoPoker.thresholdVerified,false);
assert.equal(evidence.gamesysCalibrationControl.thresholdTransferAllowed,false);
assert.equal(evidence.playtechComparator.thresholdTransferAllowed,false);
assert.equal(evidence.execution.decision,'NO_PLAY');
for(const key of ['identityVerified','thresholdVerified','stakeVerified','strategyVerified','rulesFingerprintVerified','prospectiveValidationPassed'])assert.equal(evidence.execution[key],false);
assert.equal(evidence.hardGuards.researchEngineCannotEnableExecutionContract,true);

console.log('edge-progressive-vp-exact-ev-v1.test.mjs: PASS');
