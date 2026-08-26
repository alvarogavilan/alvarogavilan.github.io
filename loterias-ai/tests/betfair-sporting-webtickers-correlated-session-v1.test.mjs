import assert from 'node:assert/strict';
import {analyzeBetfairSportingCorrelatedWebtickersSession} from '../edge-backend/src/betfair-sporting-webtickers-correlated-session-v1.mjs';

const launcher={
  request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real',headers:[]},
  response:{status:200,content:{text:'launcher'}},
};
const initial={
  request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},
  response:{status:200,content:{mimeType:'application/json',text:'{"jackpotsCasino":"bf_es","liveEndpointUrl":"https://webtickers.malmegas.com/webtickers"}'}},
};
const http={
  startedDateTime:'2026-08-26T19:00:00Z',
  request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?info=1&casino=bf_es&game=sljp-1&currency=EUR&local=0',headers:[],postData:{mimeType:'application/json',text:'{}'}},
  response:{status:200,content:{mimeType:'application/json',text:'{"rows":[{"game":"sljp-1","currency":"EUR","local":0,"timestamp":1000,"winc":7,"amount":123.45,"guaranteedHitTime":1100}]}' }},
};

let r=analyzeBetfairSportingCorrelatedWebtickersSession({log:{entries:[launcher,initial,http]}},{sourceName:'http.har'});
assert.equal(r.valid,true);
assert.equal(r.exactApMcCoyRealLauncherBindingObserved,true);
assert.equal(r.requestSemanticMatchCount,1);
assert.equal(r.structuredSljp1RowCandidateCount,1);
assert.equal(r.correlatedExactDailyCandidateCount,1);
assert.equal(r.ambiguousCorrelationCount,0);
assert.equal(r.correlatedExactDailyCandidates[0].sameEntryRequestResponseCorrelation,true);
assert.equal(r.correlatedExactDailyCandidates[0].request.source,'http-request');
assert.equal(r.correlatedExactDailyCandidates[0].responseRow.row.amount,123.45);
assert.equal(r.correlatedExactDailyCandidates[0].exactModernResponseSemanticsVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);

// The same Betfair traffic without the exact AP McCoy real launcher is never promoted to a correlated exact-game candidate.
r=analyzeBetfairSportingCorrelatedWebtickersSession({log:{entries:[initial,http]}},{sourceName:'generic.har'});
assert.equal(r.valid,true);
assert.equal(r.exactApMcCoyRealLauncherBindingObserved,false);
assert.equal(r.correlatedExactDailyCandidateCount,0);
assert.equal(r.execution.maxTotalStakeEUR,0);

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
