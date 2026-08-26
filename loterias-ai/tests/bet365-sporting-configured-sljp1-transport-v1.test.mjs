import assert from 'node:assert/strict';
import {verifyBet365SportingConfiguredSljp1Transport} from '../edge-backend/src/bet365-sporting-configured-sljp1-transport-v1.mjs';

const launch=(code,title)=>({startedDateTime:'2026-08-26T20:00:00.000Z',request:{method:'GET',url:`https://casino.bet365.es/launch?game=${code}&token=SECRET`,headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title,gameCode:code})}}});
const config=()=>({startedDateTime:'2026-08-26T20:00:01.000Z',request:{method:'GET',url:'https://casino.bet365.es/initialResources/es_ES_desktop?token=HIDDEN',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bet365_es',jackpotsCasinoUrl:'https://ticker.example/webtickers?token=HIDDEN',liveEndpointUrl:'wss://ticker.example/webtickers?session=HIDDEN',useServicesCasinoJackpots:true})}}});
const ticker=()=>({startedDateTime:'2026-08-26T20:00:02.000Z',request:{method:'GET',url:'wss://ticker.example/webtickers?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[]},response:{status:101,content:{text:''}},_webSocketMessages:[]});

for(const [code,title] of [
 ['gpas_bgeorge_pop','Bobby George: Sporting Legends'],
 ['gpas_slblara_pop','Brian Lara: Sporting Legends'],
 ['gpas_slfbruno_pop','Frank Bruno: Sporting Legends'],
]){
 const har={log:{entries:[launch(code,title),config(),ticker()]}};
 const r=verifyBet365SportingConfiguredSljp1Transport(har,{gameCode:code,sourceName:'capture.har'});
 assert.equal(r.valid,true);
 assert.equal(r.bet365OwnedConfiguredSljp1TransportBindingVerified,true);
 assert.equal(r.exactTargetProviderGameRoutingVerified,true);
 assert.equal(r.requestCasinoMatchesOperatorConfig,true);
 assert.equal(r.requestEndpointMatchesOperatorConfig,true);
 assert.equal(r.requestDailyEurLocalZeroVerified,true);
 assert.equal(r.modernResponseSemanticsVerified,false);
 assert.equal(r.exactCurrentSljp1ServerStateVerified,false);
 assert.equal(r.servedTenCentEligibilityVerified,false);
 assert.equal(r.usableForExecution,false);
 assert.equal(r.execution.decision,'NO_PLAY');
 const s=JSON.stringify(r);
 assert.equal(s.includes('QUERY_SECRET'),false);
 assert.equal(s.includes('HIDDEN'),false);
 assert.equal(s.includes('SECRET'),false);
}

const wrongTicker={log:{entries:[launch('gpas_bgeorge_pop','Bobby George: Sporting Legends'),config(),{...ticker(),request:{method:'GET',url:'wss://other.example/webtickers?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0'}}]}};
const noMatch=verifyBet365SportingConfiguredSljp1Transport(wrongTicker,{gameCode:'gpas_bgeorge_pop'});
assert.equal(noMatch.valid,false);
assert.equal(noMatch.bet365OwnedConfiguredSljp1TransportBindingVerified,false);

console.log('bet365-sporting-configured-sljp1-transport-v1.test.mjs: PASS');
