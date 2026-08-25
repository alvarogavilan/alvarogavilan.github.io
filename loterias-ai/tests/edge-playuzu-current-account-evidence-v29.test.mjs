import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PLAYUZU_WELCOME_CURRENT_V2,screenPlayuzuWelcomeV2,playuzuCurrentAccountObservedScenario } from '../edge-backend/src/playuzu-welcome-screen-v2.mjs';

const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v29.mjs','utf8');
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

const p=PLAYUZU_WELCOME_CURRENT_V2;
assert.equal(p.promotion.minimumDepositEUR,10);
assert.equal(p.promotion.freeSpins,50);
assert.equal(p.promotion.freeSpinStakeEUR,0.10);
assert.equal(p.promotion.freeSpinNominalTurnoverEUR,5);
assert.equal(p.promotion.freeSpinWinningsPaidRealMoney,true);
assert.equal(p.promotion.freeSpinWinningsRolloverX,0);
assert.equal(p.promotion.specificTermsStateOnlyIndispensableWithdrawalCondition,true);
assert.equal(p.promotion.indispensableWithdrawalCondition,'AT_LEAST_ONE_WAGER_IN_ANOTHER_GAME');
assert.equal(p.rewardPolicy.promotionSpecificTermsOverrideConflictingGeneralRewardPolicy,true);
assert.equal(p.rewardPolicy.welcomeSpecificTermsResolveThirtyDayConflict,true);
assert.equal(p.rewardPolicy.currentConflict,null);

const o=p.currentSameOperatorAccountObservation;
assert.equal(o.operator,'PlayUZU.es');
assert.equal(o.game,'Queen of the Pyramids Mega Cash Collect');
assert.equal(o.reportedRtp,0.9572);
assert.equal(o.welcomeFreeSpinsActivated,50);
assert.equal(o.reportedFreeSpinWinningsEUR,3.42);
assert.equal(o.freeSpinWinningsCreditedToRealBalance,true);
assert.equal(o.realMoneyWithdrawalObserved,true);
assert.equal(o.reportedWithdrawalEUR,35);
assert.equal(o.reportedWithdrawalMethod,'Bizum');
assert.equal(o.officialOperatorRtpFingerprint,false);
assert.equal(o.canPromoteExecution,false);

const exact=screenPlayuzuWelcomeV2();
assert.equal(exact.accountAgePolicyResolvedBySpecificTerms,true);
assert.equal(exact.blockers.includes('WELCOME_VS_30_DAY_POLICY_CONFLICT_UNRESOLVED'),false);
assert.equal(exact.blockers.includes('ACCOUNT_ELIGIBILITY_UNVERIFIED'),true);
assert.equal(exact.blockers.includes('PROMOTION_NOT_CAPTURED_IN_ACCOUNT'),true);
assert.equal(exact.blockers.includes('EXACT_PLAYUZU_QUEEN_RTP_UNRESOLVED'),true);
assert.equal(exact.positiveEvMathematicallyProven,false);
assert.equal(exact.executable,false);
assert.equal(exact.realMoneyAllowed,false);

const observed=playuzuCurrentAccountObservedScenario();
assert.ok(Math.abs(observed.illustrativeExpectedPromoNetEUR-4.78271)<1e-12);
assert.ok(Math.abs(observed.reportedRtpVsWorstCaseBreakEvenMultiple-47.86)<1e-12);
assert.ok(observed.reportedRtpVsExpectedLossBreakEvenMultiple>1454);
assert.equal(observed.realMoneyWithdrawalObserved,true);
assert.equal(observed.exactTargetAccountFingerprintProven,false);
assert.equal(observed.positiveEvForTargetAccountProven,false);
assert.equal(observed.executable,false);
assert.equal(observed.realMoneyAllowed,false);

// v29 is preserved as an immutable historical snapshot - it is no longer
// the deployed entry point (see index-v30.mjs and
// edge-non-promo-only-v30.test.mjs: NON_PROMO_ONLY retires this whole
// research direction at the actual deployed entry), so this file no longer
// asserts wrangler.jsonc points here.
assert.ok(worker.includes("import { EdgeSentinel as V28EdgeSentinel } from './index-v28.mjs'"));
assert.ok(worker.includes('edge-sentinel-v29-playuzu-current-account-evidence-20260824a'));
assert.ok(worker.includes("path==='/science/playuzu-welcome'||path==='/science/playuzu-current-account'"));
assert.ok(worker.includes('promotionSpecificTermsPrecedenceResolved:true'));
assert.ok(worker.includes('sameOperatorCurrentAccountObservation:true'));
assert.ok(worker.includes('realWithdrawalObservation:true'));
assert.ok(worker.includes('pinataPointsV27Preserved:true'));
assert.ok(worker.includes('cgmV28Preserved:true'));

assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
for(const value of Object.values(contract.verification))assert.equal(value,false);

console.log('edge-playuzu-current-account-evidence-v29.test.mjs: PASS');
