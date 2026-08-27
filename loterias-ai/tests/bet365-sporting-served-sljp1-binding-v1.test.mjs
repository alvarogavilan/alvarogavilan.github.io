import assert from 'node:assert/strict';
import {verifyBet365SportingServedSljp1Binding as verify} from '../edge-backend/src/bet365-sporting-served-sljp1-binding-v1.mjs';

const play=()=>({startedDateTime:'2026-08-27T01:00:00.000Z',request:{method:'GET',url:'https://casino.bet365.es/play/FrankBrunoSL',headers:[]},response:{status:200,content:{text:'login'}}});
const launch=()=>({startedDateTime:'2026-08-27T01:00:01.000Z',request:{method:'GET',url:'https://casino.bet365.es/launch?game=gpas_slfbruno_pop&token=SECRET',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title:'Frank Bruno: Sporting Legends',gameCode:'gpas_slfbruno_pop'})}}});
const config=()=>({startedDateTime:'2026-08-27T01:00:02.000Z',request:{method:'GET',url:'https://casino.bet365.es/initialResources/es_ES_desktop?token=HIDDEN',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bet365_es',jackpotsCasinoUrl:'https://ticker.example/webtickers?token=HIDDEN',liveEndpointUrl:'wss://ticker.example/webtickers?session=HIDDEN',useServicesCasinoJackpots:true})}}});
const ticker=(host='ticker.example')=>({startedDateTime:'2026-08-27T01:00:03.000Z',request:{method:'GET',url:`wss://${host}/webtickers?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET`,headers:[]},response:{status:101,content:{text:''}},_webSocketMessages:[]});

let r=verify({log:{entries:[play(),launch(),config(),ticker()]}},{gameCode:'gpas_slfbruno_pop',sourceName:'frank-current.har'});
assert.equal(r.valid,true);
assert.equal(r.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified,true);
assert.equal(r.exactBet365SpainPlayRouteObserved,true);
assert.equal(r.exactProviderGameCodeObserved,true);
assert.equal(r.bet365OperatorOwnedJackpotConfigVerified,true);
assert.equal(r.bet365OwnedConfiguredSljp1TransportBindingVerified,true);
assert.equal(r.configuredTransport.requestDailyEurLocalZeroVerified,true);
assert.equal(r.exactCurrentSljp1ServerStateVerified,false);
assert.equal(r.servedTenCentEligibilityVerified,false);
assert.equal(r.operatorFollowingDayRuleAdoptionVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
const serialized=JSON.stringify(r);
for(const secret of ['SECRET','HIDDEN','QUERY_SECRET'])assert.equal(serialized.includes(secret),false);

r=verify({log:{entries:[launch(),config(),ticker()]}},{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_PLAY_ROUTE_PROVIDER_PROVENANCE_REQUIRED');
assert.equal(r.execution.decision,'NO_PLAY');

r=verify({log:{entries:[play(),launch(),config(),ticker('other.example')]}},{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.valid,false);
assert.equal(r.reason,'BET365_CONFIGURED_SLJP1_TRANSPORT_REQUIRED');
assert.equal(r.exactPlayRouteProviderProvenanceVerified,true);

r=verify({log:{entries:[play(),launch(),config(),ticker()]}},{gameCode:'gpas_bgeorge_pop'});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_PLAY_ROUTE_PROVIDER_PROVENANCE_REQUIRED');
assert.equal(r.provenanceReason,'EXACT_CURRENT_PUBLIC_PLAY_ROUTE_NOT_FROZEN_FOR_TARGET');

console.log('bet365-sporting-served-sljp1-binding-v1.test.mjs: PASS');
