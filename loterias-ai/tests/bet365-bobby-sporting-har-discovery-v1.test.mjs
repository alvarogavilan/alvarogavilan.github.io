import assert from 'node:assert/strict';
import {analyzeBet365BobbySportingHar} from '../edge-backend/src/bet365-bobby-sporting-har-discovery-v1.mjs';

const target={
  startedDateTime:'2026-08-26T20:00:00.000Z',
  request:{method:'GET',url:'https://casino.bet365.es/launch?gameCode=gpas_bgeorge_pop&token=LAUNCH_SECRET',headers:[{name:'Authorization',value:'Bearer HEADER_SECRET'}]},
  response:{status:200,content:{mimeType:'application/json',text:'{"title":"Bobby George: Sporting Legends","gameCode":"gpas_bgeorge_pop","token":"BODY_SECRET"}'}},
};
const daily={
  startedDateTime:'2026-08-26T20:00:01.000Z',
  request:{method:'GET',url:'https://ticker.example/webtickers?game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[{name:'Cookie',value:'SESSION=COOKIE_SECRET'}]},
  response:{status:200,content:{mimeType:'application/json',text:'{"game":"sljp-1","casino":"bet365_es","currency":"EUR","local":0,"instanceCode":"es1","token":"RESPONSE_SECRET"}'}},
};

let r=analyzeBet365BobbySportingHar({log:{entries:[target,daily]}},{sourceName:'bobby.har'});
assert.equal(r.valid,true);
assert.equal(r.version,'bet365-bobby-sporting-har-discovery-v1.1-ambiguous-provenance-guard');
assert.equal(r.exactTargetMarkerObserved,true);
assert.equal(r.exactTargetDailyTickerCandidateObserved,true);
assert.equal(r.exactTargetDailyTickerCandidateCount,1);
assert.equal(r.candidates[0].exactTargetMarkerPrecedesTicker,true);
assert.equal(r.candidates[0].conflictingLatestSportingMarker,false);
assert.equal(r.candidates[0].endpoint,'https://ticker.example/webtickers');
assert.deepEqual(r.candidates[0].requestCasinoCandidates,['bet365_es']);
assert.deepEqual(r.candidates[0].currencyCandidates,['EUR']);
assert.deepEqual(r.candidates[0].localCandidates,['0']);
assert.deepEqual(r.candidates[0].gameCandidates,['sljp-1']);
assert.deepEqual(r.candidates[0].instanceCodeCandidates,['es1']);
assert.equal(r.servedBet365SessionBindingVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);
let serialized=JSON.stringify(r);
for(const secret of ['LAUNCH_SECRET','HEADER_SECRET','BODY_SECRET','QUERY_SECRET','COOKIE_SECRET','RESPONSE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('?game='),false);

const otherSporting={
  startedDateTime:'2026-08-26T20:00:00.500Z',
  request:{method:'GET',url:'https://casino.bet365.es/launch?gameCode=gpas_slblara_pop',headers:[]},
  response:{status:200,content:{mimeType:'application/json',text:'{"gameCode":"gpas_slblara_pop"}'}},
};
r=analyzeBet365BobbySportingHar({log:{entries:[target,otherSporting,daily]}},{sourceName:'stale-bobby.har'});
assert.equal(r.exactTargetMarkerObserved,true);
assert.equal(r.exactTargetDailyTickerCandidateObserved,false);
assert.equal(r.candidates[0].conflictingLatestSportingMarker,true);
assert.deepEqual(r.candidates[0].latestSportingMarkerCodes,['gpas_slblara_pop']);

const ambiguous={
  startedDateTime:'2026-08-26T20:00:00.700Z',
  request:{method:'POST',url:'https://casino.bet365.es/session',headers:[],postData:{mimeType:'application/json',text:'{"games":["gpas_bgeorge_pop","gpas_slblara_pop"]}'}},
  response:{status:200,content:{text:''}},
};
r=analyzeBet365BobbySportingHar({log:{entries:[ambiguous,daily]}},{sourceName:'ambiguous.har'});
assert.equal(r.exactTargetMarkerObserved,true);
assert.equal(r.exactTargetDailyTickerCandidateObserved,false);
assert.equal(r.candidates[0].conflictingLatestSportingMarker,true);
assert.deepEqual(new Set(r.candidates[0].latestSportingMarkerCodes),new Set(['gpas_slblara_pop','gpas_bgeorge_pop']));

r=analyzeBet365BobbySportingHar({log:{entries:[daily]}},{sourceName:'no-target.har'});
assert.equal(r.exactTargetMarkerObserved,false);
assert.equal(r.exactTargetDailyTickerCandidateObserved,false);

const weekly={...daily,request:{...daily.request,url:'https://ticker.example/webtickers?game=sljp-2&casino=bet365_es'}};
r=analyzeBet365BobbySportingHar({log:{entries:[target,weekly]}},{sourceName:'weekly-only.har'});
assert.equal(r.dailyTickerCandidateCount,0);
assert.equal(r.exactTargetDailyTickerCandidateObserved,false);

const hostileDaily={...daily,request:{...daily.request,url:'https://ticker.example/webtickers?game=sljp-1&casino=BearerSUPERSECRET&currency=EUR&local=0'}};
r=analyzeBet365BobbySportingHar({log:{entries:[target,hostileDaily]}},{sourceName:'routing-redaction.har'});
assert.equal(r.exactTargetDailyTickerCandidateObserved,true);
serialized=JSON.stringify(r);
assert.equal(serialized.includes('BearerSUPERSECRET'),false);

const bad=analyzeBet365BobbySportingHar('{bad');
assert.equal(bad.valid,false);
assert.equal(bad.reason,'HAR_PARSE_FAILED');
assert.equal(bad.execution.maxTotalStakeEUR,0);

console.log('bet365-bobby-sporting-har-discovery-v1.test.mjs: PASS');
