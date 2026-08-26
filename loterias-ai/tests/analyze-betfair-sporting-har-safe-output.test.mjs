import assert from 'node:assert/strict';
import {analyzeSafeHarText} from '../scripts/analyze-betfair-sporting-har.mjs';

const gameTs=2005;
const har=JSON.stringify({log:{entries:[
  {
    startedDateTime:new Date((gameTs-1)*1000).toISOString(),
    request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop?cacheBust=secret',headers:[{name:'Authorization',value:'Bearer secret-token'}]},
    response:{status:200,headers:[{name:'Set-Cookie',value:'sid=cookievalue'}],content:{mimeType:'application/json',text:'{"jackpotsCasino":"bf_es","jackpotsCasinoUrl":"https://tickers.playtech.example/new_jackpotxml.php?configured=secret"}'}},
  },
  {
    startedDateTime:new Date(gameTs*1000).toISOString(),
    request:{method:'GET',url:'https://tickers.playtech.example/new_jackpotxml.php?casino=bf_es&currency=EUR&game=sljp-1&local=0&winc=0&token=hidden',headers:[]},
    response:{status:200,headers:[],content:{mimeType:'text/xml',text:'<request casino="bf_es" currency="eur" game="sljp-1" startTimestamp="1995" execInterval="10"><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="2005" winc="42"><amount currency="EUR" guaranteedHitTime="2010" step="0.01" wins="1000">100.02</amount></gamedata></request>'}},
  },
]}});

const r=analyzeSafeHarText(har,{sourceName:'capture.har',nowEpochSeconds:gameTs});
assert.equal(r.ok,true);
assert.equal(r.version,'betfair-sporting-safe-har-cli-v1.1-endpoint-redaction');
assert.equal(r.legacy.configBindingCandidates.length,1);
assert.equal(r.legacy.configBindingCandidates[0].sourceUrl,'https://launcher.betfair.es/initialResources/es_ES_desktop');
assert.equal(r.legacy.configBindingCandidates[0].tickerUrl,'https://tickers.playtech.example/new_jackpotxml.php');
assert.deepEqual(r.legacy.tickerUrlCandidates,['https://tickers.playtech.example/new_jackpotxml.php']);
assert.equal(r.validatedLegacySnapshot.tickerEndpoint,'https://tickers.playtech.example/new_jackpotxml.php');
assert.equal(r.validatedLegacySnapshot.configSourceUrl,'https://launcher.betfair.es/initialResources/es_ES_desktop');
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.hardGuards.endpointQueriesAndFragmentsNeverEmitted,true);
const serialized=JSON.stringify(r);
for(const secret of ['secret-token','cookievalue','cacheBust=secret','configured=secret','token=hidden'])assert.equal(serialized.includes(secret),false);

console.log('analyze-betfair-sporting-har-safe-output.test.mjs: PASS');
