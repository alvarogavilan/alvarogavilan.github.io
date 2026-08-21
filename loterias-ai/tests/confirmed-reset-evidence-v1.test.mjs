import assert from 'node:assert/strict';
import { normalizeConfirmedResetEvidence, promoteStableDropEvent, confirmedResetSummary } from '../casino/jackpots/confirmed-reset-evidence-v1.mjs';

const fixture={
  workflowRunId:123,
  target:{network:'generic',id:'pool1'},
  baseline:{observedAt:'2026-08-21T10:15:31.717Z',amountEUR:1818.6,identityClass:'EXACT_NETWORK_PLUS_UNIQUE_ID',identityExact:true},
  confirmationSamples:[
    {observedAt:'2026-08-21T10:29:46.581Z',httpStatus:200,uniqueIdentityInSnapshot:true,targetDistinctAmounts:[41.03]},
    {observedAt:'2026-08-21T10:29:49.813Z',httpStatus:200,uniqueIdentityInSnapshot:true,targetDistinctAmounts:[41.03]},
  ],
  transition:{dropFraction:0.977439,classification:'CONFIRMED_RESET_OF_STABLE_FEED_ID'},
  inference:{meterResetConfirmed:true,postResetSeedUpperBoundEUR:41.03},
  guards:{noResetEqualsJackpotWin:true,noPostResetEqualsExactSeed:true,noTriggerAttribution:true}
};

{
  const c=normalizeConfirmedResetEvidence(fixture,{sourceFile:'evidence/pool1.json'});
  assert.ok(c);
  assert.equal(c.trackKey,'generic:pool1');
  assert.equal(c.baselineEUR,1818.6);
  assert.equal(c.postResetUpperBoundEUR,41.03);
  assert.equal(c.jackpotWinConfirmed,false);
  assert.equal(c.seedPointEstimateEUR,null);
  assert.equal(c.economicPromotionAllowed,false);
}

{
  const broken=structuredClone(fixture);
  broken.confirmationSamples=broken.confirmationSamples.slice(0,1);
  assert.equal(normalizeConfirmedResetEvidence(broken),null,'one sample must never confirm reset');
}

{
  const broken=structuredClone(fixture);
  broken.baseline.identityExact=false;
  assert.equal(normalizeConfirmedResetEvidence(broken),null,'non-exact baseline identity must fail closed');
}

{
  const c=normalizeConfirmedResetEvidence(fixture,{sourceFile:'evidence/pool1.json'});
  const event={
    trackKey:'generic:pool1',id:'pool1',network:'generic',
    previousEUR:1818.6,currentEUR:55,dropEUR:1763.6,dropFraction:0.96976,
    identityClass:'EXACT_NETWORK_PLUS_UNIQUE_ID',classification:'UNCLASSIFIED_DROP_CANDIDATE',economicPromotionAllowed:false
  };
  const p=promoteStableDropEvent(event,[c]);
  assert.equal(p.classification,'CONFIRMED_METER_RESET');
  assert.equal(p.jackpotWinConfirmed,false);
  assert.equal(p.triggeringGameKnown,false);
  assert.equal(p.triggeringTierKnown,false);
  assert.equal(p.seedPointEstimateEUR,null);
  assert.equal(p.economicPromotionAllowed,false);
  assert.equal(p.realMoneyAllowed,false);
}

{
  const c=normalizeConfirmedResetEvidence(fixture);
  const wrongBaseline={trackKey:'generic:pool1',id:'pool1',network:'generic',previousEUR:900,currentEUR:40,identityClass:'EXACT_NETWORK_PLUS_UNIQUE_ID',classification:'UNCLASSIFIED_DROP_CANDIDATE'};
  assert.equal(promoteStableDropEvent(wrongBaseline,[c]).classification,'UNCLASSIFIED_DROP_CANDIDATE','confirmation must bind to exact prior baseline');
}

{
  const c=normalizeConfirmedResetEvidence(fixture);
  const wrongId={trackKey:'generic:other',id:'other',network:'generic',previousEUR:1818.6,currentEUR:40,identityClass:'EXACT_NETWORK_PLUS_UNIQUE_ID',classification:'UNCLASSIFIED_DROP_CANDIDATE'};
  assert.equal(promoteStableDropEvent(wrongId,[c]).classification,'UNCLASSIFIED_DROP_CANDIDATE','confirmation must never cross-contaminate another ID');
}

{
  const c=normalizeConfirmedResetEvidence(fixture);
  const s=confirmedResetSummary([c]);
  assert.equal(s.count,1);
  assert.equal(s.latest.trackKey,'generic:pool1');
}

console.log('confirmed-reset-evidence-v1.test.mjs: PASS');
