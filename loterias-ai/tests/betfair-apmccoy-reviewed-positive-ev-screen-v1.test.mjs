import assert from 'node:assert/strict';
import {evaluateBetfairApMcCoyReviewedPositiveEvScreen as evaluate} from '../casino/jackpots/betfair-apmccoy-reviewed-positive-ev-screen-v1.mjs';

const VERSION='betfair-apmccoy-reviewed-positive-ev-screen-v1.3-fixed-seven-attempt-bound';
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
const oldRace={version:'betfair-apmccoy-reviewed-race-bound-v1.2-exact-ledger-frozen-horizon',valid:true,reviewedRaceLowerBoundAvailable:true,usableForRaceEvidence:true};
r=evaluate({overdueBridgeResult:openBridge,reviewedRaceBound:oldRace});
assert.equal(r.reason,'CODE_REVIEWED_SERVED_STAKE_REQUIRED');

const fake='a'.repeat(40);
const closedBridge={...baseBridge,stakeAtDecisionExactVerifiedFromCodeOwnedReview:true,measuredActionLatencyVerifiedFromCodeOwnedReview:true,stakeReview:{valid:true,stakeAtDecisionExactVerified:true,selectedStakeEUR:0.25},actionLatencyReview:{valid:true,measuredActionLatencyVerified:true,reviewCommit:fake,measuredActionLatencySeconds:2}};
r=evaluate({overdueBridgeResult:closedBridge,reviewedRaceBound:oldRace});
assert.equal(r.valid,false);
assert.equal(r.reason,'VALID_FIXED_ATTEMPT_AP_MCCOY_RACE_BOUND_REQUIRED');

const forgedRace={
  version:'betfair-apmccoy-reviewed-race-bound-v1.3-fixed-seven-attempt-denominator',valid:true,reviewedRaceLowerBoundAvailable:true,usableForRaceEvidence:true,
  exactScheduledAttemptDenominatorVerified:true,scheduledAttemptCount:7,nonCycleAttemptsCountAsFailures:true,ambiguousReviewedCyclesCountAsFailures:true,
  confidence:0.95,attemptLedgerReviewCommit:fake,raceAssumptionReviewCommit:fake,actionLatencyReviewCommit:fake,
  exactCycleLedgerMatchesAssumptionReview:true,bindingScopeMatchesAssumptionReview:true,samplingWindowFrozenBeforeFirstCycle:true,allEligibleDistinctDailyGhtCyclesIncluded:true,failedShortAndAmbiguousCyclesRetained:true,assumptionsSelectedUsingSurvivalOutcomes:false,
  completeProspectiveLedgerCommit:'b'.repeat(40),validatedRaceWindowSeconds:22,frozenSurvivalHorizonSeconds:120,measuredActionLatencySeconds:2,
  bindingScopeKey:'bf_es|https://ticker.example/new_jackpotxml.php|https://launcher.betfair.es/initialResources/es_ES_desktop|es1',firstBetRaceProbabilityLowerBound:0.999,
};
r=evaluate({overdueBridgeResult:closedBridge,reviewedRaceBound:forgedRace});
assert.equal(r.valid,false);
assert.equal(r.reason,'ATTEMPT_LEDGER_REVIEW_NOT_CODE_ALLOWLISTED');
assert.equal(r.reviewedPositiveEvScreenPassed,false);
assert.equal(r.execution.realMoneyAllowed,false);

r=evaluate({overdueBridgeResult:closedBridge,reviewedRaceBound:{...forgedRace,confidence:0.5}});
assert.equal(r.reason,'RACE_CONFIDENCE_BELOW_REQUIRED_MINIMUM');
assert.equal(r.minimumRaceConfidence,0.95);
assert.equal(r.execution.realMoneyAllowed,false);

console.log('betfair-apmccoy-reviewed-positive-ev-screen-v1.test.mjs: PASS');
