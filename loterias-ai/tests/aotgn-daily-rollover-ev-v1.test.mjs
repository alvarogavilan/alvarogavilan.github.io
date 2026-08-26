import assert from 'node:assert/strict';
import {evaluateAotgnDailyRolloverWindow} from '../casino/jackpots/aotgn-daily-rollover-ev-v1.mjs';

const blocked=evaluateAotgnDailyRolloverWindow({
  rulesSourceVerified:true,dailyActiveVerified:true,
  currentDailyJackpotEUR:100,stakeEUR:0.10,sameSessionFreshnessVerified:true
});
assert.equal(blocked.conditionalJackpotWinProbability,null);
assert.equal(blocked.worstCaseNetLowerBoundEUR,null);
assert.equal(blocked.decision,'NO_PLAY');
assert.ok(blocked.blockers.includes('ROLLOVER_WITHOUT_ACTIVATION_NOT_VERIFIED'));

const deterministic=evaluateAotgnDailyRolloverWindow({
  rulesSourceVerified:true,dailyActiveVerified:true,
  rolloverWithoutActivationVerified:true,
  firstNetworkContributionPrecommitAttainableVerified:true,
  currentDailyJackpotEUR:100,stakeEUR:0.10,
  sameSessionFreshnessVerified:true,
  prospectivePassiveValidationPassed:false
});
assert.equal(deterministic.conditionalJackpotWinProbability,1);
assert.equal(deterministic.assumedBaseGameReturnEUR,0);
assert.ok(Math.abs(deterministic.worstCaseNetLowerBoundEUR-99.9)<1e-12);
assert.equal(deterministic.positiveEvLowerBoundProven,true);
assert.equal(deterministic.executionCandidate,false);
assert.equal(deterministic.decision,'NO_PLAY');

const validated=evaluateAotgnDailyRolloverWindow({
  rulesSourceVerified:true,dailyActiveVerified:true,
  rolloverWithoutActivationVerified:true,
  firstNetworkContributionPrecommitAttainableVerified:true,
  currentDailyJackpotEUR:0.11,stakeEUR:0.10,
  sameSessionFreshnessVerified:true,
  prospectivePassiveValidationPassed:true
});
assert.ok(validated.worstCaseNetLowerBoundEUR>0);
assert.equal(validated.executionCandidate,true);
assert.equal(validated.guards.realMoneyAllowed,false);
console.log('aotgn-daily-rollover-ev-v1.test.mjs: PASS');
