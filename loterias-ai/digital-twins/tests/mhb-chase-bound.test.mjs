import assert from 'node:assert/strict';
import {
  BINDING,conditionalChaseLowerReturn,requiredRelativeHazardWeight,
  thresholdAmountForRelativeWeight,realizedChaseReturnAtHit,chaseExecutionGate
} from '../core/mhb-chase-bound.mjs';

const b=0.935;
const c=0.0299*0.3866*0.5588621002723618;
const B=200;

const threshold=thresholdAmountForRelativeWeight({baseRtpRatio:b,boundaryEUR:B,tierFundingPerNetworkEUR:c,relativeHazardWeightLowerBound:1});
assert.ok(Math.abs(threshold-180.12283990719283)<1e-10);

const r166=requiredRelativeHazardWeight({baseRtpRatio:b,currentAmountEUR:166.41,boundaryEUR:B,tierFundingPerNetworkEUR:c});
const r190=requiredRelativeHazardWeight({baseRtpRatio:b,currentAmountEUR:190,boundaryEUR:B,tierFundingPerNetworkEUR:c});
assert.ok(r166>1.68&&r166<1.70);
assert.ok(r190>0.50&&r190<0.51);

// Under the CONDITIONAL theorem assumptions, an earlier hit gives a larger return per chase EUR;
// therefore the MHB boundary is the worst allowed hit amount.
const h181=realizedChaseReturnAtHit({baseRtpRatio:b,startAmountEUR:180.2,hitAmountEUR:181,tierFundingPerNetworkEUR:c,relativeHazardWeight:1});
const h190=realizedChaseReturnAtHit({baseRtpRatio:b,startAmountEUR:180.2,hitAmountEUR:190,tierFundingPerNetworkEUR:c,relativeHazardWeight:1});
const h200=realizedChaseReturnAtHit({baseRtpRatio:b,startAmountEUR:180.2,hitAmountEUR:200,tierFundingPerNetworkEUR:c,relativeHazardWeight:1});
assert.ok(h181.totalReturn>h190.totalReturn);
assert.ok(h190.totalReturn>h200.totalReturn);
assert.ok(h200.totalReturn>1);

const lower=conditionalChaseLowerReturn({baseRtpRatio:b,currentAmountEUR:190,boundaryEUR:B,tierFundingPerNetworkEUR:c,relativeHazardWeightLowerBound:0.51});
assert.ok(lower.totalReturnLower>1);

// Missing PowerPlay stake proportionality must hard block green even at an attractive meter.
const blocked=chaseExecutionGate({
  baseRtpRatio:b,currentAmountEUR:195,boundaryEUR:B,tierFundingPerNetworkEUR:c,
  relativeHazardWeightLowerBound:1,
  runtimeBinding:BINDING.VERIFIED_OPERATOR_BOUND,
  tierFundingBinding:BINDING.VERIFIED_PROVIDER_BOUND,
  stakeHazardProportionalityBinding:BINDING.UNKNOWN,
  crossGameRelativeWeightBinding:BINDING.UNKNOWN,
  stableFlowShareBinding:BINDING.UNKNOWN,
  acceptedWagerOrderingVerified:true,displayFreshnessVerified:true
});
assert.equal(blocked.decision,'NO_PLAY');
assert.equal(blocked.reason,'STAKE_TO_HAZARD_PROPORTIONALITY_NOT_BOUND');

const stillBlocked=chaseExecutionGate({
  baseRtpRatio:b,currentAmountEUR:195,boundaryEUR:B,tierFundingPerNetworkEUR:c,
  relativeHazardWeightLowerBound:1,
  runtimeBinding:BINDING.VERIFIED_OPERATOR_BOUND,
  tierFundingBinding:BINDING.VERIFIED_PROVIDER_BOUND,
  stakeHazardProportionalityBinding:BINDING.VERIFIED_PROVIDER_BOUND,
  crossGameRelativeWeightBinding:BINDING.UNKNOWN,
  stableFlowShareBinding:BINDING.VERIFIED_PROVIDER_BOUND,
  acceptedWagerOrderingVerified:true,displayFreshnessVerified:true
});
assert.equal(stillBlocked.decision,'NO_PLAY');
assert.equal(stillBlocked.reason,'CROSS_GAME_RELATIVE_HAZARD_WEIGHT_NOT_BOUND');

const syntheticReady=chaseExecutionGate({
  baseRtpRatio:b,currentAmountEUR:190,boundaryEUR:B,tierFundingPerNetworkEUR:c,
  relativeHazardWeightLowerBound:0.51,
  runtimeBinding:BINDING.VERIFIED_OPERATOR_BOUND,
  tierFundingBinding:BINDING.VERIFIED_PROVIDER_BOUND,
  stakeHazardProportionalityBinding:BINDING.VERIFIED_PROVIDER_BOUND,
  crossGameRelativeWeightBinding:BINDING.VERIFIED_PROVIDER_BOUND,
  stableFlowShareBinding:BINDING.VERIFIED_PROVIDER_BOUND,
  acceptedWagerOrderingVerified:true,displayFreshnessVerified:true
});
assert.equal(syntheticReady.decision,'GREEN_MATH_ONLY_REQUIRES_SESSION_RISK_CAP');
assert.equal(syntheticReady.realMoneyAllowed,false);

console.log('mhb-chase-bound.test.mjs: PASS');
