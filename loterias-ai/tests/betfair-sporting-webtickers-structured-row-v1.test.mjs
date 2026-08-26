import assert from 'node:assert/strict';
import {analyzeBetfairSportingStructuredWebtickersRows} from '../edge-backend/src/betfair-sporting-webtickers-structured-row-v1.mjs';

const config='{"jackpotsCasino":"bf_es","liveEndpointUrl":"https://webtickers.malmegas.com/webtickers"}';
const initial={request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{mimeType:'application/json',text:config}}};
const post={
  startedDateTime:'2026-08-26T18:00:01Z',
  request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers',headers:[{name:'Content-Type',value:'application/json'}],postData:{mimeType:'application/json',text:'{"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0}'}},
  response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({rows:[
    {game:'sljp-1',currency:'EUR',local:0,timestamp:2199,winc:42,jackpot:{amount:123.45,guaranteedHitTime:2200}},
    {game:'sljp-2',currency:'EUR',local:0,timestamp:2199,winc:10,jackpot:{amount:999,guaranteedHitTime:9999}},
  ]})}},
};
let r=analyzeBetfairSportingStructuredWebtickersRows({log:{entries:[initial,post]}},{sourceName:'structured.har'});
assert.equal(r.version,'betfair-sporting-webtickers-structured-row-v1.1-ws-direction-binding');
assert.equal(r.exactConfiguredWebtickersTrafficObserved,true);
assert.equal(r.structuredSljp1RowCandidateCount,1);
const c=r.structuredSljp1RowCandidates[0];
assert.equal(c.objectPath,'$.rows[0]');
assert.equal(c.expectedBetfairImsCasino,'bf_es');
assert.equal(c.requestCasinoMatchesConfiguredBinding,true);
assert.equal(c.row.game,'sljp-1');
assert.equal(c.row.currency,'EUR');
assert.equal(c.row.local,0);
assert.equal(c.row.amount,123.45);
assert.equal(c.row.guaranteedHitTime,2200);
assert.equal(c.row.gameTimestamp,2199);
assert.equal(c.row.winCount,42);
assert.equal(c.coLocatedRequiredStateFields,true);
assert.equal(c.exactModernResponseSemanticsVerified,false);
assert.equal(c.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);

// Never assemble required fields across sibling objects.
const split={...post,response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({rows:[
  {game:'sljp-1',currency:'EUR',local:0,timestamp:2199,winc:42},
  {amount:123.45,guaranteedHitTime:2200},
]})}}};
r=analyzeBetfairSportingStructuredWebtickersRows({log:{entries:[initial,split]}});
assert.equal(r.structuredSljp1RowCandidateCount,0);
assert.equal(r.hardGuards.noCrossObjectFieldAssembly,true);

// An explicit response casino that contradicts the exact Betfair config binding is rejected.
const wrongCasino={...post,response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({game:'sljp-1',currency:'EUR',local:0,casino:'other',timestamp:2199,winc:42,amount:123.45,guaranteedHitTime:2200})}}};
r=analyzeBetfairSportingStructuredWebtickersRows({log:{entries:[initial,wrongCasino]}});
assert.equal(r.structuredSljp1RowCandidateCount,0);

// Same structured-row rule applies to a real observed WSS transport upgrade.
const ws={
  startedDateTime:'2026-08-26T18:00:02Z',
  request:{method:'GET',url:'wss://webtickers.malmegas.com/webtickers',headers:[]},response:{status:101,content:{text:''}},
  _webSocketMessages:[
    {type:'send',opcode:1,data:'{"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0}'},
    {type:'receive',opcode:1,data:'{"game":"sljp-1","currency":"EUR","local":0,"timestamp":2299,"winc":43,"amount":124.56,"guaranteedHitTime":2300}'},
  ],
};
r=analyzeBetfairSportingStructuredWebtickersRows({log:{entries:[initial,ws]}},{sourceName:'structured-ws.har'});
assert.equal(r.structuredSljp1RowCandidateCount,1);
assert.equal(r.structuredSljp1RowCandidates[0].payloadKind,'websocket-receive');
assert.equal(r.structuredSljp1RowCandidates[0].configuredWebSocketTransportUpgradeObserved,true);
assert.equal(r.structuredSljp1RowCandidates[0].requestCasinoMatchesConfiguredBinding,true);
assert.equal(r.structuredSljp1RowCandidates[0].row.amount,124.56);
assert.equal(r.execution.maxTotalStakeEUR,0);

// Server receive data must never be allowed to manufacture request-side casino evidence.
const wsReceiveOnlyCasino={
  ...ws,
  _webSocketMessages:[
    {type:'send',opcode:1,data:'{"game":"sljp-1","currency":"EUR","local":0}'},
    {type:'receive',opcode:1,data:'{"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0,"timestamp":2399,"winc":44,"amount":125.67,"guaranteedHitTime":2400}'},
  ],
};
r=analyzeBetfairSportingStructuredWebtickersRows({log:{entries:[initial,wsReceiveOnlyCasino]}},{sourceName:'structured-ws-direction.har'});
assert.equal(r.structuredSljp1RowCandidateCount,1);
assert.equal(r.structuredSljp1RowCandidates[0].responseCasinoMatchesConfiguredBinding,true);
assert.equal(r.structuredSljp1RowCandidates[0].requestCasinoMatchesConfiguredBinding,false);
assert.equal(r.hardGuards.webSocketReceiveCannotSatisfyRequestCasinoBinding,true);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

const bad=analyzeBetfairSportingStructuredWebtickersRows('{bad');
assert.equal(bad.valid,false);
assert.equal(bad.reason,'HAR_PARSE_FAILED');
assert.equal(bad.structuredSljp1RowCandidateCount,0);
assert.equal(bad.execution.realMoneyAllowed,false);
console.log('betfair-sporting-webtickers-structured-row-v1.test.mjs: PASS');
