import assert from 'node:assert/strict';
import {verifyBet365SportingServedTotalStake as verify} from '../edge-backend/src/bet365-sporting-served-total-stake-v1.mjs';

const play=()=>({startedDateTime:'2026-08-27T01:00:00.000Z',request:{method:'GET',url:'https://casino.bet365.es/play/FrankBrunoSL',headers:[]},response:{status:200,content:{text:'login'}}});
const launch=(extra={})=>({startedDateTime:'2026-08-27T01:00:01.000Z',request:{method:'GET',url:'https://casino.bet365.es/launch?game=gpas_slfbruno_pop&token=SECRET',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title:'Frank Bruno: Sporting Legends',gameCode:'gpas_slfbruno_pop',...extra})}}});
const config=(extra={})=>({startedDateTime:'2026-08-27T01:00:02.000Z',request:{method:'GET',url:'https://casino.bet365.es/initialResources/es_ES_desktop?token=HIDDEN',headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bet365_es',jackpotsCasinoUrl:'https://ticker.example/webtickers?token=HIDDEN',liveEndpointUrl:'wss://ticker.example/webtickers?session=HIDDEN',useServicesCasinoJackpots:true,...extra})}}});
const ticker=()=>({startedDateTime:'2026-08-27T01:00:03.000Z',request:{method:'GET',url:'wss://ticker.example/webtickers?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[]},response:{status:101,content:{text:''}},_webSocketMessages:[]});
const har=(launchExtra={},configExtra={})=>({log:{entries:[play(),launch(launchExtra),config(configExtra),ticker()]}});

let r=verify(har({}, {currency:'EUR',availableTotalBets:[0.10,0.20,0.50]}),{gameCode:'gpas_slfbruno_pop',sourceName:'frank-current.har'});
assert.equal(r.valid,true);
assert.equal(r.servedExplicitTotalStakeMenuSemanticsVerified,true);
assert.equal(r.servedTenCentTotalStakeVerified,true);
assert.equal(r.evidence.currency,'EUR');
assert.equal(r.evidence.semanticKey,'availabletotalbets');
assert.equal(r.servedTenCentJackpotEligibilityVerified,false);
assert.equal(r.exactCurrentSljp1ServerStateVerified,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
for(const secret of ['SECRET','HIDDEN','QUERY_SECRET'])assert.equal(JSON.stringify(r).includes(secret),false);

r=verify(har({currency:'EUR',minBet:0.10,betValues:[0.10,0.20]},{}),{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_EXPLICIT_TOTAL_STAKE_MENU_NOT_FOUND');
assert.equal(r.servedTenCentTotalStakeVerified,false);

r=verify(har({}, {currency:'GBP',availableTotalBets:[0.10,0.20]}),{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_EXPLICIT_TOTAL_STAKE_MENU_NOT_FOUND');

r=verify(har({currency:'EUR',availableTotalBets:[0.10,0.20]}, {currency:'EUR',allowedTotalStakes:[0.10,0.50]}),{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.valid,false);
assert.equal(r.reason,'AMBIGUOUS_EXPLICIT_TOTAL_STAKE_MENUS');

r=verify({log:{entries:[play(),launch({currency:'EUR',availableTotalBets:[0.10]}),ticker()]}},{gameCode:'gpas_slfbruno_pop'});
assert.equal(r.valid,false);
assert.equal(r.reason,'SERVED_SLJP1_TRANSPORT_BINDING_REQUIRED');
assert.equal(r.execution.decision,'NO_PLAY');

console.log('bet365-sporting-served-total-stake-v1.test.mjs: PASS');
