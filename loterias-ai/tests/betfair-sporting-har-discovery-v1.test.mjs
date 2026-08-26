import assert from 'node:assert/strict';
import {analyzeBetfairSportingHar} from '../edge-backend/src/betfair-sporting-har-discovery-v1.mjs';

const har={log:{entries:[
  {startedDateTime:'2026-08-26T17:00:00Z',request:{method:'GET',url:'https://launcher.betfair.es/assets/app.js',headers:[]},response:{status:200,headers:[],content:{mimeType:'application/javascript',text:'window.initialResources={jackpotsCasino:"bf_es",jackpotsCasinoUrl:"https://tickers.playtech.example/new_jackpotxml.php"}'}}},
  {startedDateTime:'2026-08-26T17:00:01Z',request:{method:'GET',url:'https://tickers.playtech.example/new_jackpotxml.php?casino=bf_es&currency=EUR&game=sljp-1&local=0&winc=0',headers:[]},response:{status:200,headers:[],content:{mimeType:'text/xml',text:'<jackpot game="sljp-1" casino="bf_es" currency="EUR" local="0" winc="0" amount="9345.67" guaranteedHitTime="1787785200" />'}}},
  {request:{method:'GET',url:'https://example.com/ordinary',headers:[]},response:{status:200,headers:[],content:{text:'ordinary'}}}
]}};

const r=analyzeBetfairSportingHar(har,{sourceName:'exact-session.har'});
assert.equal(r.entryCount,3);
assert.equal(r.relevantEntryCount,2);
assert.equal(r.discovery.exactTickerEntryCandidates.length,1);
assert.deepEqual(r.discovery.imsCandidates,['bf_es']);
assert.equal(r.discovery.tickerUrlCandidates.some(x=>x.includes('new_jackpotxml.php')),true);
assert.equal(r.discovery.fields.currency.includes('EUR'),true);
assert.equal(r.discovery.fields.local.includes('0'),true);
assert.equal(r.discovery.fields.game.includes('sljp-1'),true);
assert.equal(r.discovery.fields.guaranteedHitTime.includes('1787785200'),true);
assert.equal(r.discovery.currentSljp1RowRecovered,true);
assert.equal(r.discovery.exactBetfairSpainTickerImsBindingVerified,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.hardGuards.harEvidenceCannotAuthorizeGreen,true);

const hostile={log:{entries:[{request:{method:'POST',url:'https://evil.example/api',postData:{text:'sljp-1'},headers:[]},response:{status:200,headers:[],content:{text:'new_jackpotxml.php casino="fake"'}}}]}};
const h=analyzeBetfairSportingHar(hostile);
assert.equal(h.discovery.exactTickerEntryCandidates.length,0);
assert.equal(h.execution.maxSpins,0);
console.log('betfair-sporting-har-discovery-v1.test.mjs: PASS');
