import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CGM_CURRENT_PROMOS_V2,screenCgmZeroDepositV2,screenCgmBirthday } from '../edge-backend/src/cgm-promos-screen-v2.mjs';

const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v30.mjs','utf8');
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

const p=CGM_CURRENT_PROMOS_V2;
assert.equal(p.zeroDeposit.depositRequiredEUR,0);
assert.equal(p.zeroDeposit.registrationBonusEUR,30);
assert.equal(p.zeroDeposit.verifiedAccountBonusEUR,30);
assert.equal(p.zeroDeposit.turnoverMultiple,40);
assert.equal(p.zeroDeposit.turnoverPerTrancheEUR,1200);
assert.equal(p.zeroDeposit.maximumGainPerTrancheEUR,30);

assert.equal(p.currentBonusRules.slotsDefaultContributionFraction,1);
assert.equal(p.currentBonusRules.currentNoBonusListIncludesJacksOrBetterRedRake,true);
assert.equal(p.currentBonusRules.currentNoBonusListIncludesBookOf99,true);
assert.equal(p.currentBonusRules.previousV1CandidateInvalidated,true);
assert.equal(p.guards.jacksOrBetterCandidateRevoked,true);
assert.equal(p.guards.bookOf99CandidateRevoked,true);

assert.equal(p.fullOfLuckCandidate.game,'Full Of Luck');
assert.equal(p.fullOfLuckCandidate.publishedRtp,0.9572);
assert.equal(p.fullOfLuckCandidate.publishedMinimumStakeEUR,0.15);
assert.equal(p.fullOfLuckCandidate.publishedMaximumStakeEUR,45);
assert.equal(p.fullOfLuckCandidate.publishedMaximumPrizeMultiplier,1000);
assert.equal(p.fullOfLuckCandidate.exactTitleNotFoundInCurrentPublishedNoBonusList,true);
assert.equal(p.fullOfLuckCandidate.exactTargetAccountBonusAcceptanceCaptured,false);

const zero=screenCgmZeroDepositV2();
assert.equal(zero.rawTurnoverEUR,1200);
assert.ok(Math.abs(zero.expectedGameLossIgnoringRuinEUR-51.36)<1e-9);
assert.ok(Math.abs(zero.meanBalanceAfterRequiredTurnoverIgnoringRuinEUR+21.36)<1e-9);
assert.equal(zero.spinsAtPublishedMinimumStake,8000);
assert.ok(Math.abs(zero.publishedMaxPrizeAtMinimumStakeEUR-150)<1e-12);
assert.equal(zero.publicFinitePositiveCashoutPathExists,true);
assert.equal(zero.conditionalStrictPositiveOwnCapitalEvSignFromPublishedRules,true);
assert.equal(zero.targetAccountPositiveEvProven,false);
assert.equal(zero.positiveEvMagnitudeQuantified,false);
assert.equal(zero.executable,false);
assert.equal(zero.realMoneyAllowed,false);
assert.ok(zero.blockers.includes('ACCOUNT_ELIGIBILITY_UNVERIFIED'));
assert.ok(zero.blockers.includes('FULL_OF_LUCK_BONUS_ACCEPTANCE_NOT_TARGET_ACCOUNT_VERIFIED'));

assert.equal(p.birthday.minimumDepositEUR,10);
assert.equal(p.birthday.bonusRate,1.5);
assert.equal(p.birthday.minimumDepositBonusEUR,15);
assert.equal(p.birthday.turnoverMultipleOnBonus,20);
assert.equal(p.birthday.minimumDepositRequiredTurnoverEUR,300);
assert.equal(p.birthday.freeSpins,10);
assert.equal(p.birthday.freeSpinWinningsTurnoverMultiple,20);

const birthday=screenCgmBirthday();
assert.equal(birthday.depositEUR,10);
assert.equal(birthday.bonusEUR,15);
assert.equal(birthday.requiredTurnoverEUR,300);
assert.equal(birthday.meanBreakEvenRtpBeforeFreeSpins,0.95);
assert.ok(Math.abs(birthday.expectedGameLossIgnoringRuinEUR-12.84)<1e-9);
assert.ok(Math.abs(birthday.meanPromoUpliftBeforeFreeSpinsEUR-2.16)<1e-9);
assert.equal(birthday.conditionalMeanEnvelopePositive,true);
assert.equal(birthday.freeSpins,10);
assert.equal(birthday.freeSpinValueResolved,false);
assert.equal(birthday.ownCapitalExposureUpToEUR,10);
assert.equal(birthday.actualPositiveEvProven,false);
assert.equal(birthday.executable,false);
assert.equal(birthday.realMoneyAllowed,false);

assert.match(wrangler,/"main"\s*:\s*"src\/index-v30\.mjs"/);
assert.ok(worker.includes("import { EdgeSentinel as V29EdgeSentinel } from './index-v29.mjs'"));
assert.ok(worker.includes('edge-sentinel-v30-cgm-birthday-positive-sign-20260824a'));
assert.ok(worker.includes("path==='/science/cgm-birthday'"));
assert.ok(worker.includes('conditionalPositiveSignProof:true'));
assert.ok(worker.includes('playuzuV29Preserved:true'));

assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
for(const value of Object.values(contract.verification))assert.equal(value,false);

console.log('edge-cgm-birthday-positive-sign-v30.test.mjs: PASS');
