import assert from 'node:assert/strict';
import {evaluateBetfairSportingHarOverduePair,validateBetfairSportingHarSnapshot} from '../casino/jackpots/betfair-sporting-har-overdue-bridge-v1.mjs';

const config=(casino='bf_es',ticker='https://tickers.playtech.example/new_jackpotxml.php',cacheBust='')=>({
  request:{method:'GET',url:`https://launcher.betfair.es/initialResources/es_ES_desktop${cacheBust?`?cacheBust=${cacheBust}`:''}`,headers:[]},
  response:{status:200,headers:[],content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:casino,jackpotsCasinoUrl:ticker})}},
});
const ticker=(gameTimestamp,amount,winCount=42,casino='bf_es',ght=2000)=>({
  startedDateTime:new Date(gameTimestamp*1000).toISOString(),
  request:{method:'GET',url:`https://tickers.playtech.example/new_jackpotxml.php?casino=${casino}&currency=EUR&game=sljp-1&local=0&winc=0`,headers:[]},
  response:{status:200,headers:[],content:{mimeType:'text/xml',text:`<request casino="${casino}" currency="eur" game="sljp-1" startTimestamp="${gameTimestamp-10}" execInterval="10"/><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${gameTimestamp}" winc="${winCount}"><amount currency="EUR" guaranteedHitTime="${ght}" step="0.01" wins="1000">${amount}</amount></gamedata>`}},
});
const har=(gameTimestamp,amount,winCount=42,casino='bf_es',ght=2000,cacheBust='')=>({log:{entries:[config(casino,'https://tickers.playtech.example/new_jackpotxml.php',cacheBust),ticker(gameTimestamp,amount,winCount,casino,ght)]}});

const one=validateBetfairSportingHarSnapshot(har(1990,100),{sourceName:'before.har'});
assert.equal(one.valid,true);
assert.equal(one.captureEpochSeconds,1990);
assert.equal(one.freshnessClockSource,'HAR_TICKER_ENTRY_STARTED_DATE_TIME');
assert.equal(one.validation.exactBetfairSpainTickerImsBindingVerified,true);
assert.equal(one.snapshot.code,'sljp-1');
assert.equal(one.snapshot.guaranteedHitTime,2000);
assert.equal(one.decision,'NO_PLAY');

const backdated=validateBetfairSportingHarSnapshot(har(1990,100),{sourceName:'before.har',nowEpochSeconds:1995});
assert.equal(backdated.valid,false);
assert.equal(backdated.reason,'CAPTURE_TIME_ARGUMENT_MISMATCH');
assert.equal(backdated.realMoneyAllowed,false);

const r=evaluateBetfairSportingHarOverduePair({
  beforeHar:har(1990,100,42,'bf_es',2000,'before'),
  afterHar:har(2005,100.02,42,'bf_es',2000,'after'),
  decisionNowEpochSeconds:2010,
  betfairFirstBetFollowingDayRuleVerified:true,
  providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
  stakeEUR:0.25,
});
assert.equal(r.valid,true);
assert.equal(r.before.captureEpochSeconds,1990);
assert.equal(r.after.captureEpochSeconds,2005);
assert.equal(r.finalEvaluation.followingDayUnawardedVerified,true);
assert.equal(r.finalEvaluation.nextEligibleNetworkBetGuaranteedJackpot,true);
assert.equal(r.finalEvaluation.exactBetfairSpainTickerImsBindingVerified,true);
assert.equal(r.hardGuards.benignCacheBusterQueryChangesIgnored,true);
assert.equal(r.hardGuards.harCaptureTimeAttestedOnBothSnapshots,true);
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.maxSpins,0);
assert.equal(r.reason,'FOLLOWING_DAY_UNAWARDED_VERIFIED_RACE_GATE_OPEN');

const impossibleDecision=evaluateBetfairSportingHarOverduePair({
  beforeHar:har(1990,100),afterHar:har(2005,100.02),decisionNowEpochSeconds:2004,
  betfairFirstBetFollowingDayRuleVerified:true,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,stakeEUR:0.25,
});
assert.equal(impossibleDecision.valid,false);
assert.equal(impossibleDecision.reason,'DECISION_TIME_PRECEDES_AFTER_CAPTURE');
assert.equal(impossibleDecision.realMoneyAllowed,false);

const reset=evaluateBetfairSportingHarOverduePair({
  beforeHar:har(1990,100),afterHar:har(2005,90,43),decisionNowEpochSeconds:2010,
  betfairFirstBetFollowingDayRuleVerified:true,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,stakeEUR:0.25,
});
assert.equal(reset.decision,'NO_PLAY');
assert.equal(reset.finalEvaluation.reason,'JACKPOT_WIN_COUNT_CHANGED');

const changedIms=evaluateBetfairSportingHarOverduePair({
  beforeHar:har(1990,100,42,'bf_es'),afterHar:har(2005,100.02,42,'other_es'),decisionNowEpochSeconds:2010,
  betfairFirstBetFollowingDayRuleVerified:true,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,stakeEUR:0.25,
});
assert.equal(changedIms.valid,false);
assert.equal(changedIms.reason,'IMS_CHANGED_BETWEEN_CAPTURES');
assert.equal(changedIms.realMoneyAllowed,false);
console.log('betfair-sporting-har-overdue-bridge-v1.test.mjs: PASS');
