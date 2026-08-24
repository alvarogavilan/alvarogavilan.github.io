import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PLAYUZU_WELCOME_CURRENT,screenPlayuzuWelcome,playuzuExternalScenarioScreens } from '../edge-backend/src/playuzu-welcome-screen-v1.mjs';
import { CGM_ZERO_DEPOSIT_CURRENT,screenCgmZeroDeposit,cgmExternalVideoPokerScenario } from '../edge-backend/src/cgm-zero-deposit-screen-v1.mjs';

const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v28.mjs','utf8');
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

assert.equal(PLAYUZU_WELCOME_CURRENT.promotion.minimumDepositEUR,10);
assert.equal(PLAYUZU_WELCOME_CURRENT.promotion.freeSpins,50);
assert.equal(PLAYUZU_WELCOME_CURRENT.promotion.freeSpinStakeEUR,0.10);
assert.equal(PLAYUZU_WELCOME_CURRENT.promotion.freeSpinNominalTurnoverEUR,5);
assert.equal(PLAYUZU_WELCOME_CURRENT.promotion.freeSpinWinningsPaidRealMoney,true);
assert.equal(PLAYUZU_WELCOME_CURRENT.promotion.freeSpinWinningsRolloverX,0);
assert.equal(PLAYUZU_WELCOME_CURRENT.ownMoneyWagerCandidate.publishedMinimumStakeEUR,0.10);
assert.equal(PLAYUZU_WELCOME_CURRENT.ownMoneyWagerCandidate.publishedTheoreticalRtp,0.9671);
assert.equal(PLAYUZU_WELCOME_CURRENT.freeSpinConfiguration.exactPlayuzuRtp,null);

const uzu=screenPlayuzuWelcome();
assert.ok(Math.abs(uzu.ownExpectedLossEUR-0.00329)<1e-12);
assert.ok(Math.abs(uzu.breakEvenFreeSpinRtpUsingOwnPublishedRtp-0.000658)<1e-12);
assert.equal(uzu.breakEvenFreeSpinRtpWorstCaseOwnWager,0.02);
assert.equal(uzu.positiveEvMathematicallyProven,false);
assert.equal(uzu.executable,false);
assert.equal(uzu.realMoneyAllowed,false);
assert.ok(uzu.blockers.includes('EXACT_PLAYUZU_QUEEN_RTP_UNRESOLVED'));

const uzuIllustrative=screenPlayuzuWelcome({freeSpinGameRtp:0.9097,freeSpinRulesFingerprintVerified:false});
assert.ok(uzuIllustrative.expectedPromoNetEUR>4.54);
assert.equal(uzuIllustrative.positiveEvMathematicallyProven,false);
assert.equal(playuzuExternalScenarioScreens().every(x=>x.samePlayuzuConfigurationProven===false&&x.executable===false),true);

assert.equal(CGM_ZERO_DEPOSIT_CURRENT.promotion.depositRequiredEUR,0);
assert.equal(CGM_ZERO_DEPOSIT_CURRENT.promotion.totalNominalBonusEUR,60);
assert.equal(CGM_ZERO_DEPOSIT_CURRENT.promotion.turnoverMultiple,40);
assert.equal(CGM_ZERO_DEPOSIT_CURRENT.promotion.turnoverPerTrancheEUR,1200);
assert.equal(CGM_ZERO_DEPOSIT_CURRENT.promotion.maximumGainPerTrancheEUR,30);
assert.equal(CGM_ZERO_DEPOSIT_CURRENT.generalBonusTerms.defaultContributionFraction,1);
assert.equal(CGM_ZERO_DEPOSIT_CURRENT.generalBonusTerms.blackjackContributionFraction,0.15);
assert.equal(CGM_ZERO_DEPOSIT_CURRENT.generalBonusTerms.rouletteNonLowRiskContributionFraction,0.25);
assert.equal(CGM_ZERO_DEPOSIT_CURRENT.generalBonusTerms.rouletteLowRiskCoverageInvalid,true);

const cgm=screenCgmZeroDeposit();
assert.equal(cgm.monetaryDownsideOwnCapitalEUR,0);
assert.equal(cgm.nonNegativeClaimValueByConstruction,true);
assert.equal(cgm.rawTurnoverEUR,1200);
assert.equal(cgm.meanSurvivalBreakEvenRtp,0.975);
assert.equal(cgm.strictPositiveMonetaryEvSignFromPositiveCashoutProbability,false);
assert.equal(cgm.positiveCashoutProbabilityDefinition,'P(withdrawable cash after all promotion requirements > 0)');
assert.equal(cgm.expectedCashProfitEUR,null);
assert.equal(cgm.expectedCashProfitMagnitudeRequiresTerminalCashoutDistribution,true);
assert.equal(cgm.executable,false);
assert.equal(cgm.realMoneyAllowed,false);

const cgmExternal=screenCgmZeroDeposit({gameRtp:0.9955,contributionFraction:1});
assert.ok(Math.abs(cgmExternal.expectedGameLossIgnoringRuinEUR-5.4)<1e-9);
assert.ok(Math.abs(cgmExternal.meanBalanceAfterRequiredTurnoverIgnoringRuinEUR-24.6)<1e-9);
assert.equal(cgmExternal.positiveEvMagnitudeQuantified,false);
assert.equal(cgmExternal.strictPositiveMonetaryEvSignFromPositiveCashoutProbability,false);
assert.equal(cgmExternalVideoPokerScenario().sameCgmConfigurationProven,false);

const cgmPositiveSign=screenCgmZeroDeposit({positiveCashoutProbability:0.01});
assert.equal(cgmPositiveSign.strictPositiveMonetaryEvSignFromPositiveCashoutProbability,true);
assert.equal(cgmPositiveSign.executable,false);

assert.match(wrangler,/"main"\s*:\s*"src\/index-v28\.mjs"/);
assert.ok(worker.includes("import { EdgeSentinel as V27EdgeSentinel } from './index-v27.mjs'"));
assert.ok(worker.includes('edge-sentinel-v28-playuzu-cgm-fast-profit-20260824a'));
assert.ok(worker.includes('/science/playuzu-welcome'));
assert.ok(worker.includes('/science/cgm-zero-deposit'));
assert.ok(worker.includes('/science/pinata-points'));
assert.ok(worker.includes('pinataPointsV27Preserved:true'));
assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
for(const value of Object.values(contract.verification))assert.equal(value,false);

console.log('edge-playuzu-cgm-v28.test.mjs: PASS');
