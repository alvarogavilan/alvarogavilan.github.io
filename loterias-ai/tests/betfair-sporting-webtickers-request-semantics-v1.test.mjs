import assert from 'node:assert/strict';
import {analyzeBetfairSportingWebtickersRequestSemantics} from '../edge-backend/src/betfair-sporting-webtickers-request-semantics-v1.mjs';

const config='{"jackpotsCasino":"bf_es","liveEndpointUrl":"https://webtickers.malmegas.com/webtickers"}';
const initial={request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{mimeType:'application/json',text:config}}};
const launcher={request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real&returnURL=https%3A%2F%2Fcasino.betfair.es%2Fjuego%2Fap-mccoy-sporting-legends-cptn&switchedToPopup=true',headers:[]},response:{status:200,content:{text:''}}};
const otherLauncher={request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=another-playtech-game-cptn&launchProduct=casino&mode=real',headers:[]},response:{status:200,content:{text:''}}};
const otherInitial={request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop?newer=1',headers:[]},response:{status:200,content:{mimeType:'application/json',text:'{"jackpotsCasino":"other_es","liveEndpointUrl":"https://other.example/webtickers"}'}}};

const post={
  request:{method:'POST',url:'https://webtickers.malmegas.com/webtickers?token=QUERY_SECRET',headers:[{name:'Content-Type',value:'application/json'}],postData:{mimeType:'application/json',text:'{"info":1,"casino":"bf_es","game":"sljp-1","currency":"eur","local":0,"token":"BODY_SECRET"}'}},
  response:{status:200,content:{mimeType:'application/json',text:'{"ok":true,"token":"RESPONSE_SECRET"}'}},
};
let r=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[initial,post]}},{sourceName:'request-post.har'});
assert.equal(r.version,'betfair-sporting-webtickers-request-semantics-v1.4-target-binding-provenance');
assert.equal(r.exactConfiguredWebtickersTrafficObserved,true);
assert.equal(r.providerDocumentedExactDailyRequestObserved,true);
assert.equal(r.providerDocumentedExactDailyRequestMatchCount,1);
assert.equal(r.exactApMcCoyRealLauncherBindingObserved,false);
assert.equal(r.exactApMcCoyProviderDocumentedDailyRequestObserved,false);
assert.equal(r.exactApMcCoyProviderDocumentedDailyRequestMatchCount,0);
let m=r.requestSemanticObservations.find(x=>x.requestContractSemanticsSupportedByProviderSpec);
assert.ok(m);
assert.equal(m.source,'http-request');
assert.equal(m.infoGameBased,true);
assert.equal(m.casinoMatches,true);
assert.equal(m.gameMatches,true);
assert.equal(m.currencyEur,true);
assert.equal(m.localGlobal,true);
assert.equal(m.ambiguityDetected,false);
assert.equal(m.providerDocumentedGameRequestComplete,true);
assert.equal(m.exactSportingDailyScopeObserved,true);
assert.equal(m.exactApMcCoyRealLauncherBindingObserved,false);
assert.equal(m.exactApMcCoySessionProvenanceVerified,false);
assert.equal(r.directPublicModernProbeAllowed,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.hardGuards.genericBetfairHarCannotEstablishExactApMcCoySession,true);
let serialized=JSON.stringify(r);
for(const secret of ['QUERY_SECRET','BODY_SECRET','RESPONSE_SECRET'])assert.equal(serialized.includes(secret),false);

const exactGame=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[launcher,initial,post]}},{sourceName:'exact-apmccoy-post.har'});
assert.equal(exactGame.providerDocumentedExactDailyRequestObserved,true);
assert.equal(exactGame.exactApMcCoyRealLauncherBindingObserved,true);
assert.equal(exactGame.exactApMcCoyProviderDocumentedDailyRequestObserved,true);
assert.equal(exactGame.exactApMcCoyProviderDocumentedDailyRequestMatchCount,1);
const exactObservation=exactGame.requestSemanticObservations.find(x=>x.requestContractSemanticsSupportedByProviderSpec);
assert.equal(exactObservation?.exactApMcCoyRealLauncherBindingObserved,true);
assert.equal(exactObservation?.latestPrecedingRealCasinoLauncherIsExactApMcCoy,true);
assert.equal(exactObservation?.latestPostLaunchInitialResourcesBindingVerified,true);
assert.equal(exactObservation?.exactApMcCoySessionProvenanceVerified,true);
assert.equal(exactObservation?.launcherEntryIndex,0);
assert.equal(exactObservation?.initialResourcesEntryIndex,1);
assert.equal(JSON.stringify(exactGame).includes('returnURL='),false);

// A stale AP McCoy launcher in Preserve log cannot lend provenance after another real casino game is launched.
const staleLauncher=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[launcher,initial,otherLauncher,post]}},{sourceName:'stale-launcher.har'});
assert.equal(staleLauncher.exactApMcCoyRealLauncherBindingObserved,true);
assert.equal(staleLauncher.providerDocumentedExactDailyRequestObserved,true);
assert.equal(staleLauncher.exactApMcCoyProviderDocumentedDailyRequestObserved,false);
assert.equal(staleLauncher.exactApMcCoyProviderDocumentedDailyRequestMatchCount,0);
const staleObservation=staleLauncher.requestSemanticObservations.find(x=>x.requestContractSemanticsSupportedByProviderSpec);
assert.equal(staleObservation?.latestPrecedingRealCasinoLauncherIsExactApMcCoy,false);
assert.equal(staleObservation?.exactApMcCoySessionProvenanceVerified,false);
assert.equal(staleLauncher.hardGuards.staleExactLauncherCannotEstablishApMcCoyRequestProvenance,true);

// Config captured before the exact launcher cannot establish current AP McCoy session provenance.
const stalePrelaunchConfig=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[initial,launcher,post]}},{sourceName:'stale-prelaunch-config.har'});
assert.equal(stalePrelaunchConfig.providerDocumentedExactDailyRequestObserved,true);
assert.equal(stalePrelaunchConfig.exactApMcCoyProviderDocumentedDailyRequestObserved,false);
assert.equal(stalePrelaunchConfig.requestSemanticObservations[0].latestPrecedingRealCasinoLauncherIsExactApMcCoy,true);
assert.equal(stalePrelaunchConfig.requestSemanticObservations[0].latestPostLaunchInitialResourcesBindingVerified,false);
assert.equal(stalePrelaunchConfig.hardGuards.staleOrSupersededConfigCannotEstablishApMcCoyRequestProvenance,true);

// A newer post-launch initialResources supersedes an older matching config.
const supersededConfig=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[launcher,initial,otherInitial,post]}},{sourceName:'superseded-config.har'});
assert.equal(supersededConfig.providerDocumentedExactDailyRequestObserved,true);
assert.equal(supersededConfig.exactApMcCoyProviderDocumentedDailyRequestObserved,false);
assert.equal(supersededConfig.requestSemanticObservations.find(x=>x.requestContractSemanticsSupportedByProviderSpec)?.initialResourcesEntryIndex,2);
assert.equal(supersededConfig.requestSemanticObservations.find(x=>x.requestContractSemanticsSupportedByProviderSpec)?.exactApMcCoySessionProvenanceVerified,false);

// info=2 is not the documented direct game-based request contract for an exact Daily lookup.
const info2={...post,request:{...post.request,postData:{mimeType:'application/json',text:'{"info":2,"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0}'}}};
r=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[launcher,initial,info2]}});
assert.equal(r.providerDocumentedExactDailyRequestObserved,false);
assert.equal(r.exactApMcCoyProviderDocumentedDailyRequestObserved,false);
assert.equal(r.providerDocumentedExactDailyRequestMatchCount,0);

// Contradictory routing/scope values fail closed instead of passing because one expected value is present.
const contradictory={...post,request:{...post.request,url:'https://webtickers.malmegas.com/webtickers?casino=other_es&info=2',postData:{mimeType:'application/json',text:'{"info":1,"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0}'}}};
r=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[launcher,initial,contradictory]}});
assert.equal(r.providerDocumentedExactDailyRequestObserved,false);
assert.equal(r.exactApMcCoyProviderDocumentedDailyRequestObserved,false);
assert.equal(r.providerDocumentedExactDailyRequestMatchCount,0);
assert.equal(r.requestSemanticObservations[0].ambiguityDetected,true);
assert.equal(r.hardGuards.conflictingRoutingValuesRejectMatch,true);

// An instanceCode in traffic cannot silently add an unbound routing dimension when Betfair config did not bind one.
const unboundInstance={...post,request:{...post.request,postData:{mimeType:'application/json',text:'{"info":1,"casino":"bf_es","game":"sljp-1","currency":"EUR","local":0,"instanceCode":"ims-unbound"}'}}};
r=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[launcher,initial,unboundInstance]}});
assert.equal(r.providerDocumentedExactDailyRequestObserved,false);
assert.equal(r.exactApMcCoyProviderDocumentedDailyRequestObserved,false);
assert.equal(r.requestSemanticObservations[0].instanceCodeObserved,true);
assert.equal(r.requestSemanticObservations[0].instanceCodeConsistent,false);
assert.equal(r.hardGuards.unboundInstanceCodeRejectsMatch,true);

// WSS subscribe semantics are evaluated only from outbound frames plus the request URL, never receive frames.
const ws={
  request:{method:'GET',url:'wss://webtickers.malmegas.com/webtickers?casino=bf_es&token=WS_QUERY_SECRET',headers:[{name:'Authorization',value:'Bearer WS_HEADER_SECRET'}]},
  response:{status:101,content:{text:''}},
  _webSocketMessages:[
    {type:'send',opcode:1,data:'{"info":1,"game":"sljp-1","currency":"EUR","local":0,"token":"WS_SEND_SECRET"}'},
    {type:'receive',opcode:1,data:'{"info":2,"casino":"other","game":"sljp-2","currency":"USD","local":1,"token":"WS_RECEIVE_SECRET"}'},
  ],
};
r=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[launcher,initial,ws]}},{sourceName:'request-ws.har'});
assert.equal(r.providerDocumentedExactDailyRequestObserved,true);
assert.equal(r.exactApMcCoyProviderDocumentedDailyRequestObserved,true);
m=r.requestSemanticObservations.find(x=>x.source.startsWith('websocket-send:')&&x.requestContractSemanticsSupportedByProviderSpec);
assert.ok(m);
assert.equal(m.configuredWebSocketTransportUpgradeObserved,true);
assert.equal(m.casinoMatches,true);
assert.equal(m.gameMatches,true);
assert.equal(m.currencyEur,true);
assert.equal(m.localGlobal,true);
assert.equal(m.ambiguityDetected,false);
assert.equal(m.exactApMcCoyRealLauncherBindingObserved,true);
assert.equal(m.exactApMcCoySessionProvenanceVerified,true);
serialized=JSON.stringify(r);
for(const secret of ['WS_QUERY_SECRET','WS_HEADER_SECRET','WS_SEND_SECRET','WS_RECEIVE_SECRET'])assert.equal(serialized.includes(secret),false);
for(const observation of r.requestSemanticObservations){
  for(const values of Object.values(observation.values||{}))assert.equal(values.includes('other'),false);
}

const foreignInitial={request:{method:'GET',url:'https://evil.example/initialResources/es_ES_desktop',headers:[]},response:{status:200,content:{text:config}}};
r=analyzeBetfairSportingWebtickersRequestSemantics({log:{entries:[launcher,foreignInitial,post]}});
assert.equal(r.exactConfiguredWebtickersTrafficObserved,false);
assert.equal(r.providerDocumentedExactDailyRequestObserved,false);
assert.equal(r.exactApMcCoyProviderDocumentedDailyRequestObserved,false);
assert.equal(r.execution.maxTotalStakeEUR,0);

const bad=analyzeBetfairSportingWebtickersRequestSemantics('{bad');
assert.equal(bad.valid,false);
assert.equal(bad.reason,'HAR_PARSE_FAILED');
assert.equal(bad.execution.maxSpins,0);

console.log('betfair-sporting-webtickers-request-semantics-v1.test.mjs: PASS');
