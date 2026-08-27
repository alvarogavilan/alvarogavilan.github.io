import assert from 'node:assert/strict';
import {isApprovedBetfairApMcCoySurvivalReviewCommit,reviewBetfairApMcCoyPostGhtSurvivalCycle} from '../casino/jackpots/betfair-apmccoy-post-ght-survival-review-v1.mjs';

const fakeSha='0123456789abcdef0123456789abcdef01234567';
assert.equal(isApprovedBetfairApMcCoySurvivalReviewCommit(fakeSha),false);
assert.equal(isApprovedBetfairApMcCoySurvivalReviewCommit('bad'),false);

const candidate={
  version:'betfair-apmccoy-post-ght-survival-cycle-v1',valid:true,prospectiveSurvivalCandidate:true,
  freezeCommitSha:'8eb28f5d7a3c708104f3e2356b6cc86764dba68c',completeObservationHorizon:true,
  independentCycleReviewRequired:true,completeAttemptLedgerVerified:false,latencyThresholdSelectedAtCollectionTime:false,
  rightCensored:true,firstObservedAwardOrResetTimestamp:null,cycleId:'ght-test',
  bindingScope:{expectedBetfairImsCasino:'bf_es',tickerEndpoint:'https://ticker.example/new_jackpotxml.php',configSourceUrl:'https://launcher.betfair.es/initialResources/es_ES_desktop',instanceCode:'sljp'},
  requestExecIntervalSeconds:10,detectionTimestamp:1005,detectionLagSeconds:5,lastConfirmedUnawardedTimestamp:1125,
  survivalLowerBoundSeconds:120,awardResetInterval:null,
};
let r=reviewBetfairApMcCoyPostGhtSurvivalCycle({cycleCandidate:candidate,reviewCommit:fakeSha});
assert.equal(r.valid,false);
assert.equal(r.reason,'REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.independentReviewApproved,false);
assert.equal(r.usableForLatencyClassification,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

r=reviewBetfairApMcCoyPostGhtSurvivalCycle({cycleCandidate:candidate,reviewCommit:'bad'});
assert.equal(r.valid,false);
assert.equal(r.reason,'VALID_REVIEW_COMMIT_SHA_REQUIRED');

r=reviewBetfairApMcCoyPostGhtSurvivalCycle({cycleCandidate:{...candidate,completeAttemptLedgerVerified:true},reviewCommit:fakeSha});
assert.equal(r.valid,false);
assert.equal(r.reason,'UNREVIEWED_CANDIDATE_CONTRACT_REQUIRED');

r=reviewBetfairApMcCoyPostGhtSurvivalCycle({cycleCandidate:{...candidate,latencyThresholdSelectedAtCollectionTime:true},reviewCommit:fakeSha});
assert.equal(r.valid,false);
assert.equal(r.reason,'LATENCY_SELECTION_AT_COLLECTION_FORBIDDEN');

console.log('betfair-apmccoy-post-ght-survival-review-v1.test.mjs: PASS');
