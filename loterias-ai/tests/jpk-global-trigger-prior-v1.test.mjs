import assert from 'node:assert/strict';
import {analyzeTriggerPrior,median} from '../casino/jackpots/jpk-global-trigger-prior-v1.mjs';

assert.equal(median([1,3,2]),2);
assert.equal(median([1,2,3,4]),2.5);
const out=analyzeTriggerPrior({
  version:'test',capsGBP:{ROYAL:3500,REGAL:35000},
  wins:[
    {tier:'ROYAL',amountGBP:1929},{tier:'ROYAL',amountGBP:1047},
    {tier:'ROYAL',amountGBP:2261},{tier:'ROYAL',amountGBP:3024},
    {tier:'REGAL',amountGBP:15859}
  ],
  spain:{marketEquivalent:false}
});
assert.deepEqual(out.tiers.ROYAL.positions,[0.299143,0.551143,0.646,0.864]);
assert.equal(out.tiers.ROYAL.n,4);
assert.equal(out.tiers.ROYAL.hazardFitAllowed,false);
assert.equal(out.tiers.REGAL.hazardFitAllowed,false);
assert.equal(out.interpretation.royalPublicSampleDemonstratesEarlyDrops,true);
assert.equal(out.interpretation.nearCapDeterminismRejected,true);
assert.equal(out.interpretation.marketEquivalenceVerified,false);
assert.equal(out.interpretation.economicPromotionAllowed,false);
assert.equal(out.guards.realMoneyAllowed,false);
assert.equal(out.guards.stakeEUR,0);
console.log('jpk-global-trigger-prior-v1.test.mjs PASS');
