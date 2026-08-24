import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JOKERBET_STACK_CANDIDATES,JOKERBET_STACK_TERMS } from '../edge-backend/src/jokerbet-stack-candidates-v1.mjs';
import { buildJokerbetStackResearch,screenJokerbetCandidate } from '../edge-backend/src/jokerbet-stack-core-v1.mjs';

const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(Number(a)-Number(b))<=tol,`${a} != ${b}`);
const r=buildJokerbetStackResearch(JOKERBET_STACK_CANDIDATES,JOKERBET_STACK_TERMS);
assert.equal(r.version,'edge-jokerbet-stack-lab-v1.1-current-terms');
assert.equal(r.rows.length,5);
assert.equal(r.leaderBySmallestDeclaredGap.game,'4 Cash Planes Multiplayer');
assert.equal(r.leaderWithVerifiedSuperHotOperatorJackpot.game,'Break Da Bank Again Megaways');

const golf=r.rows.find(x=>x.game==='Cashybara Golf');
close(golf.declaredGameReturnForScreen,0.97);
close(golf.verifiedGapToOne,0.03);
assert.equal(golf.operatorJackpotEligibilityVerified,false);
assert.equal(golf.operatorJackpotTemperature,null);
assert.ok(golf.blockers.includes('OPERATOR_JACKPOT_ELIGIBILITY_OR_TEMPERATURE_UNRESOLVED'));

const cash=r.rows.find(x=>x.game==='4 Cash Planes Multiplayer');
close(cash.declaredGameReturnForScreen,0.9728);
close(cash.verifiedGapToOne,0.0272);
assert.equal(cash.operatorJackpotEligibilityVerified,false);
assert.ok(cash.blockers.includes('OPERATOR_JACKPOT_ELIGIBILITY_OR_TEMPERATURE_UNRESOLVED'));
assert.equal(cash.positiveEvProven,false);
assert.equal(cash.executable,false);

const breakDa=r.rows.find(x=>x.game==='Break Da Bank Again Megaways');
close(breakDa.declaredGameReturnForScreen,0.9615);
close(breakDa.verifiedGapToOne,0.0385);
assert.equal(breakDa.operatorJackpotTemperature,'SUPER_HOT');
assert.equal(breakDa.operatorJackpotEligibilityVerified,true);
assert.ok(!breakDa.blockers.includes('OPERATOR_JACKPOT_ELIGIBILITY_OR_TEMPERATURE_UNRESOLVED'));
assert.ok(breakDa.blockers.includes('OPERATOR_JACKPOT_EXPECTED_RETURN_UNKNOWN'));

assert.equal(JOKERBET_STACK_TERMS.cashbackOne.lossFraction,0.10);
assert.equal(JOKERBET_STACK_TERMS.cashbackOne.rolloverX,1);
assert.equal(JOKERBET_STACK_TERMS.cashbackPlus.lossFraction,0.30);
assert.equal(JOKERBET_STACK_TERMS.cashbackPlus.rolloverX,10);
assert.equal(r.guards.cashbackCannotBeAddedAsFixedPercentagePoints,true);
assert.equal(r.guards.cashbackOneAndPlusCannotBeAddedTogether,true);
assert.equal(r.guards.estimatedOroAmountIsNotHardCap,true);
assert.equal(r.guards.clubFaceValueCannotBeAddedWithoutConversionTerms,true);
assert.equal(r.guards.realMoneyAllowed,false);

const hypothetical=screenJokerbetCandidate(cash,JOKERBET_STACK_TERMS);
assert.equal(hypothetical.clubIncludedInVerifiedReturn,false);
assert.ok(hypothetical.hypotheticalGapIfClubFaceWereCashEquivalent < hypothetical.verifiedGapToOne);
assert.equal(hypothetical.verifiedStackReturn,0.9728);

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v22.mjs','utf8');
const ui=fs.readFileSync('loterias-ai/edge-live/edge-jokerbet-stack-client-v1.mjs','utf8');
const loader=fs.readFileSync('loterias-ai/edge-live/edge-live-ux-v1.mjs','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));
assert.match(wrangler,/"main"\s*:\s*"src\/index-v22\.mjs"/);
assert.ok(worker.includes('edge-sentinel-v22-jokerbet-current-terms-20260824a'));
assert.ok(ui.includes('Cashback actual: ONE'));
assert.ok(ui.includes('NO se suman entre sí'));
assert.ok(loader.includes("import './edge-jokerbet-stack-client-v1.mjs'"));
assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
console.log('edge-jokerbet-stack-v22.test.mjs: PASS');
