import assert from 'node:assert/strict';
import {compareIncidence} from '../casino/jackpots/tiki-cross-venture-incidence-v1.mjs';

const same={rows:[
  {id:'tikitemple2_1',amountEUR:5.06},{id:'tikitemple2_1',amountEUR:5.06},
  {id:'progressivealice1',amountEUR:5.06},{id:'progressivealice1',amountEUR:5.06}
]};
const s=compareIncidence(same,same);
assert.equal(s.anyTargetIncidenceDifference,false);
assert.equal(s.targetComparison.tikitemple2_1.sameRowCount,true);
assert.equal(s.targetComparison.progressivealice1.sameDistinctAmounts,true);

const diff={rows:[
  {id:'tikitemple2_1',amountEUR:5.06},
  {id:'progressivealice1',amountEUR:5.07},{id:'progressivealice1',amountEUR:5.07}
]};
const d=compareIncidence(same,diff);
assert.equal(d.anyTargetIncidenceDifference,true);
assert.equal(d.targetComparison.tikitemple2_1.incidenceDiffers,true);
assert.equal(d.targetComparison.progressivealice1.incidenceDiffers,true);
console.log('tiki-cross-venture-incidence-v1.test.mjs: PASS');
