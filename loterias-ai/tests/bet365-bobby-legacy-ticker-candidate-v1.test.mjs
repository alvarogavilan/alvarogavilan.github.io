import assert from 'node:assert/strict';
import {recoverBet365BobbyLegacySljp1Candidate} from '../edge-backend/src/bet365-bobby-legacy-ticker-candidate-v1.mjs';

const target={
  startedDateTime:'2026-08-26T20:00:00.000Z',
  request:{method:'GET',url:'https://casino.bet365.es/launch?gameCode=gpas_bgeorge_pop&token=LAUNCH_SECRET',headers:[{name:'Authorization',value:'Bearer HEADER_SECRET'}]},
  response:{status:200,content:{mimeType:'application/json',text:'{"title":"Bobby George: Sporting Legends","gameCode":"gpas_bgeorge_pop","minBet":0.10,"token":"BODY_SECRET"}'}},
};
const xml=`<request currency="eur" startTimestamp="1787774390" execInterval="10" game="sljp-1" casino="bet365_es" info="1"><gamedata timestamp="1787774403" local="0" winc="17" gamegroup="sljp" game="sljp-1"><amount-list><amount pos="0" sign="€" step="0" wins="0.00" instancecode="es1" currency="eur" guaranteedHitTime="1787775000">1234.56</amount></amount-list></gamedata></request>`;
const ticker={
  startedDateTime:'2026-08-26T20:00:05.000Z',
  request:{method:'GET',url:'https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&currency=EUR&local=0&instanceCode=es1&token=QUERY_SECRET',headers:[{name:'Cookie',value:'SESSION=COOKIE_SECRET'}]},
  response:{status:200,content:{mimeType:'application/xml',text:xml}},
};

let r=recoverBet365BobbyLegacySljp1Candidate({log:{entries:[target,ticker]}},{sourceName:'bobby-live.har'});
assert.equal(r.valid,true);
assert.equal(r.version,'bet365-bobby-legacy-ticker-candidate-v1');
assert.equal(r.exactBobbyProviderGameMarkerVerified,true);
assert.equal(r.exactLegacySljp1ProtocolFieldsRecovered,true);
assert.equal(r.currentDailyAmountCandidateRecovered,true);
assert.equal(r.currentGuaranteedHitTimeCandidateRecovered,true);
assert.equal(r.currentWinCountCandidateRecovered,true);
assert.equal(r.currentGameTimestampCandidateRecovered,true);
assert.equal(r.currentRequestExecIntervalCandidateRecovered,true);
assert.equal(r.captureEpochSeconds,1787774405);
assert.equal(r.tickerEndpoint,'https://ticker.example/new_jackpotxml.php');
assert.equal(r.expectedRequestCasino,'bet365_es');
assert.equal(r.expectedInstanceCode,'es1');
assert.equal(r.snapshot.code,'sljp-1');
assert.equal(r.snapshot.network,'SPORTING_LEGENDS');
assert.equal(r.snapshot.tier,'DAILY');
assert.equal(r.snapshot.providerScope,'GLOBAL');
assert.equal(r.snapshot.amount,1234.56);
assert.equal(r.snapshot.guaranteedHitTime,1787775000);
assert.equal(r.snapshot.gameTimestamp,1787774403);
assert.equal(r.snapshot.winCount,17);
assert.equal(r.snapshot.requestExecInterval,10);
assert.equal(r.snapshot.requestCasino,'bet365_es');
assert.equal(r.snapshot.instanceCode,'es1');
assert.equal(r.snapshot.local,0);
assert.equal(r.feedAgeSeconds,2);
assert.equal(r.bet365LicenseeBindingVerified,false);
assert.equal(r.exactBet365TickerEndpointOwnershipVerified,false);
assert.equal(r.currentSljp1ExecutionStateVerified,false);
assert.equal(r.usableForOverduePair,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);
let serialized=JSON.stringify(r);
for(const secret of ['LAUNCH_SECRET','HEADER_SECRET','BODY_SECRET','QUERY_SECRET','COOKIE_SECRET'])assert.equal(serialized.includes(secret),false);
assert.equal(serialized.includes('<request'),false);
assert.equal(serialized.includes('?info='),false);

const stale={
  startedDateTime:'2026-08-26T20:00:03.000Z',
  request:{method:'GET',url:'https://casino.bet365.es/launch?gameCode=gpas_slblara_pop',headers:[]},
  response:{status:200,content:{mimeType:'application/json',text:'{"gameCode":"gpas_slblara_pop"}'}},
};
r=recoverBet365BobbyLegacySljp1Candidate({log:{entries:[target,stale,ticker]}},{sourceName:'stale.har'});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_LEGACY_SLJP1_CANDIDATE_NOT_FOUND');
assert.equal(r.execution.decision,'NO_PLAY');

const ambiguousCasino={...ticker,request:{...ticker.request,url:'https://ticker.example/new_jackpotxml.php?info=1&game=sljp-1&casino=bet365_es&casino=other_es&currency=EUR&local=0&instanceCode=es1'}};
r=recoverBet365BobbyLegacySljp1Candidate({log:{entries:[target,ambiguousCasino]}},{sourceName:'ambiguous-casino.har'});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_REQUEST_CASINO_NOT_UNAMBIGUOUS');

const staleXml=xml.replace('timestamp="1787774403"','timestamp="1787774300"');
const staleFeed={...ticker,response:{...ticker.response,content:{...ticker.response.content,text:staleXml}}};
r=recoverBet365BobbyLegacySljp1Candidate({log:{entries:[target,staleFeed]}},{sourceName:'stale-feed.har'});
assert.equal(r.valid,false);
assert.equal(r.reason,'SERVER_FEED_TOO_STALE');

const resetScopeXml=xml.replace('local="0"','local="1"');
const wrongScope={...ticker,response:{...ticker.response,content:{...ticker.response.content,text:resetScopeXml}}};
r=recoverBet365BobbyLegacySljp1Candidate({log:{entries:[target,wrongScope]}},{sourceName:'wrong-scope.har'});
assert.equal(r.valid,false);
assert.equal(r.reason,'PARSED_SLJP1_ROW_NOT_FOUND');

const bad=recoverBet365BobbyLegacySljp1Candidate('{bad');
assert.equal(bad.valid,false);
assert.equal(bad.reason,'HAR_PARSE_FAILED');
assert.equal(bad.execution.maxTotalStakeEUR,0);

console.log('bet365-bobby-legacy-ticker-candidate-v1.test.mjs: PASS');
