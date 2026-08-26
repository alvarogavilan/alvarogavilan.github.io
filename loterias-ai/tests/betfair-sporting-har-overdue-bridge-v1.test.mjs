import assert from 'node:assert/strict';
import {evaluateBetfairSportingHarOverduePair,validateBetfairSportingHarSnapshot} from '../casino/jackpots/betfair-sporting-har-overdue-bridge-v1.mjs';

const exactLauncher=()=>({
  startedDateTime:new Date(1989*1000).toISOString(),
  request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real&returnURL=https%3A%2F%2Fcasino.betfair.es%2Fjuego%2Fap-mccoy-sporting-legends-cptn&switchedToPopup=true',headers:[]},
  response:{status:200,headers:[],content:{text:''}},
});
const otherLauncher=()=>({
  startedDateTime:new Date(1989.5*1000).toISOString(),
  request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=another-playtech-game-cptn&launchProduct=casino&mode=real',headers:[]},
  response:{status:200,headers:[],content:{text:''}},
});
const config=(casino='bf_es',ticker='https://tickers.playtech.example/new_jackpotxml.php',cacheBust='')=>({
  request:{method:'GET',url:`https://launcher.betfair.es/initialResources/es_ES_desktop${cacheBust?`?cacheBust=${cacheBust}`:''}`,headers:[]},
  response:{status:200,headers:[],content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:casino,jackpotsCasinoUrl:ticker})}},
});
const ticker=(gameTimestamp,amount,winCount=42,casino='bf_es',ght=2000)=>({
  startedDateTime:new Date(gameTimestamp*1000).toISOString(),
  request:{method:'GET',url:`https://tickers.playtech.example/new_jackpotxml.php?casino=${casino}&currency=EUR&game=sljp-1&local=0&winc=0`,headers:[]},
  response:{status:200,headers:[],content:{mimeType:'text/xml',text:`<request casino="${casino}" currency="eur" game="sljp-1" startTimestamp="${gameTimestamp-10}" execInterval="10"/><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${gameTimestamp}" winc="${winCount}"><amount currency="EUR" guaranteedHitTime="${ght}" step="0.01" wins="1000">${amount}</amount></gamedata>`}},
});
const har=(gameTimestamp,amount,winCount=42,casino='bf_es',ght=2000,cacheBust='')=>({log:{entries:[exactLauncher(),config(casino,'https://tickers.playtech.example/new_jackpotxml.php',cacheBust),ticker(gameTimestamp,amount,winCount,casino,ght)]}});
const harWithoutExactLauncher=(gameTimestamp,amount)=>({log:{entries:[config(),ticker(gameTimestamp,amount)]}});

const missingExactGame=validateBetfairSportingHarSnapshot(harWithoutExactLauncher(1990,100),{sourceName:'generic-betfair.har'});
assert.equal(missingExactGame.valid,false);
assert.equal(missingExactGame.reason,'EXACT_AP_MCCOY_REAL_LAUNCHER_BINDING_NOT_FOUND');
assert.equal(missingExactGame.realMoneyAllowed,false);

const staleExactLauncherHar={log:{entries:[exactLauncher(),config(),otherLauncher(),ticker(1990,100)]}};
const staleExactLauncher=validateBetfairSportingHarSnapshot(staleExactLauncherHar,{sourceName:'stale-preserve-log.har'});
assert.equal(staleExactLauncher.valid,false);
assert.equal(staleExactLauncher.reason,'LATEST_REAL_CASINO_LAUNCHER_NOT_AP_MCCOY');
assert.equal(staleExactLauncher.latestPrecedingRealCasinoLauncher.gameId,'another-playtech-game-cptn');
assert.equal(staleExactLauncher.hardGuards.staleApMcCoyLauncherCannotAuthorizeLaterDifferentGameTicker,true);
assert.equal(staleExactLauncher.realMoneyAllowed,false);
assert.equal(staleExactLauncher.maxSpins,0);

const configAfterTickerHar={log:{entries:[exactLauncher(),ticker(1990,100),config()]}};
const configAfterTicker=validateBetfairSportingHarSnapshot(configAfterTickerHar,{sourceName:'postdated-config.har'});
assert.equal(configAfterTicker.valid,false);
assert.equal(configAfterTicker.reason,'CONFIG_BINDING_DOES_NOT_PRECEDE_TICKER_ENTRY');
assert.equal(configAfterTicker.hardGuards.configBindingMustPrecedeTickerEntry,true);
assert.equal(configAfterTicker.realMoneyAllowed,false);

const preLaunchConfigHar={log:{entries:[config(),exactLauncher(),ticker(1990,100)]}};
const preLaunchConfig=validateBetfairSportingHarSnapshot(preLaunchConfigHar,{sourceName:'stale-prelaunch-config.har'});
assert.equal(preLaunchConfig.valid,false);
assert.equal(preLaunchConfig.reason,'CONFIG_BINDING_NOT_POST_AP_MCCOY_LAUNCH');
assert.equal(preLaunchConfig.hardGuards.configBindingMustFollowExactLauncher,true);
assert.equal(preLaunchConfig.realMoneyAllowed,false);

const supersededConfigHar={log:{entries:[
  exactLauncher(),
  config('bf_es','https://tickers.playtech.example/new_jackpotxml.php','first'),
  config('other_es','https://other.example/new_jackpotxml.php','latest'),
  ticker(1990,100),
]}};
const supersededConfig=validateBetfairSportingHarSnapshot(supersededConfigHar,{sourceName:'superseded-config.har'});
assert.equal(supersededConfig.valid,false);
assert.equal(supersededConfig.reason,'PAIRED_CONFIG_IS_NOT_LATEST_POST_LAUNCH_INITIAL_RESOURCES');
assert.equal(supersededConfig.latestPostLaunchInitialResourcesEntryIndex,2);
assert.equal(supersededConfig.configEntryIndex,1);
assert.equal(supersededConfig.hardGuards.stalePreLaunchOrSupersededConfigCannotAuthorizeTicker,true);
assert.equal(supersededConfig.realMoneyAllowed,false);

const one=validateBetfairSportingHarSnapshot(har(1990,100),{sourceName:'before.har'});
assert.equal(one.version,'betfair-sporting-har-overdue-bridge-v1.5-session-config-attested');
assert.equal(one.valid,true);
assert.equal(one.exactApMcCoyRealLauncherBindingVerified,true);
assert.equal(one.latestPrecedingRealCasinoLauncherIsExactApMcCoy,true);
assert.equal(one.latestPostLaunchInitialResourcesBindingVerified,true);
assert.equal(one.launcherEntryIndex,0);
assert.equal(one.configEntryIndex,1);
assert.equal(one.tickerEntryIndex,2);
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
assert.equal(r.version,'betfair-sporting-har-overdue-bridge-v1.5-session-config-attested');
assert.equal(r.valid,true);
assert.equal(r.exactApMcCoyRealLauncherBindingVerifiedOnBothSnapshots,true);
assert.equal(r.latestPrecedingRealCasinoLauncherIsExactApMcCoyOnBothSnapshots,true);
assert.equal(r.latestPostLaunchInitialResourcesBindingVerifiedOnBothSnapshots,true);
assert.equal(r.before.captureEpochSeconds,1990);
assert.equal(r.after.captureEpochSeconds,2005);
assert.equal(r.finalEvaluation.followingDayUnawardedVerified,true);
assert.equal(r.finalEvaluation.nextEligibleNetworkBetGuaranteedJackpot,true);
assert.equal(r.finalEvaluation.exactBetfairSpainTickerImsBindingVerified,true);
assert.equal(r.hardGuards.exactApMcCoyRealLauncherVerifiedOnBothSnapshots,true);
assert.equal(r.hardGuards.latestPrecedingRealCasinoLauncherVerifiedOnBothSnapshots,true);
assert.equal(r.hardGuards.latestPostLaunchInitialResourcesVerifiedOnBothSnapshots,true);
assert.equal(r.hardGuards.configBindingPrecedesTickerOnBothSnapshots,true);
assert.equal(r.hardGuards.benignCacheBusterQueryChangesIgnored,true);
assert.equal(r.hardGuards.harCaptureTimeAttestedOnBothSnapshots,true);
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.maxSpins,0);
assert.equal(r.reason,'FOLLOWING_DAY_UNAWARDED_VERIFIED_RACE_GATE_OPEN');

const staleAfter=evaluateBetfairSportingHarOverduePair({
  beforeHar:har(1990,100),afterHar:staleExactLauncherHar,decisionNowEpochSeconds:2010,
  betfairFirstBetFollowingDayRuleVerified:true,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,stakeEUR:0.25,
});
assert.equal(staleAfter.valid,false);
assert.equal(staleAfter.reason,'AFTER_HAR_SNAPSHOT_INVALID');
assert.equal(staleAfter.after.reason,'LATEST_REAL_CASINO_LAUNCHER_NOT_AP_MCCOY');
assert.equal(staleAfter.realMoneyAllowed,false);

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
