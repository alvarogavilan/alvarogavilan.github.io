import assert from 'node:assert/strict';
import {analyzeBet365SportingStructuredWebtickersRows} from '../edge-backend/src/bet365-sporting-webtickers-structured-row-v1.mjs';

const launch=()=>({startedDateTime:'2026-08-26T20:00:00.000Z',request:{method:'GET',url:'https://casino.bet365.es/launch?game=gpas_bgeorge_pop&token=SECRET',headers:[{name:'cookie',value:'PRIVATE'}]},response:{status:200,content:{mimeType:'application/json',text:'{"title":"Bobby George: Sporting Legends","gameCode":"gpas_bgeorge_pop"}'}}});
const config=()=>({startedDateTime:'2026-08-26T20:00:01.000Z',request:{method:'GET',url:'https://casino.bet365.es/initialResources/es_ES_desktop?token=QUERY_SECRET',headers:[]},response:{status:200,content:{mimeType:'application/json',text:'{"nested":{"jackpotsCasino":"bet365_es","jackpotsCasinoUrl":"https://ticker.example/webtickers?token=HIDDEN","liveEndpointUrl":"wss://ticker.example/webtickers?session=HIDDEN","useServicesCasinoJackpots":true}}'}}});
const row=({casino='bet365_es',instanceCode='es1',amount=123.45,ght=1787774400,timestamp=1787774398,winc=17}={})=>({game:'sljp-1',currency:'EUR',local:0,casino,instanceCode,gameGroup:'sljp',amount,guaranteedHitTime:ght,timestamp,winc});
const ticker=({body,frames=[]}={})=>({startedDateTime:'2026-08-26T20:00:02.000Z',request:{method:'GET',url:'https://ticker.example/webtickers?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[]},response:{status:200,content:{mimeType:'application/json',text:body??JSON.stringify({data:row()})}},_webSocketMessages:frames});
const har=t=>({log:{entries:[launch(),config(),t]}});

let r=analyzeBet365SportingStructuredWebtickersRows(har(ticker()),{gameCode:'gpas_bgeorge_pop',sourceName:'capture.har'});
assert.equal(r.valid,true);
assert.equal(r.bet365OwnedConfiguredSljp1TransportBindingVerified,true);
assert.equal(r.structuredSljp1RowCandidateCount,1);
assert.equal(r.structuredSljp1RowCandidates[0].row.amount,123.45);
assert.equal(r.structuredSljp1RowCandidates[0].row.guaranteedHitTime,1787774400);
assert.equal(r.structuredSljp1RowCandidates[0].row.winCount,17);
assert.equal(r.exactModernResponseSemanticsVerified,false);
assert.equal(r.exactCurrentSljp1ServerStateVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(JSON.stringify(r).includes('QUERY_SECRET'),false);
assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
assert.equal(JSON.stringify(r).includes('HIDDEN'),false);

r=analyzeBet365SportingStructuredWebtickersRows(har(ticker({body:JSON.stringify({data:row({casino:'other_operator'})})})),{gameCode:'gpas_bgeorge_pop'});
assert.equal(r.valid,true);
assert.equal(r.structuredSljp1RowCandidateCount,0);

r=analyzeBet365SportingStructuredWebtickersRows(har(ticker({body:JSON.stringify({data:{...row(),amount:123.45,jackpot:{amount:999.99,guaranteedHitTime:1787774400}}})})),{gameCode:'gpas_bgeorge_pop'});
assert.equal(r.valid,true);
assert.equal(r.structuredSljp1RowCandidateCount,0);

const fakeSend={type:'send',data:JSON.stringify({data:row({amount:99999})})};
r=analyzeBet365SportingStructuredWebtickersRows(har(ticker({body:'{}',frames:[fakeSend]})),{gameCode:'gpas_bgeorge_pop'});
assert.equal(r.valid,true);
assert.equal(r.structuredSljp1RowCandidateCount,0);

console.log('bet365-sporting-webtickers-structured-row-v1.test.mjs: PASS');
