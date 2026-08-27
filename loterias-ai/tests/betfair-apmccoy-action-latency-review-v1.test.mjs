import assert from 'node:assert/strict';
import {reviewBetfairApMcCoyActionLatency as review} from '../casino/jackpots/betfair-apmccoy-action-latency-review-v1.mjs';

const measurement={
  measuredDispatchLatencySeconds:2.0,
  networkAllowanceSeconds:0.4,
  measuredActionLatencySeconds:2.4,
  sampleCount:20,
  protocolId:'apmccoy-manual-action-latency-v1',
  method:'non-wager manual rehearsal plus passive same-origin RTT',
  startEvent:'VALIDATED_SERVER_STATE_AVAILABLE_TO_DECISION_LOGIC',
  endEvent:'MANUAL_WAGER_REQUEST_DISPATCH_OBSERVED_LOCALLY',
  networkAllowanceBasis:'PASSIVE_SAME_ORIGIN_FULL_RTT_UPPER_BOUND',
  networkAllowanceDerivedFromPassiveTrafficOnly:true,
  wagerProbeUsed:false,
  selectedUsingPostGhtSurvivalOutcomes:false,
};
const fake='a'.repeat(40);
let r=review({measurement,reviewCommit:fake});
assert.equal(r.valid,false);
assert.equal(r.contractRevision,'v1.1-dispatch-plus-passive-rtt');
assert.equal(r.reason,'ACTION_LATENCY_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.measuredActionLatencyVerified,false);
assert.equal(r.usableForRaceWindow,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

r=review({measurement:{...measurement,selectedUsingPostGhtSurvivalOutcomes:true},reviewCommit:fake});
assert.equal(r.reason,'LATENCY_SELECTION_MUST_BE_INDEPENDENT_OF_SURVIVAL_OUTCOMES');
r=review({measurement:{...measurement,measuredActionLatencySeconds:2.3},reviewCommit:fake});
assert.equal(r.reason,'TOTAL_LATENCY_MUST_COVER_DISPATCH_PLUS_NETWORK_ALLOWANCE');
r=review({measurement:{...measurement,networkAllowanceSeconds:0},reviewCommit:fake});
assert.equal(r.reason,'POSITIVE_PASSIVE_NETWORK_ALLOWANCE_REQUIRED');
r=review({measurement:{...measurement,sampleCount:19},reviewCommit:fake});
assert.equal(r.reason,'MINIMUM_LATENCY_SAMPLE_COUNT_REQUIRED');
assert.equal(r.minimumSampleCount,20);
r=review({measurement:{...measurement,endEvent:'MANUAL_CLICK'},reviewCommit:fake});
assert.equal(r.reason,'LATENCY_END_EVENT_NOT_LOCAL_REQUEST_DISPATCH');
r=review({measurement:{...measurement,networkAllowanceDerivedFromPassiveTrafficOnly:false},reviewCommit:fake});
assert.equal(r.reason,'NETWORK_ALLOWANCE_MUST_USE_PASSIVE_TRAFFIC_ONLY');
r=review({measurement:{...measurement,wagerProbeUsed:true},reviewCommit:fake});
assert.equal(r.reason,'WAGER_PROBE_FORBIDDEN');
r=review({measurement,reviewCommit:'bad'});
assert.equal(r.reason,'VALID_ACTION_LATENCY_REVIEW_COMMIT_REQUIRED');

console.log('betfair-apmccoy-action-latency-review-v1.test.mjs: PASS');
