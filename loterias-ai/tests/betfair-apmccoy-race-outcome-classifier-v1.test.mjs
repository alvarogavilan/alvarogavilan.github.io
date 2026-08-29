import assert from 'node:assert/strict';
import {classifyBetfairApMcCoyRaceOutcome as classify} from '../casino/jackpots/betfair-apmccoy-race-outcome-classifier-v1.mjs';

let r=classify({jackpotAwardObserved:true,simultaneousSecondWinnerVerified:true,exactOperatorSimultaneousRuleVerified:true});
assert.equal(r.outcome,'SIMULTANEOUS_SECOND_WIN');
assert.equal(r.usableForPayoutFloor,false);
assert.equal(r.conservativeJackpotPayoutFloorEUR,null);
assert.ok(r.warnings.includes('EXACT_SAME_BINDING_TIER_SEED_REQUIRED_FOR_EURO_FLOOR'));
assert.equal(r.execution.realMoneyAllowed,false);

r=classify({jackpotAwardObserved:true,simultaneousSecondWinnerVerified:true,exactOperatorSimultaneousRuleVerified:true,exactSameBindingTierSeedEUR:20});
assert.equal(r.outcome,'SIMULTANEOUS_SECOND_WIN');
assert.equal(r.usableForPayoutFloor,true);
assert.equal(r.conservativeJackpotPayoutFloorEUR,20);

r=classify({jackpotAwardObserved:true,simultaneousSecondWinnerVerified:true,exactOperatorSimultaneousRuleVerified:true,exactSameBindingTierSeedEUR:20,exactSameBindingPostFirstAccruedProgressiveEUR:1.25});
assert.equal(r.conservativeJackpotPayoutFloorEUR,21.25);

r=classify({jackpotAwardObserved:false,noJackpotAwardVerified:true});
assert.equal(r.outcome,'ORDINARY_LOSS');
assert.equal(r.conservativeJackpotPayoutFloorEUR,0);

r=classify({jackpotAwardObserved:true,firstWinnerVerified:true,exactObservedFirstWinnerAwardEUR:123.45});
assert.equal(r.outcome,'FIRST_WIN');
assert.equal(r.conservativeJackpotPayoutFloorEUR,123.45);

r=classify({jackpotAwardObserved:true,firstWinnerVerified:true,simultaneousSecondWinnerVerified:true,exactOperatorSimultaneousRuleVerified:true});
assert.equal(r.outcome,'AMBIGUOUS_FAIL_CLOSED');
assert.equal(r.usableForPayoutFloor,false);
assert.ok(r.warnings.includes('CONTRADICTORY_OUTCOME_FLAGS'));

console.log('betfair-apmccoy-race-outcome-classifier-v1.test.mjs: PASS');
