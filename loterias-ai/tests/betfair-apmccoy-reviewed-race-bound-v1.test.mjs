import assert from 'node:assert/strict';
import {deriveBetfairApMcCoyReviewedRaceLowerBound as derive} from '../casino/jackpots/betfair-apmccoy-reviewed-race-bound-v1.mjs';

const fake='a'.repeat(40);
const cycle={version:'betfair-apmccoy-post-ght-survival-review-v1',valid:true,independentReviewApproved:true,completeAttemptLedgerVerified:true,completeObservationHorizon:true,usableForLatencyClassification:true,reviewCommit:fake,cycleId:'ap-001',bindingScope:{expectedBetfairImsCasino:'bf_es',tickerEndpoint:'https://ticker.example/new_jackpotxml.php',configSourceUrl:'https://launcher.betfair.es/initialResources/es_ES_desktop',instanceCode:'es1'},requestExecIntervalSeconds:10,detectionTimestamp:100,lastConfirmedUnawardedTimestamp:120,firstObservedAwardOrResetTimestamp:null,rightCensored:true};
const latency={version:'betfair-apmccoy-action-latency-review-v1',valid:true,measuredActionLatencyVerified:true,latencyPolicyIndependentlyReviewed:true,selectedUsingPostGhtSurvivalOutcomes:false,reviewCommit:fake,protocolId:'latency-v1',measuredActionLatencySeconds:2.4};
const assumptions={version:'betfair-apmccoy-race-assumptions-review-v1',valid:true,independentRaceAssumptionsReviewed:true,completeProspectiveCycleLedgerVerified:true,binomialSamplingAssumptionJustified:true,currentCycleExchangeabilityVerified:true,reviewCommit:fake,protocolId:'race-v1',completeProspectiveLedgerCommit:'b'.repeat(40),assumptionEvidenceId:'race-assumptions-v1'};

let r=derive({reviewedCycles:[cycle],actionLatencyReview:latency,raceAssumptionsReview:assumptions,confidence:0.95});
assert.equal(r.valid,false);
assert.equal(r.reason,'ACTION_LATENCY_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.reviewedRaceLowerBoundAvailable,false);
assert.equal(r.usableForRaceEvidence,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

r=derive({reviewedCycles:[cycle],actionLatencyReview:{...latency,valid:false},raceAssumptionsReview:assumptions});
assert.equal(r.reason,'VALID_INDEPENDENT_ACTION_LATENCY_REVIEW_REQUIRED');
r=derive({reviewedCycles:[cycle],actionLatencyReview:latency,raceAssumptionsReview:assumptions,confidence:1});
assert.equal(r.reason,'INVALID_CONFIDENCE');
r=derive({reviewedCycles:[],actionLatencyReview:latency,raceAssumptionsReview:assumptions});
assert.equal(r.reason,'NO_REVIEWED_SURVIVAL_CYCLES');

console.log('betfair-apmccoy-reviewed-race-bound-v1.test.mjs: PASS');
