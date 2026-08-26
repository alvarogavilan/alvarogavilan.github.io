import assert from 'node:assert/strict';
import {extractSportingPublicConfigSignals,discoverPublicAssetUrls,discoverPublicConfigUrls,staticPublicConfigCandidates,deriveCoLocatedBetfairConfigBindings,runBetfairSportingPublicConfigProbe} from '../edge-backend/src/betfair-sporting-public-config-probe-v1.mjs';

const sample=`<html><script>window.initialResources={"jackpotsCasino":"betfair_es","jackpotsCasinoUrl":"https:\\/\\/example.playtech.com\\/new_jackpotxml.php","liveEndpointUrl":"https:\\/\\/webtickers.malmegas.com\\/webtickers","useServicesCasinoJackpots":true}; const cfg='/initialResources/es_ES_desktop?foo=1'; const d='sljp-1'; const g='tonymc';</script><script src="https://launcher.betfair.es/assets/app.js"></script><script src="https://evil.example/x.js"></script></html>`;
const sourceUrl='https://launcher.betfair.es/initialResources/es_ES_desktop';
const r=extractSportingPublicConfigSignals(sample,{sourceUrl});
assert.equal(r.assignments.jackpotsCasino,'betfair_es');
assert.equal(r.assignments.jackpotsCasinoUrl,'https://example.playtech.com/new_jackpotxml.php');
assert.equal(r.assignments.liveEndpointUrl,'https://webtickers.malmegas.com/webtickers');
assert.equal(r.useServicesCasinoJackpotsObserved,true);
assert.equal(r.sljp1Observed,true);
assert.equal(r.tonymcObserved,true);

const bindings=deriveCoLocatedBetfairConfigBindings([r]);
assert.equal(bindings.length,2);
assert.equal(bindings[0].jackpotsCasino,'betfair_es');
assert.equal(bindings[0].sameDocument,true);
assert.equal(bindings[0].sourceBetfairOwned,true);
assert.equal(bindings[0].sourceInitialResources,true);

const splitCasino=extractSportingPublicConfigSignals(`{"jackpotsCasino":"betfair_es"}`,{sourceUrl:'https://launcher.betfair.es/initialResources/es_ES_desktop'});
const splitTicker=extractSportingPublicConfigSignals(`{"jackpotsCasinoUrl":"https://example.playtech.com/new_jackpotxml.php"}`,{sourceUrl:'https://casino.betfair.es/initialResources/es_ES_desktop'});
assert.deepEqual(deriveCoLocatedBetfairConfigBindings([splitCasino,splitTicker]),[]);
const foreign=extractSportingPublicConfigSignals(`{"jackpotsCasino":"foreign","jackpotsCasinoUrl":"https://example.playtech.com/new_jackpotxml.php"}`,{sourceUrl:'https://example.playtech.com/initialResources/es_ES_desktop'});
assert.deepEqual(deriveCoLocatedBetfairConfigBindings([foreign]),[]);
const betfairAsset=extractSportingPublicConfigSignals(`{"jackpotsCasino":"betfair_es","jackpotsCasinoUrl":"https://example.playtech.com/new_jackpotxml.php"}`,{sourceUrl:'https://launcher.betfair.es/assets/app.js'});
assert.deepEqual(deriveCoLocatedBetfairConfigBindings([betfairAsset]),[]);

const assets=discoverPublicAssetUrls(sample,'https://launcher.betfair.es/');
assert.deepEqual(assets,['https://launcher.betfair.es/assets/app.js']);
const configs=discoverPublicConfigUrls(sample,'https://launcher.betfair.es/');
assert.deepEqual(configs,['https://example.playtech.com/new_jackpotxml.php','https://webtickers.malmegas.com/webtickers','https://launcher.betfair.es/initialResources/es_ES_desktop?foo=1']);
assert.deepEqual(staticPublicConfigCandidates(),['https://launcher.betfair.es/initialResources/es_ES_desktop','https://casino.betfair.es/initialResources/es_ES_desktop']);
const hostile=`const cfg='https://evil.example/initialResources/es_ES'; const x='https://evil.example/webtickers';`;
assert.deepEqual(discoverPublicConfigUrls(hostile,'https://launcher.betfair.es/'),[]);
const empty=extractSportingPublicConfigSignals('ordinary casino page',{sourceUrl:'x'});
assert.deepEqual(empty.assignments,{});assert.deepEqual(empty.urls,[]);assert.equal(empty.sljp1Observed,false);assert.equal(empty.tonymcObserved,false);

const realFetch=globalThis.fetch;
const now=Math.floor(Date.now()/1000);
const liveXml=`<root><request casino="betfair_es" currency="eur" game="sljp-1" startTimestamp="${now-50}" execInterval="10"/><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${now-2}" winc="7"><amount currency="EUR" guaranteedHitTime="${now+60}" step="0.01" wins="100">88.50</amount></gamedata></root>`;
const configJson=`{"jackpotsCasino":"betfair_es","jackpotsCasinoUrl":"https://example.playtech.com/new_jackpotxml.php","useServicesCasinoJackpots":true}`;
globalThis.fetch=async input=>{
  const url=String(input);
  let body='ordinary page',type='text/html';
  if(url==='https://launcher.betfair.es/initialResources/es_ES_desktop'){body=configJson;type='application/json';}
  if(url.startsWith('https://example.playtech.com/new_jackpotxml.php?')){body=liveXml;type='application/xml';}
  return {ok:true,status:200,url,headers:{get:n=>n.toLowerCase()==='content-type'?type:null},text:async()=>body};
};
try{
  const probe=await runBetfairSportingPublicConfigProbe();
  assert.equal(probe.discovery.bindingCandidateObserved,true);
  assert.equal(probe.discovery.serverSnapshotAttemptCount,1);
  assert.equal(probe.discovery.validServerIdentityCount,1);
  assert.equal(probe.discovery.exactBetfairSpainTickerImsBindingVerified,true);
  assert.equal(probe.discovery.currentSljp1RowRecovered,true);
  assert.equal(probe.discovery.currentDailyAmountExactVerified,true);
  assert.equal(probe.discovery.currentGuaranteedHitTimeExactVerified,true);
  assert.equal(probe.discovery.currentServerSnapshot.expectedBetfairImsCasino,'betfair_es');
  assert.equal(probe.discovery.currentServerSnapshot.snapshot.amount,88.5);
  assert.equal(probe.execution.decision,'NO_PLAY');
  assert.equal(probe.execution.realMoneyAllowed,false);
  assert.equal(probe.hardGuards.serverSnapshotCannotProveOverdueByItself,true);
}finally{globalThis.fetch=realFetch;}

console.log('edge-backend-betfair-sporting-public-config-probe-v1.test.mjs: PASS');
