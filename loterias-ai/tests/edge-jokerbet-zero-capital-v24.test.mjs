import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JOKERBET_STACK_CANDIDATES,JOKERBET_STACK_TERMS } from '../edge-backend/src/jokerbet-stack-candidates-v1.mjs';
import { buildJokerbetStackResearch } from '../edge-backend/src/jokerbet-stack-core-v1.mjs';
import { JOKERBET_ZERO_CAPITAL_PROMOS_V1,buildJokerbetZeroCapitalPromoResearch } from '../edge-backend/src/jokerbet-zero-capital-promos-v1.mjs';

const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v24.mjs','utf8');
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

const codex=JOKERBET_STACK_CANDIDATES.find(x=>x.game==='Codex of Fortune');
assert.ok(codex);
assert.equal(codex.pageRtp,0.98);
assert.equal(codex.bonusBalanceAllowed,false);
assert.equal(codex.operatorJackpotEligibilityVerified,false);
assert.equal(codex.operatorJackpotTemperature,null);

const stack=buildJokerbetStackResearch(JOKERBET_STACK_CANDIDATES,JOKERBET_STACK_TERMS);
assert.equal(stack.leaderBySmallestDeclaredGap.game,'Codex of Fortune');
assert.ok(Math.abs(stack.leaderBySmallestDeclaredGap.verifiedGapToOne-0.02)<1e-12);
assert.equal(JOKERBET_STACK_TERMS.cashbackPlus.rolloverCasinoSlotsX,50);
assert.equal(JOKERBET_STACK_TERMS.cashbackPlus.rolloverSportsX,10);
assert.equal(JOKERBET_STACK_TERMS.cashbackPlus.fixedRtpIncrement,false);

const p=JOKERBET_ZERO_CAPITAL_PROMOS_V1;
assert.equal(p.noDepositRegistration.depositRequiredEUR,0);
assert.equal(p.noDepositRegistration.ownCapitalRequiredToClaimEUR,0);
assert.equal(p.noDepositRegistration.nominalComboEUR,30);
assert.equal(p.noDepositRegistration.casinoSlotsRolloverX,80);
assert.equal(p.noDepositRegistration.sportsRolloverX,20);
assert.equal(p.noDepositRegistration.maxRealConversionTotalEUR,30);
assert.equal(p.noDepositRegistration.positiveCashExpectedValueProven,false);
assert.equal(p.clubWelcome.joinJokercoins,700);
assert.equal(p.clubWelcome.cheapestObservedSlotsReward.jokercoins,650);
assert.equal(p.clubWelcome.cheapestObservedSlotsReward.bonusEUR,5);
assert.equal(p.clubWelcome.rewardSpecificRolloverVerified,false);
assert.equal(p.clubWelcome.rewardCashEquivalentVerified,false);
const promo=buildJokerbetZeroCapitalPromoResearch();
assert.equal(promo.derived.clubCanNominallyRedeemWelcomeReward,true);
assert.equal(promo.derived.clubJokercoinsLeftAfterCheapestReward,50);
assert.equal(promo.derived.executableCashProfitSignal,false);
assert.equal(promo.decision.wagerRealMoney,false);
assert.equal(promo.decision.realMoneyAllowed,false);

assert.match(wrangler,/"main"\s*:\s*"src\/index-v24\.mjs"/);
assert.ok(worker.includes("edge-sentinel-v24-jokerbet-zero-capital-promos-20260824a"));
assert.ok(worker.includes("path==='/science/jokerbet-promos'"));
assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
console.log('edge-jokerbet-zero-capital-v24.test.mjs: PASS');
