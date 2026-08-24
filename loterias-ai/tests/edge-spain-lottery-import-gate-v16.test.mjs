import assert from 'node:assert/strict';
import fs from 'node:fs';

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v16.mjs','utf8');
const universe=fs.readFileSync('loterias-ai/edge-backend/src/spain-playable-universe-v1.mjs','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

assert.match(wrangler,/"main"\s*:\s*"src\/index-v16\.mjs"/);
assert.ok(worker.includes("edge-sentinel-v16-spain-lottery-import-gate-20260824a"));
assert.ok(worker.includes("LOTTERY_PRODUCT_NOT_IN_SELAE_ONCE_UNIVERSE"));
assert.ok(worker.includes("SPAIN_ONLY_LIBRARY_REJECTS_NON_ES_RECORD"));
assert.ok(worker.includes("foreignLotteryMislabelProtection:true"));
assert.ok(worker.includes("lotteryProductMustMatchSELAEOrONCEUniverse:true"));
assert.ok(worker.includes("['el-gordo-de-la-primitiva','el-gordo-primitiva']"));
assert.ok(universe.includes("{id:'euromillones',name:'Euromillones'"));
assert.ok(universe.includes("{id:'eurojackpot',name:'Eurojackpot'"));
assert.ok(universe.includes("{id:'eurodreams',name:'EuroDreams'"));
assert.ok(!universe.toLowerCase().includes('powerball'));
assert.ok(!universe.toLowerCase().includes('mega millions'));
assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);

console.log('edge-spain-lottery-import-gate-v16.test.mjs: PASS');
