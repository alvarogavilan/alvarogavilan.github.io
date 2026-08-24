import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PINATA_POINTS_CURRENT,nearestEuroPayoutInterval,pinataLevelTable,screenPinataPoints,screenPinataSlotStack } from '../edge-backend/src/pinata-points-screen-v1.mjs';

const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v27.mjs','utf8');
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

assert.equal(PINATA_POINTS_CURRENT.cashEURPerPoints.cashEUR,1);
assert.equal(PINATA_POINTS_CURRENT.cashEURPerPoints.points,1000);
assert.equal(PINATA_POINTS_CURRENT.slotGameMultiplier,1);
assert.equal(PINATA_POINTS_CURRENT.claimWindowDays,7);
assert.equal(PINATA_POINTS_CURRENT.levels.length,9);
assert.equal(PINATA_POINTS_CURRENT.levels.find(x=>x.level===8).multiplier,2);
assert.equal(PINATA_POINTS_CURRENT.levels.find(x=>x.level===8).multiplierVerified,true);
assert.equal(PINATA_POINTS_CURRENT.levels.find(x=>x.level===9).multiplierVerified,false);

const levels=pinataLevelTable();
assert.equal(levels.find(x=>x.level===1).continuousSlotCashReturnPct,0.05);
assert.equal(levels.find(x=>x.level===2).continuousSlotCashReturnPct,0.1);
assert.equal(levels.find(x=>x.level===8).continuousSlotCashReturnPct,0.2);
assert.equal(levels.find(x=>x.level===9).continuousSlotCashReturnPct,null);

assert.deepEqual(nearestEuroPayoutInterval(499),{rawEUR:0.499,minEUR:0,maxEUR:0,tie:false});
assert.deepEqual(nearestEuroPayoutInterval(500),{rawEUR:0.5,minEUR:0,maxEUR:1,tie:true});
assert.deepEqual(nearestEuroPayoutInterval(501),{rawEUR:0.501,minEUR:1,maxEUR:1,tie:false});
assert.deepEqual(nearestEuroPayoutInterval(1500),{rawEUR:1.5,minEUR:1,maxEUR:2,tie:true});

const l1=screenPinataPoints({weeklyTurnoverEUR:1002,level:1,category:'SLOTS'});
assert.equal(l1.calculatedPoints,501);
assert.equal(l1.weeklyCashPayoutMinEUR,1);
assert.equal(l1.weeklyCashPayoutMaxEUR,1);
assert.equal(l1.exactCashPayoutKnown,true);
const l2=screenPinataPoints({weeklyTurnoverEUR:501,level:2,category:'SLOTS'});
assert.equal(l2.calculatedPoints,501);
assert.equal(l2.weeklyCashPayoutMinEUR,1);
assert.ok(l2.effectiveCashReturnMinFraction>0.0019);
const tie=screenPinataPoints({weeklyTurnoverEUR:1000,level:1,category:'SLOTS'});
assert.equal(tie.exactCashPayoutKnown,false);
assert.equal(tie.weeklyCashPayoutMinEUR,0);
assert.equal(tie.weeklyCashPayoutMaxEUR,1);

const stack=screenPinataSlotStack({weeklyTurnoverEUR:501,level:2,gameRtp:0.999,gameRtpVerified:true});
assert.ok(stack.expectedStackNetMinEUR>0);
assert.equal(stack.conditionalPositiveEvLowerBound,true);
assert.equal(stack.positiveEvProven,false);
assert.equal(stack.realMoneyAllowed,false);

assert.match(wrangler,/"main"\s*:\s*"src\/index-v27\.mjs"/);
assert.ok(worker.includes("edge-sentinel-v27-pinata-points-cash-stack-20260824a"));
assert.ok(worker.includes("path==='/science/pinata-points'"));
assert.ok(worker.includes('pafGroupPromoLabV26Preserved:true'));
assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
for(const v of Object.values(contract.verification))assert.equal(v,false);
console.log('edge-pinata-points-v27.test.mjs: PASS');
