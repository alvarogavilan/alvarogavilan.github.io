import assert from 'node:assert/strict';
import {screenAotgLiveRoulette,requiredHazardForWeightedAward,requiredWeightedAwardForHazard} from '../edge-backend/src/aotg-live-roulette-ev-screen-v1.mjs';
const tiers=[{tier:'Power',amountEUR:50,conditionalProbability:.7},{tier:'Extra',amountEUR:500,conditionalProbability:.2},{tier:'Super',amountEUR:5000,conditionalProbability:.09},{tier:'Ultimate',amountEUR:100000,conditionalProbability:.01}];
let r=screenAotgLiveRoulette({accountingMode:'JACKPOT_SURCHARGE_ADDED_TO_TABLE_STAKE',accountingModeVerified:true,tableStakeEUR:1,baseRouletteRtpPct:97.3,jackpotSurchargeRatePct:.99,triggerProbabilityPerRound:.0001,triggerProbabilityVerified:true,tiers});
assert.equal(r.ok,true);assert.equal(r.metrics.totalCostEUR,1.0099);assert.equal(r.execution.realMoneyAllowed,false);assert.ok(r.metrics.breakEvenTriggerProbabilityPerRound>0);assert.equal(r.practiceVerdict,'POSITIVE_IN_PRACTICE_REQUIRES_PROSPECTIVE_HOLDOUT');
r=screenAotgLiveRoulette({accountingMode:'JACKPOT_SURCHARGE_ADDED_TO_TABLE_STAKE',accountingModeVerified:false,tableStakeEUR:1,baseRouletteRtpPct:97.3,jackpotSurchargeRatePct:.99,tiers});assert.equal(r.ok,false);assert.equal(r.reason,'ACCOUNTING_MODE_NOT_VERIFIED');
r=requiredHazardForWeightedAward({tableStakeEUR:1,baseRouletteRtpPct:97.3,jackpotSurchargeRatePct:.99,weightedConditionalJackpotAwardEUR:1000});assert.ok(r.metrics.requiredTriggerProbabilityPerRound>0);assert.equal(r.execution.decision,'NO_PLAY');
r=requiredWeightedAwardForHazard({tableStakeEUR:1,baseRouletteRtpPct:97.3,jackpotSurchargeRatePct:.99,triggerProbabilityPerRound:.0001});assert.ok(r.metrics.requiredWeightedConditionalJackpotAwardEUR>0);
console.log('aotg-live-roulette-ev-screen-v1.test.mjs: PASS');
