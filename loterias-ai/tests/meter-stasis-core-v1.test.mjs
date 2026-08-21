import assert from 'node:assert/strict';
import { updateMeterStasis, dynamicFreshnessForMeter } from '../edge-live/meter-stasis-core-v1.mjs';

const key='generic:WAGER_BET';
const sample=(amount)=>({[key]:{network:'generic',id:'WAGER_BET',amountEUR:amount}});

const first=updateMeterStasis({previous:null,currentByKey:sample(3448.25),observedAt:'2026-08-21T00:00:00.000Z'});
assert.equal(first.meters[key].dynamicMovementObserved,false);
assert.equal(first.meters[key].stasisSeconds,0);
assert.equal(dynamicFreshnessForMeter(first.meters[key]).verified,false);
assert.equal(dynamicFreshnessForMeter(first.meters[key]).reason,'DYNAMIC_MOVEMENT_NOT_YET_OBSERVED');

const same=updateMeterStasis({previous:{meters:first.meters},currentByKey:sample(3448.25),observedAt:'2026-08-21T00:10:00.000Z'});
assert.equal(same.meters[key].dynamicMovementObserved,false);
assert.equal(same.meters[key].stasisSeconds,600);
assert.equal(same.meters[key].changeCount,0);

const moved=updateMeterStasis({previous:{meters:same.meters},currentByKey:sample(3448.26),observedAt:'2026-08-21T00:11:00.000Z'});
assert.equal(moved.meters[key].dynamicMovementObserved,true);
assert.equal(moved.meters[key].lastChangedAt,'2026-08-21T00:11:00.000Z');
assert.equal(moved.meters[key].stasisSeconds,0);
assert.equal(moved.meters[key].changeCount,1);
assert.equal(dynamicFreshnessForMeter(moved.meters[key],{maxStasisSeconds:1800}).verified,true);

const old=updateMeterStasis({previous:{meters:moved.meters},currentByKey:sample(3448.26),observedAt:'2026-08-21T00:42:00.000Z'});
const oldFreshness=dynamicFreshnessForMeter(old.meters[key],{maxStasisSeconds:1800});
assert.equal(old.meters[key].stasisSeconds,1860);
assert.equal(oldFreshness.verified,false);
assert.equal(oldFreshness.reason,'NO_RECENT_DYNAMIC_MOVEMENT');

console.log('meter-stasis-core-v1.test.mjs: PASS');
