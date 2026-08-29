import assert from 'node:assert/strict';
import {analyzeBetfairLiveRouletteAogHarObject as analyze} from '../scripts/analyze-betfair-live-roulette-aog-har.mjs';
const har={log:{entries:[
 {startedDateTime:'2026-08-29T15:00:00Z',request:{url:'https://launcher.betfair.es/?gameId=live-roulette-cev&token=PRIVATE'},response:{content:{text:''}}},
 {request:{url:'https://ticker.example/new_jackpotxml.php?casino=bf_es&game=mrj-1&currency=eur&ssoid=PRIVATE'},response:{content:{text:'<request><gamedata gamegroup="mrj" game="mrj-1" local="0" winc="2"><amount currency="eur">55.50</amount></gamedata><gamedata gamegroup="mrj" game="mrj-2" local="0" winc="3"><amount currency="eur">612.25</amount></gamedata><gamedata gamegroup="mrj" game="mrj-3" local="0"><amount currency="eur">6012.10</amount></gamedata><gamedata gamegroup="mrj" game="mrj-4" local="0"><amount currency="eur">120000.00</amount></gamedata></request>'}}}
]}};
const r=analyze(har);
assert.equal(r.ok,true);
assert.equal(r.exactSessionCandidate,true);
assert.equal(r.eurGlobalRowCount,4);
assert.equal(r.networkSnapshotCandidate.tiers['mrj-1'],55.5);
assert.equal(r.networkSnapshotCandidate.tiers['mrj-4'],120000);
assert.equal(r.mrjRows.every(x=>x.numericTierIdentityVerified===false),true);
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
assert.equal(JSON.stringify(r).includes('ssoid='),false);
console.log('analyze-betfair-live-roulette-aog-har.test.mjs: PASS');
