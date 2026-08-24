import assert from 'node:assert/strict';
import fs from 'node:fs';

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v15.mjs','utf8');
const bootstrap=fs.readFileSync('loterias-ai/edge-backend/src/spain-eligibility-bootstrap-v1.mjs','utf8');
const ui=fs.readFileSync('loterias-ai/edge-live/edge-library-client-v1.mjs','utf8');
const policy=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-operational-eligibility-policy-v1.json','utf8'));
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

assert.match(wrangler,/"main"\s*:\s*"src\/index-v15\.mjs"/);
assert.ok(worker.includes("edge-sentinel-v15-spain-eligibility-20260824a"));
assert.ok(worker.includes("path==='/eligibility/spain'"));
assert.ok(worker.includes("path==='/eligibility/spain/check'"));
assert.ok(worker.includes("JURISDICTION_NOT_SPAIN"));
assert.ok(worker.includes("LOTTERY_NOT_VERIFIED_SELAE_OR_ONCE_PRODUCT"));
assert.ok(worker.includes("ONLINE_OPERATOR_NOT_VERIFIED_FOR_SPAIN"));
assert.ok(worker.includes("foreignLotteryHistoryRejected:true"));
assert.ok(worker.includes("if(!o)return false"));
assert.ok(worker.includes("if(!g)return false"));
assert.ok(!worker.includes("o.includes(norm(v))"));
assert.ok(bootstrap.includes("gameId:'euromillones'"));
assert.ok(bootstrap.includes("gameId:'eurojackpot'"));
assert.ok(bootstrap.includes("gameId:'eurodreams'"));
assert.ok(!bootstrap.toLowerCase().includes('powerball'));
assert.ok(!bootstrap.toLowerCase().includes('mega millions'));
assert.ok(bootstrap.includes("brand:'Botemanía'"));
assert.ok(bootstrap.includes("brand:'Monopolycasino'"));
assert.ok(ui.includes('BIBLIOTECA ESPAÑA EDGE'));
assert.ok(ui.includes('SPAIN-ONLY'));
assert.ok(ui.includes("jurisdiction:'ES'"));

assert.equal(policy.jurisdiction,'ES');
assert.equal(policy.hardGuards.foreignLotteryHistoricalBackfillExcludedFromOperationalLibrary,true);
assert.equal(policy.hardGuards.lotteryMustBeOfficialSELAEOrONCEProduct,true);
assert.equal(policy.hardGuards.onlineOperatorMustBeDGOJLicensed,true);
assert.equal(policy.hardGuards.legalEligibilityDoesNotImplyPositiveEV,true);
assert.equal(policy.hardGuards.executionContractRemainsSoleGreenAuthority,true);
for(const x of policy.foreignLotteryExamplesExcluded)assert.equal(x.eligible,false);
assert.ok(policy.internationalProductsPlayableInSpainExamples.some(x=>x.game==='Eurojackpot'&&x.eligible));

assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);

console.log('edge-spain-eligibility-v15.test.mjs: PASS');
