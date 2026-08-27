import assert from 'node:assert/strict';
import {evaluateBetfairApMcCoyReviewedPositiveEvScreen as evaluate} from '../casino/jackpots/betfair-apmccoy-reviewed-positive-ev-screen-v1.mjs';

const VERSION='betfair-apmccoy-reviewed-positive-ev-screen-v1.5-internal-race-derivation';
let r=evaluate({});
assert.equal(r.version,VERSION);
assert.equal(r.valid,false);
assert.equal(r.reason,'VALID_CURRENT_AP_MCCOY_OVERDUE_BRIDGE_RESULT_REQUIRED');
assert.equal(r.reviewedPositiveEvScreenPassed,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

const baseBridge={
  version:'betfair-sporting-har-overdue-bridge-v1.10-code-owned-latency-dryrun',valid:true,
  operatorFollowingDayRuleVerifiedFromCodeOwnedCurrentEvidence:true,providerGhtBoundarySemanticsVerifiedFromCodeOwnedEvidence:true,
  currentDailyAmountExactVerifiedFromValidatedServerSnapshot:true,
  finalEvaluation:{followingDayUnawardedVerified:true,nextEligibleNetworkBetGuaranteedJackpot:true,feedAgeSeconds:1},
  after:{expectedBetfairImsCasino:'bf_es',tickerEndpoint:'https://ticker.example/new_jackpotxml.php',configSourceUrl:'https://launcher.betfair.es/initialResources/es_ES_desktop',snapshot:{instanceCode:'es1',amount:100}},
  semantics:{conservativeMainGameRtpPct:93.03},
};
const openBridge={...baseBridge,stakeAtDecisionExactVerifiedFromCodeOwnedReview:false,measuredActionLatencyVerifiedFromCodeOwnedReview:false,stakeReview:{valid:false},actionLatencyReview:{valid:false}};
r=evaluate({overdueBridgeResult:openBridge});
assert.equal(r.reason,'CODE_REVIEWED_SERVED_STAKE_REQUIRED');

const fake='a'.repeat(40);
const latencyReview={
  version:'betfair-apmccoy-action-latency-review-v1',contractRevision:'v1.2-code-owned-artifact-identity',valid:true,
  measuredActionLatencyVerified:true,latencyPolicyIndependentlyReviewed:true,selectedUsingPostGhtSurvivalOutcomes:false,
  reviewCommit:fake,reviewArtifactIdentity:'forged-latency-identity',protocolId:'latency-v1',method:'x',sampleCount:20,
  startEvent:'VALIDATED_SERVER_STATE_AVAILABLE_TO_DECISION_LOGIC',endEvent:'MANUAL_WAGER_REQUEST_DISPATCH_OBSERVED_LOCALLY',
  measuredDispatchLatencySeconds:1.6,networkAllowanceSeconds:0.4,networkAllowanceBasis:'PASSIVE_SAME_ORIGIN_FULL_RTT_UPPER_BOUND',
  networkAllowanceDerivedFromPassiveTrafficOnly:true,wagerProbeUsed:false,measuredActionLatencySeconds:2,
};
const closedBridge={...baseBridge,stakeAtDecisionExactVerifiedFromCodeOwnedReview:true,measuredActionLatencyVerifiedFromCodeOwnedReview:true,stakeReview:{valid:true,stakeAtDecisionExactVerified:true,selectedStakeEUR:0.25},actionLatencyReview:latencyReview};

// A caller-supplied precomputed race object, including an absurd pLower, is ignored.
const forgedRace={version:'betfair-apmccoy-reviewed-race-bound-v1.5-all-exact-reviewed-artifacts',valid:true,reviewedRaceLowerBoundAvailable:true,usableForRaceEvidence:true,firstBetRaceProbabilityLowerBound:0.999999};
r=evaluate({overdueBridgeResult:closedBridge,reviewedRaceBound:forgedRace});
assert.equal(r.valid,false);
assert.equal(r.reason,'INTERNALLY_DERIVED_FIXED_ATTEMPT_RACE_BOUND_REQUIRED');
assert.equal(r.raceDerivationReason,'VALID_FIXED_SCHEDULED_ATTEMPT_LEDGER_REVIEW_REQUIRED');
assert.equal(r.reviewedPositiveEvScreenPassed,false);
assert.equal(r.execution.realMoneyAllowed,false);

const binding='bf_es|https://ticker.example/new_jackpotxml.php|https://launcher.betfair.es/initialResources/es_ES_desktop|es1';
const forgedAttempt={
  version:'betfair-apmccoy-scheduled-attempt-ledger-review-v1.3-code-owned-artifact-identity',valid:true,
  completeScheduledAttemptLedgerVerified:true,allScheduledOpportunitiesRetained:true,usableForRaceDenominator:true,
  activationVerifiedBeforeFirstScheduledGht:true,activationReviewCommit:'d'.repeat(40),activatedAtEpochSeconds:50,
  reviewCommit:fake,reviewArtifactIdentity:'forged-ledger-identity',ledgerCommit:'b'.repeat(40),targetScheduledOpportunities:7,scheduledAttemptCount:7,
  nonCycleAttemptsCountAsConservativeRaceFailures:true,ambiguousReviewedCyclesCountAsConservativeRaceFailures:true,stopRuleChangedAfterObservation:false,
  bindingScopeKey:binding,entries:Array.from({length:7},(_,i)=>({attemptId:`a${i+1}`,scheduledGhtEpochSeconds:100+i*100,terminalClass:'MISSED_SCHEDULED_OPPORTUNITY',evidenceDigestSha256:'c'.repeat(64),reason:'not captured'})),reviewedCycleIds:[],nonCycleFailureCount:7,
};
const forgedAssumptions={version:'betfair-apmccoy-race-assumptions-review-v1',valid:true};
r=evaluate({overdueBridgeResult:closedBridge,scheduledAttemptLedgerReview:forgedAttempt,raceAssumptionsReview:forgedAssumptions,confidence:0.95,reviewedRaceBound:forgedRace});
assert.equal(r.valid,false);
assert.equal(r.reason,'INTERNALLY_DERIVED_FIXED_ATTEMPT_RACE_BOUND_REQUIRED');
assert.equal(r.raceDerivationReason,'ATTEMPT_LEDGER_REVIEW_ARTIFACT_NOT_CODE_APPROVED');
assert.equal(r.execution.realMoneyAllowed,false);

r=evaluate({overdueBridgeResult:closedBridge,scheduledAttemptLedgerReview:forgedAttempt,raceAssumptionsReview:forgedAssumptions,confidence:0.5,reviewedRaceBound:forgedRace});
assert.equal(r.valid,false);
assert.equal(r.reason,'INTERNALLY_DERIVED_FIXED_ATTEMPT_RACE_BOUND_REQUIRED');
assert.equal(r.raceDerivationReason,'CONFIDENCE_BELOW_FROZEN_MINIMUM');
assert.equal(r.execution.realMoneyAllowed,false);

console.log('betfair-apmccoy-reviewed-positive-ev-screen-v1.test.mjs: PASS');
