import assert from 'node:assert/strict';
import {progressiveReturnPerEuro,breakEvenJackpotEUR,buildWinfallEconomicsState} from '../casino/jackpots/winfall-linear-hazard-core-v1.mjs';

{
  const x=buildWinfallEconomicsState({baseRtpPct:94.85,contributionPct:0.60,jackpotEUR:1000,kPerEUR:null});
  assert.equal(x.current.progressiveReturnPerEuro,null);
  assert.equal(x.current.conservativeTotalRtp,null);
  assert.equal(x.current.breakEvenJackpotEUR,null);
  assert.equal(x.current.positiveEvProven,false);
  assert.equal(x.decision.hazardConstantKnown,false);
  assert.equal(x.decision.economicPromotionAllowed,false);
  assert.equal(x.decision.realMoneyAllowed,false);
}

{
  const a=buildWinfallEconomicsState({baseRtpPct:94.85,contributionPct:0.60,jackpotEUR:1000,kPerEUR:0.0001});
  const b=buildWinfallEconomicsState({baseRtpPct:94.85,contributionPct:9.99,jackpotEUR:1000,kPerEUR:0.0001});
  assert.equal(a.current.breakEvenJackpotEUR,b.current.breakEvenJackpotEUR);
  assert.equal(a.current.conservativeTotalRtp,b.current.conservativeTotalRtp);
  assert.equal(a.guards.contributionRateNeverSubstitutesForHazard,true);
}

assert.equal(progressiveReturnPerEuro({jackpotEUR:500,kPerEUR:0.0002}),0.1);
assert.ok(Math.abs(breakEvenJackpotEUR({baseRtpPct:94.85,kPerEUR:0.0001})-515)<1e-9);

{
  const x=buildWinfallEconomicsState({baseRtpPct:94.85,contributionPct:0.60,jackpotEUR:515,kPerEUR:0.0001});
  assert.ok(Math.abs(x.current.conservativeTotalRtp-1)<1e-12);
  assert.ok(Math.abs(x.current.breakEvenJackpotEUR-515)<1e-9);
  assert.equal(x.guards.publishedBasePlusContributionNeverUsedAsCurrentRtp,true);
}

console.log('winfall-linear-hazard-core-v1.test.mjs: PASS');
