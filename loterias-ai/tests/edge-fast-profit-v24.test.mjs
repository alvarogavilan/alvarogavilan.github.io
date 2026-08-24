import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JOKERBET_STACK_CANDIDATES_V2,JOKERBET_STACK_TERMS_V2 } from '../edge-backend/src/jokerbet-stack-candidates-v2.mjs';
import { PAF_EXTRA_ROUNDS_CURRENT,screenPafExtraRounds } from '../edge-backend/src/paf-extra-rounds-screen-v1.mjs';

const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v24.mjs','utf8');
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

const codex=JOKERBET_STACK_CANDIDATES_V2.find(x=>x.game==='Codex of Fortune');
assert.ok(codex);
assert.equal(codex.pageRtp,0.98);
assert.equal(codex.minStakeEUR,0.20);
assert.equal(codex.maxStakeEUR,4);
assert.equal(codex.provider,'NetEnt');
assert.equal(codex.currentTitlePageResolved,true);
assert.equal(codex.rulesFingerprintVerified,false);
assert.equal(codex.operatorJackpotEligibilityVerified,false);
assert.equal(codex.operatorJackpotTemperature,null);
assert.equal(codex.bonusBalanceAllowed,false);

assert.equal(JOKERBET_STACK_TERMS_V2.cashbackPlus.rolloverX,50);
assert.match(JOKERBET_STACK_TERMS_V2.cashbackPlus.correction,/casino\/slots PLUS terms require x50/i);

assert.equal(PAF_EXTRA_ROUNDS_CURRENT.qualifyingTurnoverEUR,20);
assert.equal(PAF_EXTRA_ROUNDS_CURRENT.freeSpins,20);
assert.equal(PAF_EXTRA_ROUNDS_CURRENT.freeSpinStakeEUR,0.20);
assert.equal(PAF_EXTRA_ROUNDS_CURRENT.nominalFreeSpinWagerEUR,4);
assert.equal(PAF_EXTRA_ROUNDS_CURRENT.freeSpinWinningsPaidAsRealMoney,true);
assert.equal(PAF_EXTRA_ROUNDS_CURRENT.exactAccountOfferTermsResolved,false);

const unknown=screenPafExtraRounds();
assert.equal(unknown.expectedPromoNetEUR,null);
assert.equal(unknown.positiveEvProven,false);
assert.equal(unknown.executable,false);
assert.ok(unknown.blockers.includes('EXACT_ACCOUNT_OFFER_TERMS_NOT_CAPTURED'));

const illustrative=screenPafExtraRounds({qualifyingGameRtp:0.95,freeSpinGameRtp:0.95});
assert.ok(Math.abs(illustrative.expectedQualifyingLossEUR-1)<1e-12);
assert.ok(Math.abs(illustrative.expectedFreeSpinWinningsEUR-3.8)<1e-12);
assert.ok(Math.abs(illustrative.expectedPromoNetEUR-2.8)<1e-12);
assert.ok(Math.abs(illustrative.breakEvenQualifyingRtpGivenFreeSpinRtp-0.81)<1e-12);
assert.equal(illustrative.positiveEvProven,false);
assert.equal(illustrative.executable,false);

assert.match(wrangler,/"main"\s*:\s*"src\/index-v24\.mjs"/);
assert.ok(worker.includes("edge-sentinel-v24-fast-profit-screens-20260824a"));
assert.ok(worker.includes("path==='/science/fast-profit'"));
assert.ok(worker.includes('publicUnauthenticatedMachineReadableFeedResolved:false'));
assert.ok(worker.includes('realMoneyAllowed:false'));

assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
for(const value of Object.values(contract.verification))assert.equal(value,false);

console.log('edge-fast-profit-v24.test.mjs: PASS');
