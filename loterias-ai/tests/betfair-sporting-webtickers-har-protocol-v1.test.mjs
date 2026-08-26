import assert from 'node:assert/strict';
import {analyzeBetfairSportingWebtickersProtocolHar} from '../edge-backend/src/betfair-sporting-webtickers-har-protocol-v1.mjs';

const config='{"jackpotsCasino":"bf_es","liveEndpointUrl":"https://webtickers.malmegas.com/webtickers"}';
const har={log:{entries:[
  {startedDateTime:'2026-08-26T18:00:00Z',request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{mimeType:'application/json',text:config}}},
  {startedDateTime:'2026-08-26T18:00:01Z',request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?casino=bf_es&route=es-prod&token=QUERY_SECRET',headers:[{name:'Content-Type',value:'application/json'},{name:'Authorization',value:'Bearer HEADER_SECRET'},{name:'Cookie',value:'sid=COOKIE_SECRET'}],postData:{mimeType:'application/json',text:'{"casino":"bf_es","game":"sljp-1","currency":"eur","local":0,"vipLevel":"guest","token":"BODY_SECRET","nested":{"instanceCode":"ims-a"}}'}},response:{status:200,content:{mimeType:'application/json',text:'{"game":"sljp-1","guaranteedHitTime":2100,"token":"RESPONSE_SECRET","jackpot":{"amount":123.45}}'}}},
  {request:{method:'POST',url:'https://evil.example/webtickers?casino=fake',postData:{mimeType:'application/json',text:'{"game":"sljp-1"}'},headers:[]},response:{status:200,content:{text:'{"game":"sljp-1"}'}}}
]}};

const r=analyzeBetfairSportingWebtickersProtocolHar(har,{sourceName:'betfair-modern.har'});
assert.equal(r.modernBetfairConfigBindingCount,1);
assert.equal(r.exactConfiguredWebtickersTrafficCount,1);
assert.equal(r.exactModernWebtickersTrafficObserved,true);
assert.equal(r.exactModernRequestContractVerified,false);
assert.equal(r.directPublicModernProbeAllowed,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);
const p=r.protocolFingerprints[0];
assert.equal(p.configBinding.jackpotsCasino,'bf_es');
assert.equal(p.request.method,'POST');
assert.equal(p.request.endpoint,'https://webtickers.malmegas.com/webtickers');
assert.deepEqual(p.request.query.parameterNames,['casino','route','token']);
assert.deepEqual(p.request.query.safeProtocolValues.casino,['bf_es']);
assert.equal(Object.hasOwn(p.request.query.safeProtocolValues,'token'),false);
assert.equal(p.request.headers['content-type'],'application/json');
assert.equal(Object.hasOwn(p.request.headers,'authorization'),false);
assert.equal(Object.hasOwn(p.request.headers,'cookie'),false);
assert.equal(p.request.postData.format,'json');
assert.equal(p.request.postData.fieldNames.includes('token'),true);
assert.deepEqual(p.request.postData.safeProtocolValues.game,['sljp-1']);
assert.deepEqual(p.request.postData.safeProtocolValues.instancecode,['ims-a']);
assert.equal(Object.hasOwn(p.request.postData.safeProtocolValues,'token'),false);
assert.equal(p.response.markers.sljp1,true);
assert.equal(p.response.markers.guaranteedHitTime,true);
const serialized=JSON.stringify(r);
for(const secret of ['QUERY_SECRET','HEADER_SECRET','COOKIE_SECRET','BODY_SECRET','RESPONSE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('evil.example'),false);
assert.equal(r.hardGuards.sensitiveValuesRedacted,true);

const foreign={log:{entries:[
  {request:{method:'GET',url:'https://evil.example/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{text:config}}},
  har.log.entries[1],
]}};
const f=analyzeBetfairSportingWebtickersProtocolHar(foreign);
assert.equal(f.modernBetfairConfigBindingCount,0);
assert.equal(f.exactConfiguredWebtickersTrafficCount,0);
assert.equal(f.exactModernWebtickersTrafficObserved,false);
assert.equal(f.execution.realMoneyAllowed,false);

const bad=analyzeBetfairSportingWebtickersProtocolHar('{bad');
assert.equal(bad.valid,false);
assert.equal(bad.reason,'HAR_PARSE_FAILED');
assert.equal(bad.execution.maxTotalStakeEUR,0);
console.log('betfair-sporting-webtickers-har-protocol-v1.test.mjs: PASS');
