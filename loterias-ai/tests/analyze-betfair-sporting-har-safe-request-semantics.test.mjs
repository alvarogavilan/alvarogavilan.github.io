import assert from 'node:assert/strict';
import {analyzeSafeHarText} from '../scripts/analyze-betfair-sporting-har.mjs';

const raw=JSON.stringify({log:{entries:[
  {
    startedDateTime:'2026-08-26T19:00:00Z',
    request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real&returnURL=https%3A%2F%2Fcasino.betfair.es%2Fjuego%2Fap-mccoy-sporting-legends-cptn&switchedToPopup=true',headers:[]},
    response:{status:200,headers:[],content:{text:'launcher'}},
  },
  {
    startedDateTime:'2026-08-26T19:00:01Z',
    request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop?cacheBust=CONFIG_QUERY_SECRET',headers:[]},
    response:{status:200,headers:[],content:{mimeType:'application/json',text:'{"jackpotsCasino":"bf_es","liveEndpointUrl":"https://webtickers.malmegas.com/webtickers?configured=CONFIGURED_SECRET"}'}},
  },
  {
    startedDateTime:'2026-08-26T19:00:02Z',
    request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?token=QUERY_SECRET',headers:[{name:'Authorization',value:'Bearer HEADER_SECRET'},{name:'Content-Type',value:'application/json'}],postData:{mimeType:'application/json',text:'{"info":1,"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0,"token":"BODY_SECRET"}'}},
    response:{status:200,headers:[],content:{mimeType:'application/json',text:'{"ok":true,"token":"RESPONSE_SECRET"}'}},
  },
]}});

const r=analyzeSafeHarText(raw,{sourceName:'request-semantics.har',nowEpochSeconds:1787770802});
assert.equal(r.ok,true);
assert.equal(r.version,'betfair-sporting-safe-har-cli-v1.3-session-provenance-safe');
assert.equal(r.legacy.exactApMcCoyRealLauncherBindingObserved,true);
assert.equal(r.documentedRequestSemantics.version,'betfair-sporting-webtickers-request-semantics-v1.3-session-provenance');
assert.equal(r.documentedRequestSemantics.exactConfiguredWebtickersTrafficObserved,true);
assert.equal(r.documentedRequestSemantics.providerDocumentedExactDailyRequestObserved,true);
assert.equal(r.documentedRequestSemantics.providerDocumentedExactDailyRequestMatchCount,1);
assert.equal(r.documentedRequestSemantics.exactApMcCoyProviderDocumentedDailyRequestObserved,true);
assert.equal(r.documentedRequestSemantics.exactApMcCoyProviderDocumentedDailyRequestMatchCount,1);
const m=r.documentedRequestSemantics.requestSemanticObservations.find(x=>x.requestContractSemanticsSupportedByProviderSpec);
assert.ok(m);
assert.equal(m.source,'http-request');
assert.equal(m.endpoint,'https://webtickers.malmegas.com/webtickers');
assert.equal(m.latestPrecedingRealCasinoLauncherIsExactApMcCoy,true);
assert.equal(m.launcherEntryIndex,0);
assert.equal(m.latestPostLaunchInitialResourcesBindingVerified,true);
assert.equal(m.initialResourcesEntryIndex,1);
assert.equal(m.exactApMcCoySessionProvenanceVerified,true);
assert.deepEqual(m.values.info,['1']);
assert.deepEqual(m.values.casino,['bf_es']);
assert.deepEqual(m.values.game,['sljp-1']);
assert.deepEqual(m.values.currency,['EUR']);
assert.deepEqual(m.values.local,['0']);
assert.equal(m.ambiguityDetected,false);
assert.equal(r.documentedRequestSemantics.exactModernTransportContractVerified,false);
assert.equal(r.documentedRequestSemantics.exactModernResponseSemanticsVerified,false);
assert.equal(r.documentedRequestSemantics.directPublicModernProbeAllowed,false);
assert.equal(r.documentedRequestSemantics.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.hardGuards.sessionProvenanceSurfacedWithoutCredentials,true);
assert.equal(r.hardGuards.documentedRequestSemanticsRemainDiscoveryOnly,true);
assert.equal(r.hardGuards.ambiguousRequestRoutingFailsClosed,true);
const serialized=JSON.stringify(r);
for(const secret of ['CONFIG_QUERY_SECRET','CONFIGURED_SECRET','QUERY_SECRET','HEADER_SECRET','BODY_SECRET','RESPONSE_SECRET'])assert.equal(serialized.includes(secret),false);

console.log('analyze-betfair-sporting-har-safe-request-semantics.test.mjs: PASS');
