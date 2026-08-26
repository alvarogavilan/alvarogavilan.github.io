import assert from 'node:assert/strict';
import {analyzeBetfairSportingWebtickersRequestSemantics} from '../edge-backend/src/betfair-sporting-webtickers-request-semantics-v1.mjs';

const config='{"jackpotsCasino":"bf_es","liveEndpointUrl":"https://webtickers.malmegas.com/webtickers"}';
const initial={request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{mimeType:'application/json',text:config}}};

const post={
  request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?token=QUERY_SECRET',headers:[{name:'Content-Type',value:'application/json'}],postData:{mimeType:'application/json',text:'{"info":1,"casino":"bf_es","game":"sljp-1","currency":"eur","local":0,"token":"BODY_SECRET"}'}},
  response:{status:200,content:{mimeType:'application/json',text:'{"ok":true,"token":"RESPONSE_SECRET"}'}},
};
let r=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[initial,post]}},{sourceName:'request-post.har'});
assert.equal(r.version,'betfair-sporting-webtickers-request-semantics-v1');
assert.equal(r.exactConfiguredWebtickersTrafficObserved,true);
assert.equal(r.providerDocumentedExactDailyRequestObserved,true);
assert.equal(r.providerDocumentedExactDailyRequestMatchCount,1);
let m=r.requestSemanticObservations.find(x=>x.requestContractSemanticsSupportedByProviderSpec);
assert.ok(m);
assert.equal(m.source,'http-request');
assert.equal(m.infoGameBased,true);
assert.equal(m.casinoMatches,true);
assert.equal(m.gameMatches,true);
assert.equal(m.currencyEur,true);
assert.equal(m.localGlobal,true);
assert.equal(m.providerDocumentedGameRequestComplete,true);
assert.equal(m.exactSportingDailyScopeObserved,true);
assert.equal(r.directPublicModernProbeAllowed,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
let serialized=JSON.stringify(r);
for(const secret of ['QUERY_SECRET','BODY_SECRET','RESPONSE_SECRET'])assert.equal(serialized.includes(secret),false);

// info=2 is not the documented direct game-based request contract for an exact Daily lookup.
const info2={...post,request:{...post.request,postData:{mimeType:'application/json',text:'{"info":2,"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0}'}}};
r=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[initial,info2]}});
assert.equal(r.providerDocumentedExactDailyRequestObserved,false);
assert.equal(r.providerDocumentedExactDailyRequestMatchCount,0);

// WSS subscribe semantics are evaluated only from outbound frames plus the request URL, never receive frames.
const ws={
  request:{method:'GET',url:'wss://webtickers.malmegas.com/webtickers?casino=bf_es&token=WS_QUERY_SECRET',headers:[{name:'Authorization',value:'Bearer WS_HEADER_SECRET'}]},
  response:{status:101,content:{text:''}},
  _webSocketMessages:[
    {type:'send',opcode:1,data:'{"info":1,"game":"sljp-1","currency":"EUR","local":0,"token":"WS_SEND_SECRET"}'},
    {type:'receive',opcode:1,data:'{"info":2,"casino":"other","game":"sljp-2","currency":"USD","local":1,"token":"WS_RECEIVE_SECRET"}'},
  ],
};
r=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[initial,ws]}},{sourceName:'request-ws.har'});
assert.equal(r.providerDocumentedExactDailyRequestObserved,true);
m=r.requestSemanticObservations.find(x=>x.source.startsWith('websocket-send:')&&x.requestContractSemanticsSupportedByProviderSpec);
assert.ok(m);
assert.equal(m.configuredWebSocketTransportUpgradeObserved,true);
assert.equal(m.casinoMatches,true);
assert.equal(m.gameMatches,true);
assert.equal(m.currencyEur,true);
assert.equal(m.localGlobal,true);
serialized=JSON.stringify(r);
for(const secret of ['WS_QUERY_SECRET','WS_HEADER_SECRET','WS_SEND_SECRET','WS_RECEIVE_SECRET'])assert.equal(serialized.includes(secret),false);
for(const observation of r.requestSemanticObservations){
  for(const values of Object.values(observation.values||{}))assert.equal(values.includes('other'),false);
}

const foreignInitial={request:{method:'GET',url:'https://evil.example/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{text:config}}};
r=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[foreignInitial,post]}});
assert.equal(r.exactConfiguredWebtickersTrafficObserved,false);
assert.equal(r.providerDocumentedExactDailyRequestObserved,false);
assert.equal(r.execution.maxTotalStakeEUR,0);

const bad=analyzeBetfairSportingWebtickersRequestSemantics('{bad');
assert.equal(bad.valid,false);
assert.equal(bad.reason,'HAR_PARSE_FAILED');
assert.equal(bad.execution.maxSpins,0);

console.log('betfair-sporting-webtickers-request-semantics-v1.test.mjs: PASS');
