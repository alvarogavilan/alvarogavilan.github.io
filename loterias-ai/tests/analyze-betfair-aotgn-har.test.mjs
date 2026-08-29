import assert from 'node:assert/strict';
import {analyzeBetfairAotgnHarObject as analyze} from '../scripts/analyze-betfair-aotgn-har.mjs';
const har={log:{entries:[
 {startedDateTime:'2026-08-29T17:00:00Z',request:{url:'https://launcher.betfair.es/?gameId=age-of-the-gods-norse-king-of-asgard-cptn&token=PRIVATE'},response:{content:{text:''}}},
 {request:{url:'https://ticker.example/new_jackpotxml.php?casino=bf_es&game=aognjp-3&currency=eur&ssoid=PRIVATE'},response:{content:{text:'<request><gamedata gamegroup="aognjp" game="aognjp-3" local="0" winc="2"><amount currency="eur" guranteedHitAmount="2000.00">1997.50</amount></gamedata></request>'}}}
]}};
const r=analyze(har);
assert.equal(r.ok,true);
assert.equal(r.exactSessionCandidate,true);
assert.equal(r.exactExtraSemanticCandidate,true);
assert.equal(r.practiceInputCandidate.currentAmountEUR,1997.5);
assert.equal(r.practiceInputCandidate.guaranteedHitAmountEUR,2000);
assert.equal(r.practiceInputCandidate.baseRtpPct,94.56);
assert.equal(r.practiceInputCandidate.meterContributionPct,0.55);
assert.equal(r.metrics.gapToGuaranteedAmountEUR,2.5);
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
assert.equal(JSON.stringify(r).includes('ssoid='),false);
console.log('analyze-betfair-aotgn-har.test.mjs: PASS');
