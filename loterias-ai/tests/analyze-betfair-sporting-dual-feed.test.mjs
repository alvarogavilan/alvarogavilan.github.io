import assert from 'node:assert/strict';
import {analyzeSafeDualFeedTexts} from '../scripts/analyze-betfair-sporting-dual-feed.mjs';

const raw=(timestamp,amount)=>JSON.stringify({log:{entries:[
  {request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real&token=LAUNCH_SECRET',headers:[{name:'Cookie',value:'sid=COOKIE_SECRET'}]},response:{status:200,content:{text:'launcher'}}},
  {request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop?token=CONFIG_SECRET',headers:[{name:'Authorization',value:'Bearer AUTH_SECRET'}]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bf_es',jackpotsCasinoUrl:'https://legacy.example/new_jackpotxml.php?secret=LEGACY_CONFIG_SECRET',liveEndpointUrl:'https://webtickers.malmegas.com/webtickers?secret=MODERN_CONFIG_SECRET'})}}},
  {startedDateTime:new Date(timestamp*1000).toISOString(),request:{method:'GET',url:'https://legacy.example/new_jackpotxml.php?info=1&casino=bf_es&game=sljp-1&currency=eur&local=0&token=LEGACY_QUERY_SECRET',headers:[]},response:{status:200,content:{mimeType:'text/xml',text:`<request casino="bf_es" currency="eur" game="sljp-1" info="1" startTimestamp="${timestamp-10}" execInterval="10"><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${timestamp}" winc="7"><amount currency="EUR" guaranteedHitTime="1100" step="0.01" wins="1000">${amount}</amount></gamedata></request>`}}},
  {startedDateTime:new Date((timestamp+1)*1000).toISOString(),request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?info=1&casino=bf_es&game=sljp-1&currency=EUR&local=0&token=MODERN_QUERY_SECRET',headers:[{name:'Authorization',value:'Bearer MODERN_AUTH_SECRET'}],postData:{mimeType:'application/json',text:'{"token":"BODY_SECRET"}'}},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({game:'sljp-1',currency:'EUR',local:0,timestamp,winc:7,amount,guaranteedHitTime:1100,token:'RESPONSE_SECRET'})}}},
]}});

const result=analyzeSafeDualFeedTexts([
  {raw:raw(1000,123.45),sourceName:'one.har'},
  {raw:raw(1010,123.55),sourceName:'two.har'},
  {raw:raw(1020,123.65),sourceName:'three.har'},
],{maxCaptureSkewSeconds:2});
assert.equal(result.ok,true);
assert.equal(result.version,'betfair-sporting-dual-feed-cli-v1.1-frozen-policy');
assert.equal(result.sampleCount,3);
assert.equal(result.maxCaptureSkewSeconds,2);
assert.equal(result.maxAllowedCaptureSkewSeconds,5);
assert.equal(result.samples.every(x=>x.calibrationCandidate===true),true);
assert.equal(result.series.empiricalModernResponseMappingVerified,true);
assert.equal(result.series.exactModernResponseSemanticsVerified,false);
assert.equal(result.execution.decision,'NO_PLAY');
assert.equal(result.execution.realMoneyAllowed,false);
assert.equal(result.hardGuards.rawHarNeverEmitted,true);
assert.equal(result.hardGuards.callerCannotRelaxCaptureSkewCeiling,true);
const serialized=JSON.stringify(result);
for(const secret of ['LAUNCH_SECRET','COOKIE_SECRET','CONFIG_SECRET','AUTH_SECRET','LEGACY_CONFIG_SECRET','MODERN_CONFIG_SECRET','LEGACY_QUERY_SECRET','MODERN_QUERY_SECRET','MODERN_AUTH_SECRET','BODY_SECRET','RESPONSE_SECRET'])assert.equal(serialized.includes(secret),false);

const relaxed=analyzeSafeDualFeedTexts([{raw:raw(1000,123.45),sourceName:'relaxed.har'}],{maxCaptureSkewSeconds:6});
assert.equal(relaxed.ok,false);
assert.equal(relaxed.reason,'INVALID_CAPTURE_SKEW_POLICY');
assert.equal(relaxed.maxAllowedCaptureSkewSeconds,5);
assert.equal(relaxed.hardGuards.callerCannotRelaxCaptureSkewCeiling,true);
assert.equal(relaxed.execution.realMoneyAllowed,false);

const badRaw=JSON.stringify({log:{entries:[{request:{method:'GET',url:'https://launcher.betfair.es/?token=FAIL_SECRET',headers:[{name:'Authorization',value:'Bearer FAIL_AUTH'}]},response:{status:500,content:{text:'FAIL_BODY_SECRET'}}}]}});
const failed=analyzeSafeDualFeedTexts([{raw:badRaw,sourceName:'bad.har'}]);
assert.equal(failed.ok,true);
assert.equal(failed.samples[0].valid,false);
assert.equal(failed.samples[0].reason,'LEGACY_XML_SNAPSHOT_NOT_EXACTLY_VALIDATED');
assert.equal(failed.samples[0].hardGuards.failureDiagnosticsRedacted,true);
const failedSerialized=JSON.stringify(failed);
for(const secret of ['FAIL_SECRET','FAIL_AUTH','FAIL_BODY_SECRET'])assert.equal(failedSerialized.includes(secret),false);
assert.equal(failed.execution.realMoneyAllowed,false);

const malformed=analyzeSafeDualFeedTexts([{raw:'{bad',sourceName:'broken.har'}]);
assert.equal(malformed.ok,false);
assert.equal(malformed.reason,'HAR_PARSE_FAILED');
assert.equal(malformed.execution.maxSpins,0);

console.log('analyze-betfair-sporting-dual-feed.test.mjs: PASS');
