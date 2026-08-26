import assert from 'node:assert/strict';
import {analyzeSafeHarPairText} from '../scripts/analyze-betfair-sporting-har-pair.mjs';

const config=(casino='bf_es',cacheBust='')=>({
  request:{method:'GET',url:`https://launcher.betfair.es/initialResources/es_ES_desktop${cacheBust?`?cacheBust=${cacheBust}`:''}`,headers:[{name:'Authorization',value:'Bearer secret-token'}]},
  response:{status:200,headers:[{name:'Set-Cookie',value:'sid=cookievalue'}],content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:casino,jackpotsCasinoUrl:'https://tickers.playtech.example/new_jackpotxml.php?configured=secret'})}},
});
const ticker=(gameTimestamp,amount,winCount=42,casino='bf_es',ght=2000)=>({
  startedDateTime:new Date(gameTimestamp*1000).toISOString(),
  request:{method:'GET',url:`https://tickers.playtech.example/new_jackpotxml.php?casino=${casino}&currency=EUR&game=sljp-1&local=0&winc=0&token=hidden`,headers:[]},
  response:{status:200,headers:[],content:{mimeType:'text/xml',text:`<request casino="${casino}" currency="eur" game="sljp-1" startTimestamp="${gameTimestamp-10}" execInterval="10"/><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${gameTimestamp}" winc="${winCount}"><amount currency="EUR" guaranteedHitTime="${ght}" step="0.01" wins="1000">${amount}</amount></gamedata>`}},
});
const har=(gameTimestamp,amount,winCount=42,casino='bf_es',ght=2000,cacheBust='')=>JSON.stringify({log:{entries:[config(casino,cacheBust),ticker(gameTimestamp,amount,winCount,casino,ght)]}});

const r=analyzeSafeHarPairText(
  har(1990,100,42,'bf_es',2000,'before'),
  har(2005,100.02,42,'bf_es',2000,'after'),
  {beforeSourceName:'before.har',afterSourceName:'after.har',decisionNowEpochSeconds:2010,stakeEUR:0.25},
);
assert.equal(r.ok,true);
assert.equal(r.version,'betfair-sporting-safe-har-pair-cli-v1.1-endpoint-redaction');
assert.equal(r.analysis.pairVerified,true);
assert.equal(r.analysis.overdue.followingDayUnawardedVerified,true);
assert.equal(r.analysis.overdue.nextEligibleNetworkBetGuaranteedJackpot,true);
assert.equal(r.analysis.overdue.currentDailyJackpotEUR,100.02);
assert.equal(r.analysis.raceGate.stakeEUR,0.25);
assert.equal(r.analysis.raceGate.structuredProspectiveRaceEvidenceVerified,false);
assert.equal(r.analysis.before.configSourceUrl,'https://launcher.betfair.es/initialResources/es_ES_desktop');
assert.equal(r.analysis.before.tickerEndpoint,'https://tickers.playtech.example/new_jackpotxml.php');
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.hardGuards.pairAnalyzerIsDiagnosticOnly,true);
assert.equal(r.hardGuards.endpointQueriesAndFragmentsNeverEmitted,true);
const serialized=JSON.stringify(r);
assert.equal(serialized.includes('secret-token'),false);
assert.equal(serialized.includes('cookievalue'),false);
assert.equal(serialized.includes('configured=secret'),false);
assert.equal(serialized.includes('token=hidden'),false);
assert.equal(serialized.includes('cacheBust=before'),false);

const reset=analyzeSafeHarPairText(
  har(1990,100,42),
  har(2005,90,43),
  {decisionNowEpochSeconds:2010,stakeEUR:0.25},
);
assert.equal(reset.ok,true);
assert.equal(reset.analysis.underlyingScientificReason,'JACKPOT_WIN_COUNT_CHANGED');
assert.equal(reset.execution.maxSpins,0);

const malformed=analyzeSafeHarPairText('{bad',har(2005,100.02),{decisionNowEpochSeconds:2010});
assert.equal(malformed.ok,false);
assert.equal(malformed.reason,'BEFORE_HAR_PARSE_FAILED');
assert.equal(malformed.execution.realMoneyAllowed,false);

console.log('analyze-betfair-sporting-har-pair.test.mjs: PASS');
