import assert from 'node:assert/strict';
import {progressiveReturnPerEuro,breakEvenJackpotEUR,buildWinfallEconomicsState} from '../casino/jackpots/winfall-linear-hazard-core-v1.mjs';

// Unknown hazard must fail closed even with base RTP, contribution and jackpot present.
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

// Contribution percentage is funding/accounting evidence, not the missing jackpot-hit hazard.
{
  const a=buildWinfallEconomicsState({baseRtpPct:94.85,contributionPct:0.60,jackpotEUR:1000,kPerEUR:0.0001});
  const b=buildWinfallEconomicsState({baseRtpPct:94.85,contributionPct:9.99,jackpotEUR:1000,kPerEUR:0.0001});
  assert.equal(a.current.breakEvenJackpotEUR,b.current.breakEvenJackpotEUR);
  assert.equal(a.current.conservativeTotalRtp,b.current.conservativeTotalRtp);
  assert.equal(a.guards.contributionRateNeverSubstitutesForHazard,true);
}

// Under the published proportional-to-bet law, stake cancels: return component is k*J.
assert.equal(progressiveReturnPerEuro({jackpotEUR:500,kPerEUR:0.0002}),0.1);
assert.ok(Math.abs(breakEvenJackpotEUR({baseRtpPct:94.85,kPerEUR:0.0001})-515)<1e-9);

// The old 4.55 percentage-point screening gap (100 - [94.85 + 0.60]) must never be
// used as the current-EV break-even numerator. The mathematical numerator is the
// shortfall from BASE RTP because current jackpot return is k*J.
{
  const x=buildWinfallEconomicsState({baseRtpPct:94.85,contributionPct:0.60,jackpotEUR:515,kPerEUR:0.0001});
  assert.ok(Math.abs(x.current.conservativeTotalRtp-1)<1e-12);
  assert.ok(Math.abs(x.current.breakEvenJackpotEUR-515)<1e-9);
  assert.equal(x.guards.publishedBasePlusContributionNeverUsedAsCurrentRtp,true);
}

console.log('winfall-linear-hazard-core-v1.test.mjs: PASS');
