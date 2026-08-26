import assert from 'node:assert/strict';
import {evaluateSportingLegendsOverdueFirstBet} from './sporting-legends-overdue-first-bet-v1.mjs';
const base={code:'sljp-1',requestCasino:'betfair-es-ims',instanceCode:null,local:0,currency:'EUR',guaranteedHitTime:2000,winCount:42,amount:100};
const before={...base,gameTimestamp:1990};
const after={...base,gameTimestamp:2005,amount:100.02};

let r=evaluateSportingLegendsOverdueFirstBet({before,after,nowEpochSeconds:2010,exactBetfairSpainTickerImsBindingVerified:true,betfairFirstBetAfterDeadlineRuleVerified:true,stakeEUR:0.25});
assert.equal(r.valid,true);
assert.equal(r.overdueUnawardedVerified,true);
assert.equal(r.publishedConditionalNextBetTrigger,true);
assert.ok(Math.abs(r.breakEvenFirstBetProbability-(((1-0.9303)*0.25)/100.02))<1e-12);
assert.equal(r.conditionalPositiveEvScreenPassed,false);
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.guards.realMoneyAllowed,false);

r=evaluateSportingLegendsOverdueFirstBet({before,after,nowEpochSeconds:2010,exactBetfairSpainTickerImsBindingVerified:true,betfairFirstBetAfterDeadlineRuleVerified:true,stakeEUR:0.25,firstBetProbabilityLowerBound:0.001,raceModelProspectivelyValidated:true});
assert.equal(r.conditionalPositiveEvScreenPassed,true);
assert.equal(r.decision,'NO_PLAY');

const won=evaluateSportingLegendsOverdueFirstBet({before,after:{...after,winCount:43,amount:30},nowEpochSeconds:2010,exactBetfairSpainTickerImsBindingVerified:true,betfairFirstBetAfterDeadlineRuleVerified:true});
assert.equal(won.valid,false);
assert.equal(won.reason,'JACKPOT_WIN_COUNT_CHANGED');
const noBinding=evaluateSportingLegendsOverdueFirstBet({before,after,nowEpochSeconds:2010,betfairFirstBetAfterDeadlineRuleVerified:true});
assert.equal(noBinding.valid,false);
assert.equal(noBinding.reason,'BETFAIR_SPAIN_TICKER_IMS_NOT_VERIFIED');
const stale=evaluateSportingLegendsOverdueFirstBet({before,after,nowEpochSeconds:3000,exactBetfairSpainTickerImsBindingVerified:true,betfairFirstBetAfterDeadlineRuleVerified:true});
assert.equal(stale.valid,false);
assert.equal(stale.reason,'FEED_TOO_STALE');
console.log('sporting-legends-overdue-first-bet-v1.test.mjs: PASS');
