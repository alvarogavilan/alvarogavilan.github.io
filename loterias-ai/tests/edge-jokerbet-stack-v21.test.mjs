import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JOKERBET_STACK_CANDIDATES,JOKERBET_STACK_TERMS } from '../edge-backend/src/jokerbet-stack-candidates-v1.mjs';
import { buildJokerbetStackResearch,screenJokerbetCandidate } from '../edge-backend/src/jokerbet-stack-core-v1.mjs';

const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(Number(a)-Number(b))<=tol,`${a} != ${b}`);
const r=buildJokerbetStackResearch(JOKERBET_STACK_CANDIDATES,JOKERBET_STACK_TERMS);
assert.equal(r.version,'edge-jokerbet-stack-lab-v1');
assert.equal(r.rows.length,4);
assert.equal(r.leaderBySmallestDeclaredGap.game,'4 Cash Planes Multiplayer');
assert.equal(r.leaderWithVerifiedSuperHotOperatorJackpot.game,'Break Da Bank Again Megaways');

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
assert.equal(r.guards.cashbackCannotBeAddedAsTenPercentagePoints,true);
assert.equal(r.guards.clubFaceValueCannotBeAddedWithoutConversionTerms,true);
assert.equal(r.guards.realMoneyAllowed,false);

const hypothetical=screenJokerbetCandidate(JOKERBET_STACK_CANDIDATES[0],JOKERBET_STACK_TERMS);
assert.equal(hypothetical.clubIncludedInVerifiedReturn,false);
assert.ok(hypothetical.hypotheticalGapIfClubFaceWereCashEquivalent < hypothetical.verifiedGapToOne);
assert.equal(hypothetical.verifiedStackReturn,0.9728);

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v21.mjs','utf8');
const ui=fs.readFileSync('loterias-ai/edge-live/edge-jokerbet-stack-client-v1.mjs','utf8');
const loader=fs.readFileSync('loterias-ai/edge-live/edge-live-ux-v1.mjs','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));
assert.match(wrangler,/"main"\s*:\s*"src\/index-v21\.mjs"/);
assert.ok(worker.includes('edge-sentinel-v21-jokerbet-stack-lab-20260824a'));
assert.ok(worker.includes("path==='/science/jokerbet-stack'"));
assert.ok(ui.includes('¿Cuánto retorno falta para 100%?'));
assert.ok(loader.includes("import './edge-jokerbet-stack-client-v1.mjs'"));
assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
console.log('edge-jokerbet-stack-v21.test.mjs: PASS');
