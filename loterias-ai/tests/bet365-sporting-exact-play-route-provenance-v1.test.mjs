import assert from 'node:assert/strict';
import {verifyBet365SportingExactPlayRouteProvenance as verify} from '../edge-backend/src/bet365-sporting-exact-play-route-provenance-v1.mjs';

const entry=(url,time,{body='',headers=[],postData=null}={})=>({
  startedDateTime:time,
  request:{url,headers,...(postData?{postData:{text:postData}}:{})},
  response:{content:{text:body}},
  _webSocketMessages:[],
});

let r=verify({log:{entries:[
  entry('https://casino.bet365.es/play/FrankBrunoSL','2026-08-27T01:00:00Z'),
  entry('https://games.example/launch?game=gpas_slfbruno_pop','2026-08-27T01:00:15Z'),
]}},{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.valid,true);
assert.equal(r.exactBet365SpainPlayRouteObserved,true);
assert.equal(r.exactProviderGameCodeObserved,true);
assert.equal(r.exactFrontendProviderIdentityCandidateVerified,true);
assert.equal(r.bet365LicenseeJackpotBindingVerified,false);
assert.equal(r.servedTenCentEligibilityVerified,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

r=verify({log:{entries:[
  entry('https://assets.example/config','2026-08-27T01:00:01Z',{headers:[{name:'Referer',value:'https://casino.bet365.es/play/FrankBrunoSL'}],body:'{"game":"gpas_slfbruno_pop"}'}),
]}},{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.valid,true);
assert.equal(r.routeEvidence.kind,'REQUEST_REFERRER');
assert.deepEqual(r.providerCodeEvidence.kinds,['RESPONSE_BODY']);

r=verify({log:{entries:[entry('https://casino.bet365.es/play/FrankBrunoSL','2026-08-27T01:00:00Z')]}},{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.reason,'EXACT_PROVIDER_GAME_CODE_NOT_OBSERVED');

r=verify({log:{entries:[
  entry('https://casino.bet365.es/play/FrankBrunoSL','2026-08-27T01:00:00Z'),
  entry('https://games.example/launch?game=gpas_slfbruno_pop','2026-08-27T01:05:00Z'),
]}},{gameCode:'gpas_slfbruno_pop',maxRouteToProviderMarkerSeconds:120});
assert.equal(r.reason,'PLAY_ROUTE_AND_PROVIDER_CODE_NOT_BOUNDED_TO_ONE_CAPTURE_WINDOW');

r=verify({log:{entries:[entry('https://casino.bet365.es/play/BobbyGeorgeSL','2026-08-27T01:00:00Z')]}},{gameCode:'gpas_bgeorge_pop'});
assert.equal(r.reason,'EXACT_CURRENT_PUBLIC_PLAY_ROUTE_NOT_FROZEN_FOR_TARGET');

r=verify({log:{entries:[
  entry('https://casino.bet365.es.evil.example/play/FrankBrunoSL','2026-08-27T01:00:00Z'),
  entry('https://games.example/launch?game=gpas_slfbruno_pop','2026-08-27T01:00:10Z'),
]}},{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.reason,'EXACT_BET365_SPAIN_PLAY_ROUTE_NOT_OBSERVED');

console.log('bet365-sporting-exact-play-route-provenance-v1.test.mjs: PASS');
