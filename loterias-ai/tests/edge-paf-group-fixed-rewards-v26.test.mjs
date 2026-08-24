import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT,screenFixedRealMoneyReward } from '../edge-backend/src/paf-group-fixed-reward-screen-v1.mjs';

const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v26.mjs','utf8');
const v25=fs.readFileSync('loterias-ai/edge-backend/src/index-v25.mjs','utf8');
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

assert.equal(GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.qualifyingTurnoverEUR,50);
assert.equal(GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.fixedRewardEUR,5);
assert.equal(GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.rewardClass,'REAL_MONEY');
assert.equal(GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.rewardClassSemanticsVerified,true);
assert.equal(GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.rewardWithdrawable,true);
assert.equal(GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.rewardReleaseTurnoverRequired,false);
assert.equal(GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.exactQualifyingGameResolved,false);
assert.equal(GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.groupSafetyFacts.promotionIndependenceAcrossBrandsVerified,false);

const unresolved=screenFixedRealMoneyReward();
assert.ok(Math.abs(unresolved.breakEvenQualifyingRtp-0.90)<1e-12);
assert.equal(unresolved.conditionalExpectedPromoNetEUR,null);
assert.equal(unresolved.positiveEvProven,false);
assert.equal(unresolved.reproduciblePositiveEvProven,false);
assert.equal(unresolved.executable,false);

const illustrative95=screenFixedRealMoneyReward({qualifyingGameRtp:0.95,qualifyingGameRtpResolved:true});
assert.ok(Math.abs(illustrative95.expectedQualifyingLossEUR-2.5)<1e-12);
assert.ok(Math.abs(illustrative95.conditionalExpectedPromoNetEUR-2.5)<1e-12);
assert.equal(illustrative95.positiveEvProven,false);

assert.ok(v25.includes("edge-sentinel-v25-zero-capital-promos-20260824a"));
assert.ok(v25.includes('zeroCapitalLanes'));
assert.ok(worker.includes("import { EdgeSentinel as V25EdgeSentinel } from './index-v25.mjs'"));
assert.ok(worker.includes("edge-sentinel-v26-paf-group-fixed-rewards-20260824a"));
assert.ok(worker.includes("path==='/science/paf-group-promos'"));
assert.ok(worker.includes('zeroCapitalLanesPreserved:true'));
assert.match(wrangler,/"main"\s*:\s*"src\/index-v26\.mjs"/);

assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
for(const value of Object.values(contract.verification))assert.equal(value,false);
console.log('edge-paf-group-fixed-rewards-v26.test.mjs: PASS');
