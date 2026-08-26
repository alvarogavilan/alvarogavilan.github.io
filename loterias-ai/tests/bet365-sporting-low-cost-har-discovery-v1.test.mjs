import assert from 'node:assert/strict';
import {analyzeBet365SportingLowCostHar} from '../edge-backend/src/bet365-sporting-low-cost-har-discovery-v1.mjs';

const target=(code,title)=>({startedDateTime:'2026-08-26T20:00:00.000Z',request:{method:'GET',url:`https://casino.bet365.es/launch?gameCode=${code}&token=SECRET`,headers:[]},response:{status:200,content:{mimeType:'application/json',text:JSON.stringify({title,gameCode:code,minBet:0.10})}}});
const ticker=()=>({startedDateTime:'2026-08-26T20:00:01.000Z',request:{method:'GET',url:'https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[]},response:{status:200,content:{mimeType:'application/json',text:'{"minimumBet":0.10,"betValues":[0.10,0.20,0.50]}'}}});
const har=(code,title)=>({log:{entries:[target(code,title),ticker()]}});

for(const [code,title] of [
  ['gpas_bgeorge_pop','Bobby George: Sporting Legends'],
  ['gpas_slblara_pop','Brian Lara: Sporting Legends'],
  ['gpas_slfbruno_pop','Frank Bruno: Sporting Legends'],
]){
  const r=analyzeBet365SportingLowCostHar(har(code,title),{gameCode:code,sourceName:`${code}.har`});
  assert.equal(r.valid,true);
  assert.equal(r.target.providerGameCode,code);
  assert.equal(r.target.publishedMinimumEUR,0.10);
  assert.equal(r.exactTargetMarkerObserved,true);
  assert.equal(r.exactTargetDailyTickerCandidateObserved,true);
  assert.equal(r.stakeMenuCandidateObserved,true);
  assert.equal(r.servedPublishedMinimumTotalStakeVerified,false);
  assert.equal(r.publishedMinimumJackpotEligibilityVerified,false);
  assert.equal(r.usableForExecution,false);
  assert.equal(r.execution.decision,'NO_PLAY');
  assert.equal(JSON.stringify(r).includes('QUERY_SECRET'),false);
  assert.equal(JSON.stringify(r).includes('SECRET'),false);
}

const mixed={log:{entries:[target('gpas_bgeorge_pop','Bobby George: Sporting Legends'),target('gpas_slblara_pop','Brian Lara: Sporting Legends'),ticker()]}};
const stale=analyzeBet365SportingLowCostHar(mixed,{gameCode:'gpas_bgeorge_pop'});
assert.equal(stale.valid,true);
assert.equal(stale.exactTargetDailyTickerCandidateObserved,false);

const unsupported=analyzeBet365SportingLowCostHar(har('roos',"Ronnie O'Sullivan: Sporting Legends"),{gameCode:'roos'});
assert.equal(unsupported.valid,false);
assert.equal(unsupported.reason,'UNSUPPORTED_OR_MISSING_TARGET');

console.log('bet365-sporting-low-cost-har-discovery-v1.test.mjs: PASS');
