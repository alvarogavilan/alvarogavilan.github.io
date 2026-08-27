import assert from 'node:assert/strict';
import {reviewBet365FrankPostGhtSurvivalCycle,isApprovedBet365FrankSurvivalReviewCommit} from '../casino/jackpots/bet365-frank-post-ght-survival-review-v1.mjs';

const candidate={
  version:'bet365-frank-post-ght-survival-cycle-v1',valid:true,prospectiveSurvivalCandidate:true,
  freezeCommitSha:'c3df680c2f51dffffe16706e9820248b21e555d4',cycleId:'frank-ght-001',
  bindingScope:{jackpotsCasino:'bet365_es',tickerEndpoint:'https://ticker.example/webtickers',instanceCode:'es1'},
  requestExecIntervalSeconds:10,detectionTimestamp:2002,detectionLagSeconds:2,
  lastConfirmedUnawardedTimestamp:2122,survivalLowerBoundSeconds:120,
  firstObservedAwardOrResetTimestamp:null,awardResetInterval:null,rightCensored:true,
  completeObservationHorizon:true,completeAttemptLedgerVerified:false,
  latencyThresholdSelectedAtCollectionTime:false,independentCycleReviewRequired:true,
};
const fake='a'.repeat(40);
assert.equal(isApprovedBet365FrankSurvivalReviewCommit(fake),false);
let r=reviewBet365FrankPostGhtSurvivalCycle({cycleCandidate:candidate,reviewCommit:fake});
assert.equal(r.valid,false);
assert.equal(r.reason,'REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.independentReviewApproved,false);
assert.equal(r.usableForLatencyClassification,false);
assert.equal(r.usableForRaceEvidence,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

r=reviewBet365FrankPostGhtSurvivalCycle({cycleCandidate:{...candidate,completeObservationHorizon:false},reviewCommit:fake});
assert.equal(r.reason,'COMPLETE_FROZEN_OBSERVATION_HORIZON_REQUIRED');
r=reviewBet365FrankPostGhtSurvivalCycle({cycleCandidate:{...candidate,latencyThresholdSelectedAtCollectionTime:true},reviewCommit:fake});
assert.equal(r.reason,'LATENCY_SELECTION_AT_COLLECTION_FORBIDDEN');
r=reviewBet365FrankPostGhtSurvivalCycle({cycleCandidate:{...candidate,freezeCommitSha:'b'.repeat(40)},reviewCommit:fake});
assert.equal(r.reason,'SURVIVAL_FREEZE_COMMIT_MISMATCH');
r=reviewBet365FrankPostGhtSurvivalCycle({cycleCandidate:candidate,reviewCommit:'not-a-sha'});
assert.equal(r.reason,'VALID_REVIEW_COMMIT_SHA_REQUIRED');

console.log('bet365-frank-post-ght-survival-review-v1.test.mjs: PASS');
