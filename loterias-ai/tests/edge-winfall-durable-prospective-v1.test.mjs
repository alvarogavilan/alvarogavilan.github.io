import assert from 'node:assert/strict';
import fs from 'node:fs';

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const source=fs.readFileSync('loterias-ai/edge-backend/src/index-v9.mjs','utf8');
const client=fs.readFileSync('loterias-ai/edge-live/edge-science-client-v1.mjs','utf8');
const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/winfall-durable-prospective-protocol-v1.json','utf8'));

assert.match(wrangler,/"main"\s*:\s*"src\/index-v(?:9|10)\.mjs"/);
assert.match(source,/edge-sentinel-v9-winfall-prospective-lab-20260824a/);
assert.ok(source.includes("path==='/science/winfall'"));
assert.ok(source.includes("generic:tikitemple2_1"));
assert.ok(source.includes("generic:progressivealice1"));
assert.match(source,/MIN_PROSPECTIVE_PAIRED_RESETS_FOR_CONDITIONAL_HAZARD_FIT=10/);
assert.match(source,/WINFALL_BASE_RTP=0\.9485/);
assert.match(source,/WINFALL_CONTRIBUTION=0\.0060/);
assert.match(source,/WINFALL_RESET_EUR=0/);
for(const guard of [
  'synchronizedDropIsNotJackpotAwardProof:true',
  'pairedResetCouplingNeverEqualsGameIdentity:true',
  'exactAliasDisproofIsMonotonic:true',
  'constantHazardIsAnAssumptionNotPublishedFact:true',
  'contributionRateIsNotHazard:true',
  'currentPairValueCannotBeUsedAsWinfallMeterUntilBound:true',
  'conditionalThresholdCannotEnableExecution:true',
  'executionContractRemainsSoleGreenAuthority:true'
]) assert.ok(source.includes(guard));
assert.ok(client.includes('/science/winfall?limit=500'));
assert.ok(client.includes('WINFALL · PROSPECTIVO DURABLE'));
assert.ok(client.includes('binding exacto Winfall'));
assert.ok(client.includes('upper 95% conservador'));
assert.ok(client.includes('upper95 ≠ ejecución'));
assert.equal(e.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.officialSpainInputs.baseRtp,0.9485);
assert.equal(e.officialSpainInputs.jackpotContribution,0.006);
assert.equal(e.officialSpainInputs.resetEUR,0);
assert.equal(e.frozenProtocol.exactAliasDisproved,true);
assert.equal(e.frozenProtocol.exactWinfallLiveIdVerified,false);
assert.equal(e.frozenProtocol.minimumProspectivePairedResetsForConditionalHazardFit,10);
assert.equal(e.conditionalModel.currentWinfallMeterMayPopulateModel,false);
assert.equal(e.conditionalModel.economicPromotionAllowed,false);
assert.equal(e.execution.decision,'NO_PLAY');
for(const key of ['identityVerified','thresholdVerified','stakeVerified','strategyVerified','rulesFingerprintVerified','prospectiveValidationPassed']) assert.equal(e.execution[key],false);
assert.equal(e.hardGuards.pairedResetIsNotGameIdentity,true);
assert.equal(e.hardGuards.pairedResetIsNotAwardProof,true);
assert.equal(e.hardGuards.minimumTenPairsBeforeConditionalFit,true);
assert.equal(e.hardGuards.pointEstimateCannotEnableExecution,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('edge-winfall-durable-prospective-v1.test.mjs: PASS');
