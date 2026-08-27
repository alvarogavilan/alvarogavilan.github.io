import assert from 'node:assert/strict';
import {reviewBetfairApMcCoyActionLatency as review} from '../casino/jackpots/betfair-apmccoy-action-latency-review-v1.mjs';

const measurement={measuredActionLatencySeconds:2.4,sampleCount:20,protocolId:'apmccoy-manual-action-latency-v1',method:'manual-click-to-request-observation',selectedUsingPostGhtSurvivalOutcomes:false};
const fake='a'.repeat(40);
let r=review({measurement,reviewCommit:fake});
assert.equal(r.valid,false);
assert.equal(r.reason,'ACTION_LATENCY_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.measuredActionLatencyVerified,false);
assert.equal(r.latencyPolicyIndependentlyReviewed,false);
assert.equal(r.usableForRaceWindow,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

r=review({measurement:{...measurement,selectedUsingPostGhtSurvivalOutcomes:true},reviewCommit:fake});
assert.equal(r.reason,'LATENCY_SELECTION_MUST_BE_INDEPENDENT_OF_SURVIVAL_OUTCOMES');
r=review({measurement:{...measurement,measuredActionLatencySeconds:0},reviewCommit:fake});
assert.equal(r.reason,'POSITIVE_MEASURED_ACTION_LATENCY_REQUIRED');
r=review({measurement:{...measurement,sampleCount:0},reviewCommit:fake});
assert.equal(r.reason,'POSITIVE_INTEGER_SAMPLE_COUNT_REQUIRED');
r=review({measurement:{...measurement,protocolId:''},reviewCommit:fake});
assert.equal(r.reason,'LATENCY_MEASUREMENT_PROTOCOL_ID_REQUIRED');
r=review({measurement,reviewCommit:'bad'});
assert.equal(r.reason,'VALID_ACTION_LATENCY_REVIEW_COMMIT_REQUIRED');

console.log('betfair-apmccoy-action-latency-review-v1.test.mjs: PASS');
