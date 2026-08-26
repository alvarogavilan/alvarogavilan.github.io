import assert from 'node:assert/strict';
import {discoverBet365SportingOperatorJackpotConfig} from '../edge-backend/src/bet365-sporting-operator-jackpot-config-har-v1.mjs';

const launch=(code,title)=>({startedDateTime:'2026-08-26T20:00:00.000Z',request:{method:'GET',url:`https://casino.bet365.es/launch?game=${code}&token=SECRET`,headers:[{name:'cookie',value:'PRIVATE'}]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title,gameCode:code})}}});
const config=(host='casino.bet365.es')=>({startedDateTime:'2026-08-26T20:00:01.000Z',request:{method:'GET',url:`https://${host}/initialResources/es_ES_desktop?token=QUERY_SECRET`,headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({nested:{jackpotsCasino:'bet365_es',jackpotsCasinoUrl:'https://ticker.example/webtickers?token=HIDDEN',liveEndpointUrl:'wss://ticker.example/webtickers?session=HIDDEN',useServicesCasinoJackpots:true}})}}});

for(const [code,title] of [
 ['gpas_bgeorge_pop','Bobby George: Sporting Legends'],
 ['gpas_slblara_pop','Brian Lara: Sporting Legends'],
 ['gpas_slfbruno_pop','Frank Bruno: Sporting Legends'],
]){
 const r=discoverBet365SportingOperatorJackpotConfig({log:{entries:[launch(code,title),config()]}},{gameCode:code,sourceName:'capture.har'});
 assert.equal(r.valid,true);
 assert.equal(r.bet365OwnedExactTargetSessionConfigCandidateObserved,true);
 assert.equal(r.uniqueCoherentConfigCandidateObserved,true);
 assert.equal(r.uniqueCoherentConfigCandidate.jackpotsCasino,'bet365_es');
 assert.equal(r.uniqueCoherentConfigCandidate.jackpotsCasinoEndpoint,'https://ticker.example/webtickers');
 assert.equal(r.uniqueCoherentConfigCandidate.liveEndpoint,'wss://ticker.example/webtickers');
 assert.equal(r.uniqueCoherentConfigCandidate.usesServicesCasinoJackpots,true);
 assert.equal(r.bet365LicenseeBindingVerified,false);
 assert.equal(r.exactTickerOwnershipVerified,false);
 assert.equal(r.servedTenCentEligibilityVerified,false);
 assert.equal(r.execution.decision,'NO_PLAY');
 const s=JSON.stringify(r);
 assert.equal(s.includes('QUERY_SECRET'),false);
 assert.equal(s.includes('HIDDEN'),false);
 assert.equal(s.includes('PRIVATE'),false);
}

const offOperator=discoverBet365SportingOperatorJackpotConfig({log:{entries:[launch('gpas_bgeorge_pop','Bobby George: Sporting Legends'),config('evil.example')]}},{gameCode:'gpas_bgeorge_pop'});
assert.equal(offOperator.valid,true);
assert.equal(offOperator.bet365OwnedExactTargetSessionConfigCandidateObserved,false);

const conflict={log:{entries:[launch('gpas_bgeorge_pop','Bobby George: Sporting Legends'),launch('gpas_slblara_pop','Brian Lara: Sporting Legends'),config()]}};
const stale=discoverBet365SportingOperatorJackpotConfig(conflict,{gameCode:'gpas_bgeorge_pop'});
assert.equal(stale.valid,true);
assert.equal(stale.bet365OwnedExactTargetSessionConfigCandidateObserved,false);

console.log('bet365-sporting-operator-jackpot-config-har-v1.test.mjs: PASS');
