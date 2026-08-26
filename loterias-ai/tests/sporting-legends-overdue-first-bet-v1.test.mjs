import assert from 'node:assert/strict';
import {evaluateSportingLegendsOverdueFirstBet} from '../casino/jackpots/sporting-legends-overdue-first-bet-v1.mjs';

const base={code:'sljp-1',requestCasino:'betfair-es-ims',instanceCode:null,local:0,currency:'EUR',guaranteedHitTime:2000,winCount:42,amount:100};
const before={...base,gameTimestamp:1990};
const after={...base,gameTimestamp:2005,amount:100.02};
const common={
  before,after,nowEpochSeconds:2010,
  exactBetfairSpainTickerImsBindingVerified:true,
  betfairFirstBetFollowingDayRuleVerified:true,
  providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
  stakeEUR:0.25,
};

let r=evaluateSportingLegendsOverdueFirstBet(common);
assert.equal(r.valid,true);
assert.equal(r.followingDayUnawardedVerified,true);
assert.equal(r.nextEligibleNetworkBetGuaranteedJackpot,true);
assert.equal(r.followingDayStartEpochSeconds,2000);
assert.equal(r.zeroEligibleArrivalWindowSeconds,5);
assert.ok(Math.abs(r.breakEvenFirstBetProbability-(((1-0.9303)*0.25)/100.02))<1e-12);
assert.equal(r.conditionalPositiveEvScreenPassed,false);
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);

r=evaluateSportingLegendsOverdueFirstBet({...common,firstBetProbabilityLowerBound:0.001,raceProbabilityProspectivelyValidated:true});
assert.equal(r.conditionalPositiveEvScreenPassed,true);
assert.equal(r.reason,'CONDITIONAL_RACE_EV_SCREEN_PASSED_EXECUTION_GATES_PENDING');
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);

r=evaluateSportingLegendsOverdueFirstBet({
  ...common,
  firstBetProbabilityLowerBound:0.001,
  raceProbabilityProspectivelyValidated:true,
  currentDailyAmountExactVerified:true,
  stakeAtDecisionExactVerified:true,
  measuredActionLatencyVerified:true,
  prospectiveDryRunCycleVerified:true,
});
assert.equal(r.conditionalPositiveEvScreenPassed,true);
assert.equal(r.executionGateClosed,true);
assert.equal(r.reason,'GREEN_OVERDUE_FIRST_BET_ALL_GATES_CLOSED');
assert.equal(r.decision,'GREEN');
assert.equal(r.realMoneyAllowed,true);
assert.equal(r.realStakeEUR,0.25);
assert.equal(r.maxSpins,1);
assert.equal(r.maxTotalStakeEUR,0.25);
assert.equal(r.manualActionRequired,true);
assert.equal(r.guards.noAutomaticWagering,true);

const noBoundarySemantics=evaluateSportingLegendsOverdueFirstBet({...common,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:false});
assert.equal(noBoundarySemantics.valid,false);
assert.equal(noBoundarySemantics.reason,'GUARANTEED_HIT_TIME_BOUNDARY_SEMANTICS_NOT_VERIFIED');
assert.equal(noBoundarySemantics.decision,'NO_PLAY');

const legacyOnly=evaluateSportingLegendsOverdueFirstBet({
  before,after,nowEpochSeconds:2010,
  exactBetfairSpainTickerImsBindingVerified:true,
  betfairFirstBetAfterDeadlineRuleVerified:true,
  providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
});
assert.equal(legacyOnly.valid,false);
assert.equal(legacyOnly.reason,'BETFAIR_FOLLOWING_DAY_FIRST_BET_RULE_NOT_VERIFIED');

const won=evaluateSportingLegendsOverdueFirstBet({...common,after:{...after,winCount:43,amount:30}});
assert.equal(won.valid,false);
assert.equal(won.reason,'JACKPOT_WIN_COUNT_CHANGED');
assert.equal(won.realMoneyAllowed,false);

const noBinding=evaluateSportingLegendsOverdueFirstBet({...common,exactBetfairSpainTickerImsBindingVerified:false});
assert.equal(noBinding.valid,false);
assert.equal(noBinding.reason,'BETFAIR_SPAIN_TICKER_IMS_NOT_VERIFIED');

const stale=evaluateSportingLegendsOverdueFirstBet({...common,nowEpochSeconds:3000});
assert.equal(stale.valid,false);
assert.equal(stale.reason,'FEED_TOO_STALE');
assert.equal(stale.decision,'NO_PLAY');
assert.equal(stale.realMoneyAllowed,false);

console.log('sporting-legends-overdue-first-bet-v1.test.mjs: PASS');
