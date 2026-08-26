import assert from 'node:assert/strict';
import {analyzeSafeHarText} from '../scripts/analyze-betfair-sporting-har.mjs';

const config='{"jackpotsCasino":"bf_es","liveEndpointUrl":"https://webtickers.malmegas.com/webtickers?configured=CONFIGURED_SECRET"}';
const raw=JSON.stringify({log:{entries:[
  {request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop?cacheBust=CONFIG_QUERY_SECRET',headers:[]},response:{status:200,content:{mimeType:'application/json',text:config}}},
  {
    request:{method:'GET',url:'wss://webtickers.malmegas.com/webtickers?token=QUERY_SECRET',headers:[{name:'Authorization',value:'Bearer HEADER_SECRET'}]},
    response:{status:101,content:{text:''}},
    _webSocketMessages:[
      {type:'send',opcode:1,data:'{"casino":"bf_es","game":"sljp-1","currency":"EUR","token":"SEND_SECRET"}'},
      {type:'receive',opcode:1,data:'{"game":"sljp-1","guaranteedHitTime":2200,"jackpot":{"code":"sljp-1"},"token":"RECEIVE_SECRET"}'},
    ],
  },
]}});

const r=analyzeSafeHarText(raw,{sourceName:'modern-ws.har',nowEpochSeconds:2200});
assert.equal(r.ok,true);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.modernWebtickers.version,'betfair-sporting-webtickers-har-protocol-v1.2-source-url-redaction');
assert.equal(r.modernWebtickers.exactModernWebtickersTrafficObserved,true);
assert.equal(r.modernWebtickers.exactConfiguredWebtickersTrafficCount,1);
const p=r.modernWebtickers.protocolFingerprints[0];
assert.equal(p.configuredWebSocketTransportUpgradeObserved,true);
assert.equal(p.configBinding.sourceUrl,'https://launcher.betfair.es/initialResources/es_ES_desktop');
assert.equal(p.configBinding.tickerEndpoint,'https://webtickers.malmegas.com/webtickers');
assert.equal(p.request.endpoint,'wss://webtickers.malmegas.com/webtickers');
assert.equal(p.request.webSocket.present,true);
assert.equal(p.response.markers.sljp1,true);
assert.equal(p.response.markers.guaranteedHitTime,true);
const serialized=JSON.stringify(r);
for(const secret of ['CONFIG_QUERY_SECRET','CONFIGURED_SECRET','QUERY_SECRET','HEADER_SECRET','SEND_SECRET','RECEIVE_SECRET'])assert.equal(serialized.includes(secret),false);
console.log('analyze-betfair-sporting-har-safe-modern-websocket.test.mjs: PASS');
