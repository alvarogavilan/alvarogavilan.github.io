import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JOKERBET_ZERO_CAPITAL_PROMOS_V1,buildJokerbetZeroCapitalPromoResearch } from '../edge-backend/src/jokerbet-zero-capital-promos-v1.mjs';

const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v25.mjs','utf8');
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

const p=JOKERBET_ZERO_CAPITAL_PROMOS_V1;
assert.equal(p.noDepositRegistration.depositRequiredEUR,0);
assert.equal(p.noDepositRegistration.ownCapitalRequiredToClaimEUR,0);
assert.equal(p.noDepositRegistration.nominalComboEUR,30);
assert.equal(p.noDepositRegistration.bonusEUR,20);
assert.equal(p.noDepositRegistration.freePlayEUR,10);
assert.equal(p.noDepositRegistration.casinoSlotsRolloverX,80);
assert.equal(p.noDepositRegistration.casinoSlotsRequiredTurnoverOnBonusEUR,1600);
assert.equal(p.noDepositRegistration.maxRealConversionTotalEUR,30);
assert.equal(p.noDepositRegistration.repeatablePerUser,false);
assert.equal(p.noDepositRegistration.positiveCashExpectedValueProven,false);

assert.equal(p.clubWelcome.joinJokercoins,700);
assert.equal(p.clubWelcome.dailyFirstLoginJokercoins,20);
assert.equal(p.clubWelcome.cheapestObservedSlotsReward.jokercoins,650);
assert.equal(p.clubWelcome.cheapestObservedSlotsReward.bonusEUR,5);
assert.equal(p.clubWelcome.ownCapitalRequiredToReceiveJoinCoinsEUR,0);
assert.equal(p.clubWelcome.wagerRequiredToReceiveJoinCoinsEUR,0);
assert.equal(p.clubWelcome.rewardSpecificRolloverVerified,false);
assert.equal(p.clubWelcome.rewardCashEquivalentVerified,false);

const research=buildJokerbetZeroCapitalPromoResearch();
assert.equal(research.derived.noDepositOwnCapitalAtRiskEUR,0);
assert.equal(research.derived.clubCanNominallyRedeemWelcomeReward,true);
assert.equal(research.derived.clubWelcomeNominalRewardEUR,5);
assert.equal(research.derived.clubJokercoinsLeftAfterCheapestReward,50);
assert.equal(research.derived.executableCashProfitSignal,false);
assert.equal(research.decision.wagerRealMoney,false);
assert.equal(research.decision.realMoneyAllowed,false);

assert.match(wrangler,/"main"\s*:\s*"src\/index-v25\.mjs"/);
assert.ok(worker.includes("import { EdgeSentinel as V24EdgeSentinel } from './index-v24.mjs'"));
assert.ok(worker.includes("edge-sentinel-v25-zero-capital-promos-20260824a"));
assert.ok(worker.includes("path==='/science/jokerbet-promos'"));
assert.ok(worker.includes("zeroCapitalLanes"));

assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
for(const value of Object.values(contract.verification))assert.equal(value,false);
console.log('edge-zero-capital-promos-v25.test.mjs: PASS');
