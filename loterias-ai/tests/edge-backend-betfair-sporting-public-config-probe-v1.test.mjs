import assert from 'node:assert/strict';
import {extractSportingPublicConfigSignals,discoverPublicAssetUrls,discoverPublicConfigUrls,staticPublicConfigCandidates,deriveCoLocatedBetfairConfigBindings} from '../edge-backend/src/betfair-sporting-public-config-probe-v1.mjs';

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
const busted=staticPublicConfigCandidates({cacheBustEpochMs:1770915709847});
assert.deepEqual(busted,['https://launcher.betfair.es/initialResources/es_ES_desktop?t=1770915709847','https://casino.betfair.es/initialResources/es_ES_desktop?t=1770915709847']);
assert.equal(deriveCoLocatedBetfairConfigBindings([extractSportingPublicConfigSignals(`{"jackpotsCasino":"betfair_es","jackpotsCasinoUrl":"https://example.playtech.com/new_jackpotxml.php"}`,{sourceUrl:busted[0]})]).length,1);
assert.deepEqual(staticPublicConfigCandidates({cacheBustEpochMs:0}),staticPublicConfigCandidates());
const hostile=`const cfg='https://evil.example/initialResources/es_ES'; const x='https://evil.example/webtickers';`;
assert.deepEqual(discoverPublicConfigUrls(hostile,'https://launcher.betfair.es/'),[]);
const empty=extractSportingPublicConfigSignals('ordinary casino page',{sourceUrl:'x'});
assert.deepEqual(empty.assignments,{});assert.deepEqual(empty.urls,[]);assert.equal(empty.sljp1Observed,false);assert.equal(empty.tonymcObserved,false);
console.log('edge-backend-betfair-sporting-public-config-probe-v1.test.mjs: PASS');
