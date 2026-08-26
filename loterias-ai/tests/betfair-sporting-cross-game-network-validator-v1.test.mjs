import assert from 'node:assert/strict';
import {BETFAIR_SPORTING_CROSS_GAME_CANDIDATE_IDS,evaluateBetfairSportingCrossGameNetworkBinding,validateBetfairSportingHarForExactGame} from '../casino/jackpots/betfair-sporting-cross-game-network-validator-v1.mjs';

const launcher=gameId=>({startedDateTime:'2026-08-26T20:00:00.000Z',request:{method:'GET',url:`https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=${gameId}&launchProduct=casino&mode=real`,headers:[]},response:{status:200,content:{text:'launcher'}}});
const initial=(casino='bf_es',ticker='https://legacy.example/new_jackpotxml.php')=>({startedDateTime:'2026-08-26T20:00:01.000Z',request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:casino,jackpotsCasinoUrl:ticker})}}});
const ticker=({casino='bf_es',ticker='https://legacy.example/new_jackpotxml.php',capture=1000,gameTs=1000,amount=123.45,ght=1100,winc=7,exec=10}={})=>({startedDateTime:new Date(capture*1000).toISOString(),request:{method:'GET',url:`${ticker}?info=1&casino=${casino}&game=sljp-1&currency=EUR&local=0`,headers:[]},response:{status:200,content:{mimeType:'text/xml',text:`<request casino="${casino}" currency="EUR" game="sljp-1" info="1" startTimestamp="${gameTs-exec}" execInterval="${exec}"><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${gameTs}" winc="${winc}"><amount currency="EUR" guaranteedHitTime="${ght}" step="0.01" wins="1000">${amount}</amount></gamedata></request>`}}});
const har=(gameId,opts={})=>({log:{entries:[launcher(gameId),initial(opts.casino,opts.ticker),ticker(opts)]}});
const AP='ap-mccoy-sporting-legends-cptn';
const RONNIE='ronnie-osullivan-sporting-legends-cptn';
const FRANKIE='frankie-dettori-sporting-legends-cptn';
const ROBERTO='roberto-carlos-sl-cptn';

assert.deepEqual(new Set(BETFAIR_SPORTING_CROSS_GAME_CANDIDATE_IDS),new Set([AP,RONNIE,FRANKIE,ROBERTO]));
let one=validateBetfairSportingHarForExactGame(har(RONNIE,{capture:1000,gameTs:1000}),{gameId:RONNIE});
assert.equal(one.version,'betfair-sporting-cross-game-single-session-v1.1-latest-session-poll');
assert.equal(one.valid,true);
assert.equal(one.gameId,RONNIE);
assert.equal(one.expectedBetfairImsCasino,'bf_es');
assert.equal(one.tickerEndpoint,'https://legacy.example/new_jackpotxml.php');
assert.equal(one.latestPairedTickerPollSelected,true);
assert.equal(one.pairedServerEvidenceCount,1);
assert.equal(one.execution.decision,'NO_PLAY');

const multiPoll={log:{entries:[
  launcher(RONNIE),initial(),
  ticker({capture:990,gameTs:990,amount:123.35}),
  ticker({capture:1000,gameTs:1000,amount:123.45}),
]}};
one=validateBetfairSportingHarForExactGame(multiPoll,{gameId:RONNIE});
assert.equal(one.valid,true);
assert.equal(one.pairedServerEvidenceCount,2);
assert.equal(one.latestPairedTickerPollSelected,true);
assert.equal(one.tickerEntryIndex,3);
assert.equal(one.captureEpochSeconds,1000);
assert.equal(one.snapshot.amount,123.45);
assert.equal(one.hardGuards.multipleNormalTickerPollsSupported,true);

// Preserve-log safety: never fall back to an older valid Ronnie poll after a
// later real-money AP McCoy launcher owns the latest sljp-1 poll.
const laterOtherGame={log:{entries:[
  launcher(RONNIE),initial(),ticker({capture:990,gameTs:990,amount:123.35}),
  launcher(AP),ticker({capture:1000,gameTs:1000,amount:123.45}),
]}};
one=validateBetfairSportingHarForExactGame(laterOtherGame,{gameId:RONNIE});
assert.equal(one.valid,false);
assert.equal(one.reason,'LATEST_PRECEDING_REAL_LAUNCHER_NOT_TARGET_GAME');
assert.equal(one.latestPairedTickerEntryIndex,4);
assert.equal(one.observedGameId,AP);
assert.equal(one.execution.realMoneyAllowed,false);

let r=evaluateBetfairSportingCrossGameNetworkBinding({
  leftHar:har(AP,{capture:1000,gameTs:1000,amount:123.45}),leftGameId:AP,
  rightHar:har(RONNIE,{capture:1005,gameTs:1005,amount:123.55}),rightGameId:RONNIE,
  maxCaptureSkewSeconds:10,
});
assert.equal(r.version,'betfair-sporting-cross-game-network-validator-v1.1-latest-session-poll');
assert.equal(r.valid,true);
assert.equal(r.exactSharedSljp1NetworkBindingVerified,true);
assert.equal(r.sameImsCasino,true);
assert.equal(r.sameTickerEndpoint,true);
assert.equal(r.sameGuaranteedHitTime,true);
assert.equal(r.sameWinCount,true);
assert.equal(r.nondecreasingAmount,true);
assert.equal(r.crossGameExecutionEquivalentVerified,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.hardGuards.latestPairedTickerPollSelectedOnBothGames,true);
assert.equal(r.hardGuards.sharedNetworkDoesNotImplyEqualHazard,true);

r=evaluateBetfairSportingCrossGameNetworkBinding({leftHar:har(AP,{capture:1000,gameTs:1000}),leftGameId:AP,rightHar:har(FRANKIE,{casino:'other_es',capture:1005,gameTs:1005}),rightGameId:FRANKIE,maxCaptureSkewSeconds:10});
assert.equal(r.exactSharedSljp1NetworkBindingVerified,false);
assert.equal(r.sameImsCasino,false);
assert.equal(r.execution.maxSpins,0);

r=evaluateBetfairSportingCrossGameNetworkBinding({leftHar:har(AP,{capture:1000,gameTs:1000}),leftGameId:AP,rightHar:har(ROBERTO,{ticker:'https://other.example/new_jackpotxml.php',capture:1005,gameTs:1005}),rightGameId:ROBERTO,maxCaptureSkewSeconds:10});
assert.equal(r.exactSharedSljp1NetworkBindingVerified,false);
assert.equal(r.sameTickerEndpoint,false);

r=evaluateBetfairSportingCrossGameNetworkBinding({leftHar:har(AP,{capture:1000,gameTs:1000,ght:1100}),leftGameId:AP,rightHar:har(RONNIE,{capture:1005,gameTs:1005,ght:1200}),rightGameId:RONNIE,maxCaptureSkewSeconds:10});
assert.equal(r.exactSharedSljp1NetworkBindingVerified,false);
assert.equal(r.sameGuaranteedHitTime,false);

r=evaluateBetfairSportingCrossGameNetworkBinding({leftHar:har(AP,{capture:1000,gameTs:1000}),leftGameId:AP,rightHar:har(RONNIE,{capture:1040,gameTs:1040}),rightGameId:RONNIE,maxCaptureSkewSeconds:10});
assert.equal(r.exactSharedSljp1NetworkBindingVerified,false);
assert.equal(r.captureSkewWithinPolicy,false);

r=evaluateBetfairSportingCrossGameNetworkBinding({leftHar:har(AP,{capture:1000,gameTs:1000}),leftGameId:AP,rightHar:har(AP,{capture:1005,gameTs:1005}),rightGameId:AP});
assert.equal(r.valid,false);
assert.equal(r.reason,'TWO_DISTINCT_SPORTING_GAME_IDS_REQUIRED');
assert.equal(r.execution.realMoneyAllowed,false);

console.log('betfair-sporting-cross-game-network-validator-v1.test.mjs: PASS');
