import assert from 'node:assert/strict';
import {analyzeBetfairSportingWebtickersTargetSession} from '../edge-backend/src/betfair-sporting-webtickers-target-session-v1.mjs';

const config='{"jackpotsCasino":"bf_es","liveEndpointUrl":"https://webtickers.malmegas.com/webtickers"}';
const initial=()=>({request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{mimeType:'application/json',text:config}}});
const launcher=gameId=>({request:{method:'GET',url:`https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=${gameId}&launchProduct=casino&mode=real`,headers:[]},response:{status:200,content:{text:''}}});
const post=()=>({request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?token=QUERY_SECRET',headers:[{name:'Authorization',value:'Bearer HEADER_SECRET'}],postData:{mimeType:'application/json',text:'{"info":1,"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0,"token":"BODY_SECRET"}'}},response:{status:200,content:{mimeType:'application/json',text:'{"ok":true,"token":"RESPONSE_SECRET"}'}}});
const ws=()=>({request:{method:'GET',url:'wss://webtickers.malmegas.com/webtickers?casino=bf_es&token=WS_QUERY_SECRET',headers:[{name:'Authorization',value:'Bearer WS_HEADER_SECRET'}]},response:{status:101,content:{text:''}},_webSocketMessages:[{type:'send',opcode:1,data:'{"info":1,"game":"sljp-1","currency":"EUR","local":0,"token":"WS_SEND_SECRET"}'},{type:'receive',opcode:1,data:'{"amount":123.45,"token":"WS_RECEIVE_SECRET"}'}]});
const AP='ap-mccoy-sporting-legends-cptn',FRANKIE='frankie-dettori-sporting-legends-cptn',RONNIE='ronnie-osullivan-sporting-legends-cptn';

let r=analyzeBetfairSportingWebtickersTargetSession({log:{entries:[launcher(FRANKIE),initial(),post()]}},{gameId:FRANKIE,sourceName:'frankie-http.har'});
assert.equal(r.valid,true);
assert.equal(r.gameId,FRANKIE);
assert.equal(r.exactTargetSessionConfiguredSljp1TransportVerified,true);
assert.equal(r.expectedBetfairImsCasino,'bf_es');
assert.equal(r.configuredTickerEndpoint,'https://webtickers.malmegas.com/webtickers');
assert.equal(r.observedTransportEndpoint,'https://webtickers.malmegas.com/webtickers');
assert.equal(r.observedTransport,'HTTPS');
assert.equal(r.request.requestContractSemanticsSupportedByProviderSpec,true);
assert.equal(r.modernResponseSemanticsVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
let serialized=JSON.stringify(r);
for(const secret of ['QUERY_SECRET','HEADER_SECRET','BODY_SECRET','RESPONSE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('?'),false);

r=analyzeBetfairSportingWebtickersTargetSession({log:{entries:[launcher(RONNIE),initial(),ws()]}},{gameId:RONNIE,sourceName:'ronnie-wss.har'});
assert.equal(r.valid,true);
assert.equal(r.exactTargetSessionConfiguredSljp1TransportVerified,true);
assert.equal(r.observedTransport,'WSS_UPGRADE');
assert.equal(r.configuredTickerEndpoint,'https://webtickers.malmegas.com/webtickers');
assert.equal(r.observedTransportEndpoint,'wss://webtickers.malmegas.com/webtickers');
assert.equal(r.request.configuredWebSocketTransportUpgradeObserved,true);
serialized=JSON.stringify(r);
for(const secret of ['WS_QUERY_SECRET','WS_HEADER_SECRET','WS_SEND_SECRET','WS_RECEIVE_SECRET'])assert.equal(serialized.includes(secret),false);

// The latest real-money launcher must be the requested title, not a stale earlier Sporting launch.
r=analyzeBetfairSportingWebtickersTargetSession({log:{entries:[launcher(FRANKIE),initial(),launcher(AP),post()]}},{gameId:FRANKIE});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_TARGET_WEBTICKERS_SESSION_NOT_RECOVERED');
assert.equal(r.execution.realMoneyAllowed,false);

// Config captured before the target launch cannot establish that title's current session.
r=analyzeBetfairSportingWebtickersTargetSession({log:{entries:[initial(),launcher(FRANKIE),post()]}},{gameId:FRANKIE});
assert.equal(r.valid,false);
assert.equal(r.exactTargetSessionConfiguredSljp1TransportVerified,false);

// Wrong casino in outbound request fails provider-documented exact routing semantics.
const wrongPost={...post(),request:{...post().request,postData:{mimeType:'application/json',text:'{"info":1,"casino":"other_es","game":"sljp-1","currency":"EUR","local":0}'}}};
r=analyzeBetfairSportingWebtickersTargetSession({log:{entries:[launcher(FRANKIE),initial(),wrongPost]}},{gameId:FRANKIE});
assert.equal(r.valid,false);
assert.equal(r.execution.maxSpins,0);

console.log('betfair-sporting-webtickers-target-session-v1.test.mjs: PASS');
