import assert from 'node:assert/strict';
import {evaluateBetfairApMcCoyReviewedPositiveEvScreen as evaluate} from '../casino/jackpots/betfair-apmccoy-reviewed-positive-ev-screen-v1.mjs';

let r=evaluate({});
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
const currentRaceVersion='betfair-apmccoy-reviewed-race-bound-v1.2-exact-ledger-frozen-horizon';
const oldRace={version:'betfair-apmccoy-reviewed-race-bound-v1.1-feed-age-budget',valid:true,reviewedRaceLowerBoundAvailable:true,usableForRaceEvidence:true};
r=evaluate({overdueBridgeResult:openBridge,reviewedRaceBound:oldRace});
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
r=evaluate({overdueBridgeResult:closedBridge,reviewedRaceBound:oldRace});
assert.equal(r.valid,false);
assert.equal(r.reason,'VALID_REVIEWED_AP_MCCOY_RACE_BOUND_REQUIRED');

const incompleteCurrentRace={
  version:currentRaceVersion,valid:true,reviewedRaceLowerBoundAvailable:true,usableForRaceEvidence:true,
  exactCycleLedgerMatchesAssumptionReview:false,bindingScopeMatchesAssumptionReview:true,
  samplingWindowFrozenBeforeFirstCycle:true,allEligibleDistinctDailyGhtCyclesIncluded:true,failedShortAndAmbiguousCyclesRetained:true,
  assumptionsSelectedUsingSurvivalOutcomes:false,
};
r=evaluate({overdueBridgeResult:closedBridge,reviewedRaceBound:incompleteCurrentRace});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_REVIEWED_RACE_LEDGER_CONTRACT_REQUIRED');

const outsideHorizon={
  ...incompleteCurrentRace,
  exactCycleLedgerMatchesAssumptionReview:true,
  validatedRaceWindowSeconds:130,frozenSurvivalHorizonSeconds:120,
};
r=evaluate({overdueBridgeResult:closedBridge,reviewedRaceBound:outsideHorizon});
assert.equal(r.valid,false);
assert.equal(r.reason,'REVIEWED_RACE_WINDOW_OUTSIDE_FROZEN_SURVIVAL_HORIZON');
assert.equal(r.execution.realMoneyAllowed,false);

console.log('betfair-apmccoy-reviewed-positive-ev-screen-v1.test.mjs: PASS');
