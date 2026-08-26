import assert from 'node:assert/strict';
import {analyzeBetfairSportingHar} from '../edge-backend/src/betfair-sporting-har-discovery-v1.mjs';
import {validateBetfairSportingServerSnapshot} from '../casino/jackpots/betfair-sporting-server-binding-validator-v1.mjs';

const har={log:{entries:[
  {startedDateTime:'2026-08-26T17:00:00Z',request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,headers:[],content:{mimeType:'application/json',text:'{"jackpotsCasino":"bf_es","jackpotsCasinoUrl":"https://tickers.playtech.example/new_jackpotxml.php"}'}}},
  {startedDateTime:'2026-08-26T17:00:01Z',request:{method:'GET',url:'https://tickers.playtech.example/new_jackpotxml.php?casino=bf_es&currency=EUR&game=sljp-1&local=0&winc=0',headers:[]},response:{status:200,headers:[],content:{mimeType:'text/xml',text:'<request casino="bf_es" currency="eur" game="sljp-1" startTimestamp="1787785190" execInterval="10"/><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="1787785200" winc="42"><amount currency="EUR" guaranteedHitTime="1787785300" step="0.01" wins="1000">9345.67</amount></gamedata>'}}},
  {request:{method:'GET',url:'https://example.com/ordinary',headers:[]},response:{status:200,headers:[],content:{text:'ordinary'}}}
]}};

const r=analyzeBetfairSportingHar(har,{sourceName:'exact-session.har'});
assert.equal(r.entryCount,3);
assert.equal(r.relevantEntryCount,2);
assert.equal(r.discovery.exactTickerEntryCandidates.length,1);
assert.equal(r.discovery.configBindingCandidates.length,1);
assert.equal(r.discovery.configBindingCandidates[0].sourceUrl,'https://launcher.betfair.es/initialResources/es_ES_desktop');
assert.equal(r.discovery.configBindingCandidates[0].jackpotsCasino,'bf_es');
assert.equal(r.discovery.pairedServerEvidence.length,1);
assert.equal(r.discovery.pairedServerEvidence[0].tickerXml.includes('guaranteedHitTime'),true);
assert.deepEqual(r.discovery.imsCandidates,['bf_es']);
assert.equal(r.discovery.tickerUrlCandidates.some(x=>x.includes('new_jackpotxml.php')),true);
assert.equal(r.discovery.fields.currency.includes('EUR'),true);
assert.equal(r.discovery.fields.local.includes('0'),true);
assert.equal(r.discovery.fields.game.includes('sljp-1'),true);
assert.equal(r.discovery.fields.guaranteedHitTime.includes('1787785300'),true);
assert.equal(r.discovery.currentSljp1RowRecovered,true);
assert.equal(r.discovery.exactBetfairSpainTickerImsBindingVerified,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.hardGuards.harEvidenceCannotAuthorizeGreen,true);

const p=r.discovery.pairedServerEvidence[0];
const v=validateBetfairSportingServerSnapshot({configBinding:p.configBinding,tickerXml:p.tickerXml,responseUrl:p.responseUrl,nowEpochSeconds:1787785205});
assert.equal(v.valid,true);
assert.equal(v.exactBetfairSpainTickerImsBindingVerified,true);
assert.equal(v.snapshot.code,'sljp-1');
assert.equal(v.snapshot.amount,9345.67);
assert.equal(v.snapshot.guaranteedHitTime,1787785300);
assert.equal(v.snapshot.winCount,42);
assert.equal(v.decision,'NO_PLAY');
assert.equal(v.realMoneyAllowed,false);

const foreign={log:{entries:[
  {request:{method:'GET',url:'https://evil.example/initialResources/es_ES_desktop',headers:[]},response:{status:200,headers:[],content:{text:'{"jackpotsCasino":"fake","jackpotsCasinoUrl":"https://tickers.playtech.example/new_jackpotxml.php"}'}}},
  har.log.entries[1],
]}};
const f=analyzeBetfairSportingHar(foreign);
assert.equal(f.discovery.configBindingCandidates.length,0);
assert.equal(f.discovery.pairedServerEvidence.length,0);
assert.equal(f.execution.maxSpins,0);
console.log('betfair-sporting-har-discovery-v1.test.mjs: PASS');
