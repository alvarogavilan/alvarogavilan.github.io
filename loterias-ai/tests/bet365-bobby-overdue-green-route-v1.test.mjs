import assert from 'node:assert/strict';
import {evaluateBet365BobbyOverdueGreenRoute} from '../edge-backend/src/bet365-bobby-overdue-green-route-v1.mjs';

const economics={
  version:'bet365-bobby-overdue-economics-screen-v1',valid:true,probabilityScreenPassed:true,
  stakeEUR:0.10,currentDailyJackpotEUR:1000,breakEvenFirstBetProbability:0.0000055,
  firstBetProbabilityLowerBound:0.001,decision:'NO_PLAY',realMoneyAllowed:false,
};
const calibration={
  version:'bet365-sporting-prospective-calibration-v1',valid:true,prospectiveCalibrationCandidate:true,
  empiricalModernResponseMappingVerified:true,allCapturesStrictlyAfterFreezeCommit:true,
};
const race={
  version:'sporting-legends-empirical-race-bound-v1.2-explicit-binomial-assumptions',valid:true,
  source:'VALIDATED_PASSIVE_CYCLE_LEDGER',usableForExecution:true,executionAssumptionsClosed:true,
  firstBetRaceProbabilityLowerBound:0.001,
};
const fake='a'.repeat(40);

let r=evaluateBet365BobbyOverdueGreenRoute({
  economicsScreen:economics,prospectiveCalibration:calibration,raceEvidence:race,
  independentReview:{sessionBindingReviewCommit:fake,servedStakeReviewCommit:fake,operatorRuleReviewCommit:fake,raceLedgerReviewCommit:fake},
});
assert.equal(r.valid,false);
assert.equal(r.reason,'INDEPENDENT_REVIEW_ALLOWLIST_REQUIRED');
assert.equal(r.greenCandidate,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);
assert.equal(r.execution.maxTotalStakeEUR,0);
assert.deepEqual(r.reviewStatus,{sessionBindingReviewApproved:false,servedStakeReviewApproved:false,operatorRuleReviewApproved:false,raceLedgerReviewApproved:false});

r=evaluateBet365BobbyOverdueGreenRoute({economicsScreen:{...economics,probabilityScreenPassed:false},prospectiveCalibration:calibration,raceEvidence:race});
assert.equal(r.reason,'ECONOMIC_RACE_THRESHOLD_NOT_CLEARED');

r=evaluateBet365BobbyOverdueGreenRoute({economicsScreen:economics,prospectiveCalibration:{...calibration,allCapturesStrictlyAfterFreezeCommit:false},raceEvidence:race});
assert.equal(r.reason,'PROSPECTIVE_CALIBRATION_NOT_CLOSED');

r=evaluateBet365BobbyOverdueGreenRoute({economicsScreen:economics,prospectiveCalibration:calibration,raceEvidence:{...race,usableForExecution:false}});
assert.equal(r.reason,'RACE_LEDGER_EXECUTION_ASSUMPTIONS_NOT_CLOSED');

r=evaluateBet365BobbyOverdueGreenRoute({economicsScreen:economics,prospectiveCalibration:calibration,raceEvidence:{...race,firstBetRaceProbabilityLowerBound:0.000001}});
assert.equal(r.reason,'REVIEWED_RACE_BOUND_NOT_ABOVE_BREAK_EVEN');

console.log('bet365-bobby-overdue-green-route-v1.test.mjs: PASS');
