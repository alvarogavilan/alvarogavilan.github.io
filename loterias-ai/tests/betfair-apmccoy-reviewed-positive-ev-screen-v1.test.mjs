import assert from 'node:assert/strict';
import {evaluateBetfairApMcCoyReviewedPositiveEvScreen as evaluate} from '../casino/jackpots/betfair-apmccoy-reviewed-positive-ev-screen-v1.mjs';

let r=evaluate({});
assert.equal(r.valid,false);
assert.equal(r.reason,'VALID_CURRENT_AP_MCCOY_OVERDUE_BRIDGE_RESULT_REQUIRED');
assert.equal(r.reviewedPositiveEvScreenPassed,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

const fakeBridge={version:'betfair-sporting-har-overdue-bridge-v1.10-code-owned-latency-dryrun',valid:true,operatorFollowingDayRuleVerifiedFromCodeOwnedCurrentEvidence:true,providerGhtBoundarySemanticsVerifiedFromCodeOwnedEvidence:true,currentDailyAmountExactVerifiedFromValidatedServerSnapshot:true,stakeAtDecisionExactVerifiedFromCodeOwnedReview:false,measuredActionLatencyVerifiedFromCodeOwnedReview:false,finalEvaluation:{followingDayUnawardedVerified:true,nextEligibleNetworkBetGuaranteedJackpot:true,feedAgeSeconds:1},after:{expectedBetfairImsCasino:'bf_es',tickerEndpoint:'https://ticker.example/new_jackpotxml.php',configSourceUrl:'https://launcher.betfair.es/initialResources/es_ES_desktop',snapshot:{instanceCode:'es1',amount:100}},stakeReview:{valid:false},actionLatencyReview:{valid:false},semantics:{conservativeMainGameRtpPct:93.03}};
const fakeRace={version:'betfair-apmccoy-reviewed-race-bound-v1.1-feed-age-budget',valid:true,reviewedRaceLowerBoundAvailable:true,usableForRaceEvidence:true};
r=evaluate({overdueBridgeResult:fakeBridge,reviewedRaceBound:fakeRace});
assert.equal(r.valid,false);
assert.equal(r.reason,'CODE_REVIEWED_SERVED_STAKE_REQUIRED');
assert.equal(r.realMoneyAllowed,undefined);
assert.equal(r.execution.realMoneyAllowed,false);

console.log('betfair-apmccoy-reviewed-positive-ev-screen-v1.test.mjs: PASS');
