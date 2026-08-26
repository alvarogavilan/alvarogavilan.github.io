import assert from 'node:assert/strict';
import {analyzeBetfairSportingCorrelatedWebtickersSession} from '../edge-backend/src/betfair-sporting-webtickers-correlated-session-v1.mjs';

const launcherFor=gameId=>({
  request:{method:'GET',url:`https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=${encodeURIComponent(gameId)}&launchProduct=casino&mode=real`,headers:[]},
  response:{status:200,content:{text:'launcher'}},
});
const launcher=launcherFor('ap-mccoy-sporting-legends-cptn');
const otherLauncher=launcherFor('different-casino-game');
const initialFor=(casino='bf_es',endpoint='https://webtickers.malmegas.com/webtickers')=>({
  request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},
  response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:casino,liveEndpointUrl:endpoint})}},
});
const initial=initialFor();
const http={
  startedDateTime:'2026-08-26T19:00:00Z',
  request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?info=1&casino=bf_es&game=sljp-1&currency=EUR&local=0',headers:[],postData:{mimeType:'application/json',text:'{}'}},
  response:{status:200,content:{mimeType:'application/json',text:'{"rows":[{"game":"sljp-1","currency":"EUR","local":0,"timestamp":1000,"winc":7,"amount":123.45,"guaranteedHitTime":1100}]}' }},
};

let r=analyzeBetfairSportingCorrelatedWebtickersSession({log:{entries:[launcher,initial,http]}},{sourceName:'http.har'});
assert.equal(r.version,'betfair-sporting-webtickers-correlated-session-v1.3-session-config-attested');
assert.equal(r.valid,true);
assert.equal(r.exactApMcCoyRealLauncherBindingObserved,true);
assert.equal(r.exactApMcCoyRealLauncherBindingCount,1);
assert.equal(r.betfairRealCasinoLauncherBindingCount,1);
assert.equal(r.requestSemanticMatchCount,1);
assert.equal(r.structuredSljp1RowCandidateCount,1);
assert.equal(r.correlatedExactDailyCandidateCount,1);
assert.equal(r.launcherOrderRejectedCount,0);
assert.equal(r.staleExactLauncherRejectedCount,0);
assert.equal(r.sessionConfigRejectedCount,0);
assert.equal(r.ambiguousCorrelationCount,0);
const c=r.correlatedExactDailyCandidates[0];
assert.equal(c.exactApMcCoyRealLauncherPrecedesCorrelatedEntry,true);
assert.equal(c.latestPrecedingRealCasinoLauncherIsExactApMcCoy,true);
assert.equal(c.latestPostLaunchBetfairInitialResourcesBindingVerified,true);
assert.equal(c.launcherEntryIndex,0);
assert.equal(c.initialResourcesEntryIndex,1);
assert.equal(c.sameEntryRequestResponseCorrelation,true);
assert.equal(c.request.source,'http-request');
assert.equal(c.responseRow.row.amount,123.45);
assert.equal(c.exactModernResponseSemanticsVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);
assert.equal(r.hardGuards.latestPostLaunchBetfairInitialResourcesMustMatchTickerBinding,true);

// The same Betfair traffic without AP McCoy launcher is never promoted.
r=analyzeBetfairSportingCorrelatedWebtickersSession({log:{entries:[initial,http]}},{sourceName:'generic.har'});
assert.equal(r.valid,true);
assert.equal(r.exactApMcCoyRealLauncherBindingObserved,false);
assert.equal(r.correlatedExactDailyCandidateCount,0);
assert.equal(r.launcherOrderRejectedCount,1);
assert.equal(r.execution.maxTotalStakeEUR,0);

// A launcher appearing after ticker traffic cannot retroactively attest it.
r=analyzeBetfairSportingCorrelatedWebtickersSession({log:{entries:[initial,http,launcher]}},{sourceName:'late-launcher.har'});
assert.equal(r.exactApMcCoyRealLauncherBindingObserved,true);
assert.equal(r.correlatedExactDailyCandidateCount,0);
assert.equal(r.launcherOrderRejectedCount,1);
assert.equal(r.execution.realMoneyAllowed,false);

// Config captured before AP McCoy launch is stale for that launched session.
r=analyzeBetfairSportingCorrelatedWebtickersSession({log:{entries:[initial,launcher,http]}},{sourceName:'prelaunch-config.har'});
assert.equal(r.exactApMcCoyRealLauncherBindingObserved,true);
assert.equal(r.correlatedExactDailyCandidateCount,0);
assert.equal(r.sessionConfigRejectedCount,1);
assert.equal(r.hardGuards.stalePreLaunchConfigCannotAuthorizeTicker,true);
assert.equal(r.execution.realMoneyAllowed,false);

// Preserve-log history: an old AP McCoy launch cannot attest traffic after a later different real casino game launch.
r=analyzeBetfairSportingCorrelatedWebtickersSession({log:{entries:[launcher,initial,otherLauncher,initial,http]}},{sourceName:'different-game-after-apmccoy.har'});
assert.equal(r.exactApMcCoyRealLauncherBindingObserved,true);
assert.equal(r.betfairRealCasinoLauncherBindingCount,2);
assert.equal(r.correlatedExactDailyCandidateCount,0);
assert.equal(r.staleExactLauncherRejectedCount,1);
assert.equal(r.hardGuards.staleExactLauncherCannotAuthorizeLaterDifferentGameTraffic,true);
assert.equal(r.execution.maxSpins,0);

// The latest post-launch initialResources is authoritative for session provenance; a mismatching newer config blocks an older matching one.
r=analyzeBetfairSportingCorrelatedWebtickersSession({log:{entries:[launcher,initial,initialFor('other_ims'),http]}},{sourceName:'changed-config.har'});
assert.equal(r.correlatedExactDailyCandidateCount,0);
assert.ok(r.sessionConfigRejectedCount>=1);
assert.equal(r.hardGuards.ambiguousLatestSessionConfigRejected,true);
assert.equal(r.execution.realMoneyAllowed,false);

// Two valid client send frames on one WSS entry are ambiguous and fail closed instead of being paired to one server row.
const ws={
  startedDateTime:'2026-08-26T19:00:01Z',
  request:{method:'GET',url:'wss://webtickers.malmegas.com/webtickers',headers:[]},
  response:{status:101,content:{text:''}},
  _webSocketMessages:[
    {type:'send',opcode:1,data:'{"info":1,"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0}'},
    {type:'send',opcode:1,data:'{"info":1,"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0}'},
    {type:'receive',opcode:1,data:'{"game":"sljp-1","currency":"EUR","local":0,"timestamp":1001,"winc":8,"amount":124.56,"guaranteedHitTime":1100}'},
  ],
};
r=analyzeBetfairSportingCorrelatedWebtickersSession({log:{entries:[launcher,initial,ws]}},{sourceName:'ambiguous-ws.har'});
assert.equal(r.requestSemanticMatchCount,2);
assert.equal(r.structuredSljp1RowCandidateCount,1);
assert.equal(r.correlatedExactDailyCandidateCount,0);
assert.equal(r.ambiguousCorrelationCount,1);
assert.equal(r.hardGuards.ambiguousMultipleRequestMatchesRejected,true);
assert.equal(r.execution.realMoneyAllowed,false);

const bad=analyzeBetfairSportingCorrelatedWebtickersSession('{bad');
assert.equal(bad.valid,false);
assert.equal(bad.reason,'HAR_PARSE_FAILED');
assert.equal(bad.execution.realMoneyAllowed,false);
console.log('betfair-sporting-webtickers-correlated-session-v1.test.mjs: PASS');
