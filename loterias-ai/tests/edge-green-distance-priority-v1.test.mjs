import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/green-distance-priority-v1.json','utf8'));
const client=fs.readFileSync('loterias-ai/edge-live/edge-science-client-v1.mjs','utf8');
assert.equal(e.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.priority.length,6);
assert.equal(e.priority[0].id,'betfair-ap-mccoy-sporting-overdue-first-bet');
assert.equal(e.priority[1].id,'ultimate-video-poker-jacks-progressive');
assert.equal(e.priority[2].id,'winfall-wishes-jackpot');
assert.equal(e.priority[3].id,'jackpot-king-clean-reference');
for(const row of e.priority){
  assert.equal(row.thresholdNow,null);
  assert.equal(row.executionEligible,false);
  assert.ok(Array.isArray(row.blocking)&&row.blocking.length>0);
}
assert.equal(e.jackpotReality.canPredictExactWinningSpin,false);
assert.equal(e.jackpotReality.canGuaranteeWinningAJackpot,false);
assert.equal(e.jackpotReality.greenCannotBeScheduledByDate,true);
assert.equal(e.hardGuards.rankingIsNotExecutionAuthority,true);
assert.equal(e.hardGuards.highJackpotAmountIsNotPositiveEV,true);
assert.equal(e.hardGuards.mustBeWonByProximityIsNotPositiveEVByItself,true);
assert.equal(e.hardGuards.followingDayRuleDoesNotGuaranteeOurBetIsFirst,true);
assert.equal(e.hardGuards.empiricalRaceBoundRequiresFrozenProspectiveProtocol,true);
assert.equal(e.hardGuards.noCandidateMayBypassExecutionContract,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);
assert.ok(client.includes("const PRIORITY='./evidence/green-distance-priority-v1.json'"));
assert.ok(client.includes('CAMINO A GREEN'));
assert.ok(client.includes('NINGÚN THRESHOLD EJECUTABLE'));
assert.ok(client.includes('Ranking de distancia científica, no probabilidad de ganar'));
console.log('edge-green-distance-priority-v1.test.mjs: PASS');
