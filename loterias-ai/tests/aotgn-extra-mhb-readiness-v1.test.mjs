import assert from 'node:assert/strict';
import {evaluateAotgnExtraMhbReadiness} from '../casino/jackpots/aotgn-extra-mhb-readiness-v1.mjs';

const nearCap=evaluateAotgnExtraMhbReadiness({
  rulesSourceVerified:true,
  extraActiveVerified:true,
  spanishMarketNetworkBindingVerified:true,
  currentAognjp3EurGlobalRowVerified:true,
  sameSessionFreshnessVerified:true,
  currentExtraJackpotEUR:95,
  guaranteedHitAmountEUR:100,
  thresholdWinnerAllocationVerified:false,
  prospectivePassiveValidationPassed:true,
});
assert.equal(nearCap.distanceToGuaranteedHitAmountEUR,5);
assert.equal(nearCap.proximityPct,95);
assert.equal(nearCap.stateIdentityReady,true);
assert.equal(nearCap.readyForEconomicModel,false);
assert.equal(nearCap.positiveEvProven,false);
assert.equal(nearCap.executionCandidate,false);
assert.equal(nearCap.decision,'NO_PLAY');
assert.ok(nearCap.blockers.includes('THRESHOLD_WINNER_ALLOCATION_NOT_VERIFIED'));
assert.equal(nearCap.guards.proximityIsNotProbability,true);
assert.equal(nearCap.guards.distanceIsNotEv,true);

const foreign=evaluateAotgnExtraMhbReadiness({
  rulesSourceVerified:true,
  extraActiveVerified:true,
  spanishMarketNetworkBindingVerified:false,
  currentAognjp3EurGlobalRowVerified:true,
  sameSessionFreshnessVerified:true,
  currentExtraJackpotEUR:95,
  guaranteedHitAmountEUR:100,
  thresholdWinnerAllocationVerified:true,
  prospectivePassiveValidationPassed:true,
});
assert.equal(foreign.stateIdentityReady,false);
assert.equal(foreign.readyForEconomicModel,false);
assert.ok(foreign.blockers.includes('SPANISH_MARKET_NETWORK_BINDING_NOT_VERIFIED'));

const allResearchGates=evaluateAotgnExtraMhbReadiness({
  rulesSourceVerified:true,
  extraActiveVerified:true,
  spanishMarketNetworkBindingVerified:true,
  currentAognjp3EurGlobalRowVerified:true,
  sameSessionFreshnessVerified:true,
  currentExtraJackpotEUR:95,
  guaranteedHitAmountEUR:100,
  thresholdWinnerAllocationVerified:true,
  prospectivePassiveValidationPassed:true,
});
assert.equal(allResearchGates.readyForEconomicModel,true);
assert.equal(allResearchGates.positiveEvProven,false);
assert.equal(allResearchGates.executionCandidate,false);
assert.equal(allResearchGates.decision,'NO_PLAY');
assert.ok(allResearchGates.blockers.includes('ECONOMIC_MODEL_NOT_IMPLEMENTED'));

const stale=evaluateAotgnExtraMhbReadiness({
  rulesSourceVerified:true,
  extraActiveVerified:true,
  spanishMarketNetworkBindingVerified:true,
  currentAognjp3EurGlobalRowVerified:true,
  sameSessionFreshnessVerified:true,
  currentExtraJackpotEUR:101,
  guaranteedHitAmountEUR:100,
});
assert.equal(stale.stateIdentityReady,false);
assert.ok(stale.blockers.includes('CAP_ALREADY_REACHED_OR_STALE_STATE'));

console.log('aotgn-extra-mhb-readiness-v1.test.mjs: PASS');
