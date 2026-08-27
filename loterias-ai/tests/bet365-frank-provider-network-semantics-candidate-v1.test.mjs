import assert from 'node:assert/strict';
import {buildBet365FrankProviderNetworkSemanticsCandidate as build} from '../edge-backend/src/bet365-frank-provider-network-semantics-candidate-v1.mjs';

const GAME='gpas_slfbruno_pop';
const xml=({casino='bet365_es',local=0,game='sljp-1',ght=1787790100}={})=>`<request currency="eur" startTimestamp="1787790000" execInterval="10" game="${game}" casino="${casino}" info="1"><gamedata timestamp="1787790005" local="${local}" winc="7" gamegroup="sljp" game="${game}"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="es1" currency="eur" guaranteedHitTime="${ght}">1500.01</amount></amount-list></gamedata></request>`;
const entry=(url,time,body,mime='application/json')=>({startedDateTime:time,request:{method:'GET',url,headers:[]},response:{status:200,content:{mimeType:mime,text:body}},_webSocketMessages:[]});
function har({casino='bet365_es',stake=true,xmlBody=xml()}={}){return {log:{entries:[
  entry('https://casino.bet365.es/play/FrankBrunoSL','2026-08-27T05:40:00Z','login','text/html'),
  entry(`https://casino.bet365.es/launch?game=${GAME}&token=SECRET`,'2026-08-27T05:40:01Z',JSON.stringify({title:'Frank Bruno: Sporting Legends',gameCode:GAME})),
  entry('https://casino.bet365.es/initialResources/es_ES_desktop?token=HIDDEN','2026-08-27T05:40:02Z',JSON.stringify({jackpotsCasino:casino,jackpotsCasinoUrl:'https://ticker.example/new_jackpotxml.php?token=HIDDEN',liveEndpointUrl:'https://ticker.example/new_jackpotxml.php?session=HIDDEN',useServicesCasinoJackpots:true,...(stake?{currency:'EUR',availableTotalBets:[0.10,0.20]}:{})})),
  entry(`https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=${casino}&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET`,'2026-08-27T05:40:06Z',xmlBody,'application/xml'),
]}};}

let r=build(har(),{sourceName:'frank-current.har'});
assert.equal(r.valid,true);
assert.equal(r.providerNetworkSemanticsBindingReviewCandidate,true);
assert.equal(r.followingDayMechanicReviewCandidate,true);
assert.equal(r.tenCentEligibilityReviewCandidate,true);
assert.equal(r.runtime.exactBet365SpainFrontendToConfiguredSljp1TransportBindingVerified,true);
assert.equal(r.runtime.providerScope,'GLOBAL');
assert.equal(r.runtime.network,'SPORTING_LEGENDS');
assert.equal(r.runtime.tier,'DAILY');
assert.equal(r.runtime.code,'sljp-1');
assert.equal(r.runtime.local,0);
assert.equal(r.runtime.servedTenCentTotalStakeVerified,true);
assert.equal(r.staticProviderNetworkEvidence.providerNetworkFirstBetFollowingDayRuleDocumented,true);
assert.equal(r.staticProviderNetworkEvidence.providerNetworkAnyBetAnySizeRuleDocumented,true);
assert.equal(r.bet365FollowingDayRuleAdoptionVerified,false);
assert.equal(r.servedTenCentJackpotEligibilityVerified,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
for(const forbidden of ['SECRET','HIDDEN','QUERY_SECRET'])assert.equal(JSON.stringify(r).includes(forbidden),false);

r=build(har({stake:false}));
assert.equal(r.valid,false);assert.equal(r.reason,'EXPLICIT_SERVED_TEN_CENT_TOTAL_STAKE_REQUIRED');

r=build(har({casino:'other_es',xmlBody:xml({casino:'other_es'})}));
assert.equal(r.valid,true);assert.equal(r.runtime.bet365ConfiguredJackpotsCasino,'other_es');

const mismatched={...har(),log:{entries:har().log.entries.map((x,i)=>i===3?entry('https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1','2026-08-27T05:40:06Z',xml({casino:'other_es'}),'application/xml'):x)}};
r=build(mismatched);
assert.equal(r.valid,false);

console.log('bet365-frank-provider-network-semantics-candidate-v1.test.mjs: PASS');
