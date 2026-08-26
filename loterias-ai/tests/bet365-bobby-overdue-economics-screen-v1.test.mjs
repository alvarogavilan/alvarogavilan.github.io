import assert from 'node:assert/strict';
import {evaluateBet365BobbyOverdueEconomicsScreen} from '../edge-backend/src/bet365-bobby-overdue-economics-screen-v1.mjs';

const pair={valid:true,candidateFollowingDayUnawardedStateObserved:true,after:{snapshot:{amount:100}}};
let r=evaluateBet365BobbyOverdueEconomicsScreen({overduePairCandidate:pair,firstBetProbabilityLowerBound:0.001});
assert.equal(r.valid,true);
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.stakeEUR,0.10);
assert.equal(r.conservativeBaseRtpPct,94.5);
assert.equal(r.expectedBaseLossEUR,0.0055);
assert.equal(r.breakEvenFirstBetProbability,0.000055);
assert.equal(r.probabilityScreenPassed,true);
assert.equal(r.executionPrerequisitesClosed,false);
assert.equal(r.reason,'ECONOMIC_SCREEN_PASSED_OPERATOR_BINDING_GATES_PENDING');

r=evaluateBet365BobbyOverdueEconomicsScreen({overduePairCandidate:pair,conservativeBaseRtpPct:100,firstBetProbabilityLowerBound:0.001});
assert.equal(r.requestedConservativeBaseRtpPct,100);
assert.equal(r.conservativeBaseRtpPct,94.5);
assert.equal(r.callerRtpCappedForScreen,true);
assert.equal(r.breakEvenFirstBetProbability,0.000055);
assert.equal(r.decision,'NO_PLAY');

r=evaluateBet365BobbyOverdueEconomicsScreen({overduePairCandidate:pair,servedBet365SessionBindingVerified:true,servedTenCentTotalStakeVerified:true,tenCentJackpotEligibilityVerified:true,operatorFollowingDayRuleAdoptionVerified:true,firstBetProbabilityLowerBound:0.001});
assert.equal(r.executionPrerequisitesClosed,true);
assert.equal(r.probabilityScreenPassed,true);
assert.equal(r.reason,'ECONOMIC_SCREEN_PASSED_EXECUTION_RACE_REVIEW_STILL_REQUIRED');
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.maxSpins,0);

r=evaluateBet365BobbyOverdueEconomicsScreen({overduePairCandidate:{valid:true,candidateFollowingDayUnawardedStateObserved:false},firstBetProbabilityLowerBound:1});
assert.equal(r.valid,false);
assert.equal(r.reason,'VERIFIED_CROSS_GHT_CANDIDATE_REQUIRED');
assert.equal(r.decision,'NO_PLAY');

console.log('bet365-bobby-overdue-economics-screen-v1.test.mjs: PASS');
