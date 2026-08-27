import assert from 'node:assert/strict';
import {deriveBetfairApMcCoyReviewedRaceLowerBound as derive} from '../casino/jackpots/betfair-apmccoy-reviewed-race-bound-v1.mjs';

const fake='a'.repeat(40),ledgerCommit='b'.repeat(40);
const binding='bf_es|https://ticker.example/new_jackpotxml.php|https://launcher.betfair.es/initialResources/es_ES_desktop|es1';
const cycle={version:'betfair-apmccoy-post-ght-survival-review-v1',valid:true,independentReviewApproved:true,completeAttemptLedgerVerified:true,completeObservationHorizon:true,usableForLatencyClassification:true,reviewCommit:fake,cycleId:'ap-001',bindingScope:{expectedBetfairImsCasino:'bf_es',tickerEndpoint:'https://ticker.example/new_jackpotxml.php',configSourceUrl:'https://launcher.betfair.es/initialResources/es_ES_desktop',instanceCode:'es1'},requestExecIntervalSeconds:10,detectionTimestamp:100,lastConfirmedUnawardedTimestamp:140,firstObservedAwardOrResetTimestamp:null,rightCensored:true};
const entries=[{attemptId:'a1',scheduledGhtEpochSeconds:100,terminalClass:'REVIEWED_COMPLETE_SURVIVAL_CYCLE',cycleId:'ap-001',reviewedCycle:cycle},...Array.from({length:6},(_,i)=>({attemptId:`a${i+2}`,scheduledGhtEpochSeconds:200+i*100,terminalClass:'MISSED_SCHEDULED_OPPORTUNITY',evidenceDigestSha256:'c'.repeat(64),reason:'not captured'}))];
const attempt={version:'betfair-apmccoy-scheduled-attempt-ledger-review-v1.2-code-owned-activation',valid:true,completeScheduledAttemptLedgerVerified:true,allScheduledOpportunitiesRetained:true,usableForRaceDenominator:true,activationVerifiedBeforeFirstScheduledGht:true,activationReviewCommit:'d'.repeat(40),activatedAtEpochSeconds:50,reviewCommit:fake,ledgerCommit,targetScheduledOpportunities:7,scheduledAttemptCount:7,nonCycleAttemptsCountAsConservativeRaceFailures:true,ambiguousReviewedCyclesCountAsConservativeRaceFailures:true,stopRuleChangedAfterObservation:false,bindingScopeKey:binding,entries,reviewedCycleIds:['ap-001'],nonCycleFailureCount:6,attemptIds:entries.map(x=>x.attemptId),scheduledGhtEpochSeconds:entries.map(x=>x.scheduledGhtEpochSeconds)};
const latency={version:'betfair-apmccoy-action-latency-review-v1',valid:true,measuredActionLatencyVerified:true,latencyPolicyIndependentlyReviewed:true,selectedUsingPostGhtSurvivalOutcomes:false,reviewCommit:fake,protocolId:'latency-v1',measuredActionLatencySeconds:2.4};
const assumptions={version:'betfair-apmccoy-race-assumptions-review-v1',valid:true,independentRaceAssumptionsReviewed:true,completeProspectiveCycleLedgerVerified:true,binomialSamplingAssumptionJustified:true,currentCycleExchangeabilityVerified:true,samplingWindowFrozenBeforeFirstCycle:true,allEligibleDistinctDailyGhtCyclesIncluded:true,failedShortAndAmbiguousCyclesRetained:true,assumptionsSelectedUsingSurvivalOutcomes:false,reviewCommit:fake,protocolId:'race-v1',completeProspectiveLedgerCommit:ledgerCommit,cycleIds:['ap-001'],bindingScopeKey:binding,assumptionEvidenceId:'race-assumptions-v1'};

let r=derive({reviewedCycles:[cycle],scheduledAttemptLedgerReview:attempt,actionLatencyReview:latency,raceAssumptionsReview:assumptions,confidence:0.95});
assert.equal(r.valid,false);
assert.equal(r.reason,'ATTEMPT_LEDGER_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.reviewedRaceLowerBoundAvailable,false);
assert.equal(r.exactScheduledAttemptDenominatorVerified,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

r=derive({reviewedCycles:[cycle],scheduledAttemptLedgerReview:attempt,actionLatencyReview:latency,raceAssumptionsReview:assumptions,confidence:0.5});
assert.equal(r.reason,'CONFIDENCE_BELOW_FROZEN_MINIMUM');
assert.equal(r.minimumConfidence,0.95);

r=derive({reviewedCycles:[cycle],actionLatencyReview:latency,raceAssumptionsReview:assumptions,confidence:0.95});
assert.equal(r.reason,'VALID_FIXED_SCHEDULED_ATTEMPT_LEDGER_REVIEW_REQUIRED');

r=derive({reviewedCycles:[cycle],scheduledAttemptLedgerReview:{...attempt,activationVerifiedBeforeFirstScheduledGht:false},actionLatencyReview:latency,raceAssumptionsReview:assumptions,confidence:0.95});
assert.equal(r.reason,'CODE_OWNED_ATTEMPT_PLAN_ACTIVATION_REQUIRED');

console.log('betfair-apmccoy-reviewed-race-bound-v1.test.mjs: PASS');
