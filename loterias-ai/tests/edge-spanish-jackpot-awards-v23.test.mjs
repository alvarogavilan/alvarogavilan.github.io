import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SPANISH_JACKPOT_AWARDS_V3_EXTRA,SPANISH_JACKPOT_AGGREGATES_V3_EXTRA } from '../edge-backend/src/spanish-jackpot-awards-v3-extra.mjs';

const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v23.mjs','utf8');
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

assert.equal(SPANISH_JACKPOT_AWARDS_V3_EXTRA.length,2);
assert.equal(SPANISH_JACKPOT_AGGREGATES_V3_EXTRA.length,2);
const grill=SPANISH_JACKPOT_AWARDS_V3_EXTRA.find(x=>x.game==='Ultimate Grill Thrills');
const aztec=SPANISH_JACKPOT_AWARDS_V3_EXTRA.find(x=>x.game==='Aztec Realm');
assert.equal(grill.amountEUR,725908);
assert.equal(grill.datePrecision,'PUBLICATION_WINDOW');
assert.equal(aztec.amountEUR,433216);
assert.equal(aztec.stakeEUR,0.75);
assert.equal(aztec.datePrecision,'PUBLICATION_WINDOW');
for(const x of SPANISH_JACKPOT_AGGREGATES_V3_EXTRA)assert.equal(x.expandToSyntheticRows,false);
assert.equal(SPANISH_JACKPOT_AGGREGATES_V3_EXTRA.find(x=>x.scope==='PROGRESSIVE_SLOTS_SPAIN').totalAwardsEURLowerBound,3200000);
assert.equal(SPANISH_JACKPOT_AGGREGATES_V3_EXTRA.find(x=>x.scope==='DAILY_JACKPOT_SLOTS_SPAIN').totalAwardsEURLowerBound,838000);
assert.match(wrangler,/"main"\s*:\s*"src\/index-v23\.mjs"/);
assert.ok(worker.includes("edge-sentinel-v23-spanish-jackpot-awards-expansion-20260824a"));
assert.ok(worker.includes('publicationWindowCannotMasqueradeAsExactAwardTime:true'));
assert.ok(worker.includes('aggregateLowerBoundsCannotBecomeSyntheticEvents:true'));
assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
console.log('edge-spanish-jackpot-awards-v23.test.mjs: PASS');
