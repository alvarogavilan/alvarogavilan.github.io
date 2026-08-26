import assert from 'node:assert/strict';
import {extractSportingPublicConfigSignals,discoverPublicAssetUrls} from '../edge-backend/src/betfair-sporting-public-config-probe-v1.mjs';

const sample=`<html><script>window.initialResources={"jackpotsCasino":"betfair_es","jackpotsCasinoUrl":"https:\\/\\/example.playtech.com\\/new_jackpotxml.php"}; const d='sljp-1'; const g='tonymc';</script><script src="https://launcher.betfair.es/assets/app.js"></script><script src="https://evil.example/x.js"></script></html>`;
const r=extractSportingPublicConfigSignals(sample,{sourceUrl:'https://launcher.betfair.es/'});
assert.equal(r.assignments.jackpotsCasino,'betfair_es');
assert.equal(r.assignments.jackpotsCasinoUrl,'https://example.playtech.com/new_jackpotxml.php');
assert.deepEqual(r.urls,['https://example.playtech.com/new_jackpotxml.php']);
assert.equal(r.sljp1Observed,true);
assert.equal(r.tonymcObserved,true);
assert.equal(r.guaranteedHitTimeObserved,false);
assert.equal(r.hits.filter(x=>x.key==='jackpotsCasino').length,1);

const assets=discoverPublicAssetUrls(sample,'https://launcher.betfair.es/');
assert.deepEqual(assets,['https://launcher.betfair.es/assets/app.js']);

const empty=extractSportingPublicConfigSignals('ordinary casino page',{sourceUrl:'x'});
assert.deepEqual(empty.assignments,{});
assert.deepEqual(empty.urls,[]);
assert.equal(empty.sljp1Observed,false);
assert.equal(empty.tonymcObserved,false);

console.log('edge-backend-betfair-sporting-public-config-probe-v1.test.mjs: PASS');
