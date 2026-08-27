import assert from 'node:assert/strict';
import {classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency,deriveBetfairApMcCoyFrozenHorizonSurvivalCurve} from '../casino/jackpots/betfair-apmccoy-post-ght-survival-curve-v1.mjs';

const success={detectionTimestamp:100,lastConfirmedUnawardedTimestamp:140,firstObservedAwardOrResetTimestamp:150};
assert.equal(classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency(success,20).classification,'SUCCESS');
assert.equal(classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency(success,40).classification,'SUCCESS');
assert.equal(classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency(success,45).classification,'AMBIGUOUS');
assert.equal(classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency(success,60).classification,'FAILURE');
assert.equal(classifyBetfairApMcCoyReviewedSurvivalCycleAtLatency(success,0).classification,'INVALID');

let r=deriveBetfairApMcCoyFrozenHorizonSurvivalCurve({reviewedCycles:[]});
assert.equal(r.valid,false);
assert.equal(r.reason,'NO_INDEPENDENTLY_REVIEWED_SURVIVAL_CYCLES');
assert.equal(r.execution.realMoneyAllowed,false);

const forged={
  version:'betfair-apmccoy-post-ght-survival-review-v1',valid:true,independentReviewApproved:true,usableForLatencyClassification:true,
  completeAttemptLedgerVerified:true,completeObservationHorizon:true,reviewCommit:'0123456789abcdef0123456789abcdef01234567',cycleId:'forged',
  bindingScope:{expectedBetfairImsCasino:'bf_es',tickerEndpoint:'https://ticker.example/new_jackpotxml.php',configSourceUrl:'https://launcher.betfair.es/initialResources/es_ES_desktop',instanceCode:'sljp'},
  requestExecIntervalSeconds:10,detectionTimestamp:100,lastConfirmedUnawardedTimestamp:220,firstObservedAwardOrResetTimestamp:null,
};
r=deriveBetfairApMcCoyFrozenHorizonSurvivalCurve({reviewedCycles:[forged]});
assert.equal(r.valid,false);
assert.equal(r.reason,'CYCLE_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.frozenHorizonCurveAvailable,false);
assert.equal(r.usableForRaceEvidence,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');

r=deriveBetfairApMcCoyFrozenHorizonSurvivalCurve({reviewedCycles:[forged],confidence:1});
assert.equal(r.valid,false);
assert.equal(r.reason,'INVALID_CONFIDENCE');

console.log('betfair-apmccoy-post-ght-survival-curve-v1.test.mjs: PASS');
