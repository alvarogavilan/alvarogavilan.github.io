import assert from 'node:assert/strict';
import {classifyBet365FrankReviewedSurvivalCycleAtLatency,deriveBet365FrankFrozenHorizonSurvivalCurve} from '../casino/jackpots/bet365-frank-post-ght-survival-curve-v1.mjs';

const base={detectionTimestamp:100,lastConfirmedUnawardedTimestamp:112,firstObservedAwardOrResetTimestamp:118};
let r=classifyBet365FrankReviewedSurvivalCycleAtLatency(base,10);
assert.equal(r.valid,true);assert.equal(r.classification,'SUCCESS');assert.equal(r.thresholdTimestamp,110);
r=classifyBet365FrankReviewedSurvivalCycleAtLatency(base,15);
assert.equal(r.classification,'AMBIGUOUS');assert.equal(r.thresholdTimestamp,115);
r=classifyBet365FrankReviewedSurvivalCycleAtLatency(base,20);
assert.equal(r.classification,'FAILURE');assert.equal(r.thresholdTimestamp,120);
r=classifyBet365FrankReviewedSurvivalCycleAtLatency({...base,firstObservedAwardOrResetTimestamp:115},15);
assert.equal(r.classification,'AMBIGUOUS');
r=classifyBet365FrankReviewedSurvivalCycleAtLatency(base,0);
assert.equal(r.valid,false);assert.equal(r.classification,'INVALID');

const fakeReviewed={
  version:'bet365-frank-post-ght-survival-review-v1',valid:true,independentReviewApproved:true,
  usableForLatencyClassification:true,completeAttemptLedgerVerified:true,completeObservationHorizon:true,
  reviewCommit:'a'.repeat(40),cycleId:'frank-001',requestExecIntervalSeconds:10,
  bindingScope:{jackpotsCasino:'bet365_es',tickerEndpoint:'https://ticker.example/webtickers',instanceCode:'es1'},
  detectionTimestamp:100,lastConfirmedUnawardedTimestamp:220,firstObservedAwardOrResetTimestamp:null,rightCensored:true,
};
r=deriveBet365FrankFrozenHorizonSurvivalCurve({reviewedCycles:[fakeReviewed]});
assert.equal(r.valid,false);
assert.equal(r.reason,'CYCLE_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.frozenHorizonCurveAvailable,false);
assert.equal(r.usableForRaceEvidence,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

r=deriveBet365FrankFrozenHorizonSurvivalCurve({reviewedCycles:[],confidence:0.95});
assert.equal(r.reason,'NO_INDEPENDENTLY_REVIEWED_SURVIVAL_CYCLES');
r=deriveBet365FrankFrozenHorizonSurvivalCurve({reviewedCycles:[fakeReviewed],confidence:1});
assert.equal(r.reason,'INVALID_CONFIDENCE');

console.log('bet365-frank-post-ght-survival-curve-v1.test.mjs: PASS');
