import assert from 'node:assert/strict';
import {analyzeEdgeP0HarV2Text as analyze} from '../scripts/analyze-edge-p0-har-v2.mjs';
const raw=JSON.stringify({log:{entries:[]}});
const lanes=['apmccoy','casino777-aotgn','frank','ultimate-vp','kingdoms-rise','betfair-regal-riches','magic-nile','scarab','hexbreak3r','golden-egypt','ocean-magic','betfair-aotgn','betfair-live-roulette-aog'];
for(const lane of lanes){const r=analyze(raw,{lane,sourceName:`${lane}.har`});assert.equal(r.ok,true,`${lane} should route`);assert.equal(r.execution.realMoneyAllowed,false);}
const aotg=analyze(JSON.stringify({log:{entries:[
 {startedDateTime:'2026-08-29T15:00:00Z',request:{url:'https://launcher.betfair.es/?gameId=age-of-the-gods-norse-king-of-asgard-cptn&token=PRIVATE'},response:{content:{text:''}}},
 {request:{url:'https://ticker.example/new_jackpotxml.php?casino=bf_es&game=aognjp-3&currency=eur&ssoid=PRIVATE'},response:{content:{text:'<request><gamedata gamegroup="aognjp" game="aognjp-3" local="0"><amount currency="eur" guranteedHitAmount="2000.00">1997.50</amount></gamedata></request>'}}}
]}}),{lane:'betfair-aotgn',sourceName:'aotg.har'});
assert.equal(aotg.closed.exactSessionCandidate,true);assert.equal(aotg.closed.amountBoundaryRowsObserved,true);assert.equal(aotg.closed.exactExtraSemanticCandidate,true);assert.equal(aotg.closed.practiceInputCandidateAvailable,true);assert.equal(aotg.closed.executionAuthorized,false);assert.equal(JSON.stringify(aotg).includes('PRIVATE'),false);
const roulette=analyze(JSON.stringify({log:{entries:[
 {startedDateTime:'2026-08-29T15:10:00Z',request:{url:'https://launcher.betfair.es/?gameId=live-roulette-cev&token=PRIVATE'},response:{content:{text:''}}},
 {request:{url:'https://ticker.example/new_jackpotxml.php?casino=bf_es&game=mrj-1&currency=eur&ssoid=PRIVATE'},response:{content:{text:'<request><gamedata gamegroup="mrj" game="mrj-1" local="0"><amount currency="eur">55.50</amount></gamedata><gamedata gamegroup="mrj" game="mrj-2" local="0"><amount currency="eur">612.25</amount></gamedata><gamedata gamegroup="mrj" game="mrj-3" local="0"><amount currency="eur">6012.10</amount></gamedata><gamedata gamegroup="mrj" game="mrj-4" local="0"><amount currency="eur">120000.00</amount></gamedata></request>'}}}
]}}),{lane:'betfair-live-roulette-aog',sourceName:'roulette.har'});
assert.equal(roulette.closed.exactSessionCandidate,true);assert.equal(roulette.closed.eurGlobalMrjRowsObserved,true);assert.equal(roulette.closed.networkSnapshotCandidateAvailable,true);assert.equal(roulette.closed.numericTierIdentityVerified,false);assert.equal(roulette.closed.exactLiveContributionRateVerified,false);assert.equal(roulette.closed.executionAuthorized,false);assert.equal(JSON.stringify(roulette).includes('PRIVATE'),false);
const bad=analyze(raw,{lane:'unknown'});assert.equal(bad.ok,false);assert.equal(bad.reason,'SUPPORTED_LANE_REQUIRED');assert.deepEqual(bad.supportedLanes,lanes);
console.log('analyze-edge-p0-har-v2.test.mjs: PASS');
