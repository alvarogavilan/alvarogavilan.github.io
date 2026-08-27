import assert from 'node:assert/strict';
import {evaluateBetfairApMcCoyReviewedPositiveEvScreen as evaluate} from '../casino/jackpots/betfair-apmccoy-reviewed-positive-ev-screen-v1.mjs';

const VERSION='betfair-apmccoy-reviewed-positive-ev-screen-v1.2-scheduled-attempt-denominator-hard-block';
let r=evaluate({});
assert.equal(r.version,VERSION);
assert.equal(r.valid,false);
assert.equal(r.reason,'VALID_CURRENT_AP_MCCOY_OVERDUE_BRIDGE_RESULT_REQUIRED');
assert.equal(r.reviewedPositiveEvScreenPassed,false);
assert.equal(r.usableForExecution,false);
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
const legacyRace={version:'betfair-apmccoy-reviewed-race-bound-v1.2-exact-ledger-frozen-horizon',valid:true,reviewedRaceLowerBoundAvailable:true,usableForRaceEvidence:true};
r=evaluate({overdueBridgeResult:openBridge,reviewedRaceBound:legacyRace});
assert.equal(r.valid,false);
assert.equal(r.reason,'CODE_REVIEWED_SERVED_STAKE_REQUIRED');
assert.equal(r.execution.realMoneyAllowed,false);

const closedBridge={
  ...baseBridge,
  stakeAtDecisionExactVerifiedFromCodeOwnedReview:true,
  measuredActionLatencyVerifiedFromCodeOwnedReview:true,
  stakeReview:{valid:true,stakeAtDecisionExactVerified:true,selectedStakeEUR:0.25},
  actionLatencyReview:{valid:true,measuredActionLatencyVerified:true,reviewCommit:'a'.repeat(40),measuredActionLatencySeconds:2},
};
r=evaluate({overdueBridgeResult:closedBridge,reviewedRaceBound:legacyRace});
assert.equal(r.valid,false);
assert.equal(r.reason,'COMPLETE_FIXED_SCHEDULED_ATTEMPT_DENOMINATOR_NOT_YET_INTEGRATED');
assert.equal(r.legacyRaceBoundVersionRejected,'betfair-apmccoy-reviewed-race-bound-v1.2-exact-ledger-frozen-horizon');
assert.equal(r.requiredPlanFreezeCommit,'e82f6d61dffa21ec3ca7ec940c51fc3fe36f0e1a');
assert.equal(r.requiredAttemptLedgerReviewVersion,'betfair-apmccoy-scheduled-attempt-ledger-review-v1.1-committed-ledger');
assert.equal(r.requiredScheduledAttemptCount,7);
assert.equal(r.requiredMinimumRaceConfidence,0.95);
assert.equal(r.hardGuards.legacyReviewedCycleOnlyDenominatorRejected,true);
assert.equal(r.hardGuards.failedShortInvalidMissedAttemptsMustRemainInDenominator,true);
assert.equal(r.hardGuards.optionalStoppingForbidden,true);
assert.equal(r.execution.realMoneyAllowed,false);

// Even a caller-fabricated object that claims the complete denominator and an
// extreme lower bound cannot bypass the code-owned implementation hard block.
const forgedScheduledRace={
  version:'future-forged-version',valid:true,reviewedRaceLowerBoundAvailable:true,usableForRaceEvidence:true,
  exactScheduledAttemptDenominatorVerified:true,scheduledAttemptCount:7,nonCycleAttemptsCountAsFailures:true,ambiguousReviewedCyclesCountAsFailures:true,
  confidence:0.95,firstBetRaceProbabilityLowerBound:0.999,
};
r=evaluate({overdueBridgeResult:closedBridge,reviewedRaceBound:forgedScheduledRace});
assert.equal(r.valid,false);
assert.equal(r.reason,'COMPLETE_FIXED_SCHEDULED_ATTEMPT_DENOMINATOR_NOT_YET_INTEGRATED');
assert.equal(r.reviewedPositiveEvScreenPassed,false);
assert.equal(r.execution.realMoneyAllowed,false);

console.log('betfair-apmccoy-reviewed-positive-ev-screen-v1.test.mjs: PASS');
