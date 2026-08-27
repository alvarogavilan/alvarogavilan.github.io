import assert from 'node:assert/strict';
import {deriveBet365SportingPublishedBaseLoss} from '../edge-backend/src/bet365-sporting-published-base-loss-v1.mjs';

const cases=[
  ['gpas_slfbruno_pop',0.10,95.92,0.00408],
  ['gpas_bgeorge_pop',0.10,96.49,0.00351],
  ['gpas_slblara_pop',0.10,96.07,0.00393],
];
for(const [gameCode,stake,rtp,loss] of cases){
  const r=deriveBet365SportingPublishedBaseLoss({gameCode});
  assert.equal(r.valid,true);
  assert.equal(r.publishedMinimumBetEUR,stake);
  assert.equal(r.publishedTheoreticalRtpPct,rtp);
  assert.ok(Math.abs(r.expectedBaseLossAtPublishedMinimumEUR-loss)<1e-12);
  assert.equal(r.publishedTheoreticalRtpExcludesJackpotAllocationVerified,true);
  assert.equal(r.jackpotEligibilityAtPublishedMinimumBetVerified,false);
  assert.equal(r.servedStakeAtDecisionVerified,false);
  assert.equal(r.servedSljp1RuntimeBindingVerified,false);
  assert.equal(r.followingDayRuleVerified,false);
  assert.equal(r.usableForJackpotThreshold,false);
  assert.equal(r.usableForExecution,false);
  assert.equal(r.execution.decision,'NO_PLAY');
  assert.equal(r.execution.realMoneyAllowed,false);
}
const unknown=deriveBet365SportingPublishedBaseLoss({gameCode:'unknown'});
assert.equal(unknown.valid,false);
assert.equal(unknown.execution.realMoneyAllowed,false);
console.log('bet365-sporting-published-base-loss-v1.test.mjs: PASS');
