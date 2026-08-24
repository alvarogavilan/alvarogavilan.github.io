import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/diamond-spain-cross-operator-v1.json','utf8'));
assert.equal(e.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.operatorPages.length,2);
assert.ok(e.operatorPages.every(x=>x.publishedRtpPct===95.44));
assert.ok(e.operatorPages.every(x=>x.fixedPaylines===5));
assert.ok(e.operatorPages.every(x=>x.diamondSpecificContributionPct===null));
assert.equal(e.crossOperatorFingerprint.publishedRtpMatches,true);
assert.equal(e.crossOperatorFingerprint.independentBackendOrMathConfigurationProven,false);
assert.equal(e.crossOperatorFingerprint.sameJackpotPoolProven,false);
assert.equal(e.crossOperatorFingerprint.sameContributionPctProven,false);
assert.equal(e.crossOperatorFingerprint.sameTriggerProbabilityProven,false);
assert.equal(e.ballyComparator.safeToTransferContributionPctToSpain,false);
assert.equal(e.ballyComparator.safeToComputeSpainBreakEven,false);
assert.equal(e.scientificEffect.breakEvenAvailable,false);
assert.equal(e.scientificEffect.thresholdEUR,null);
assert.equal(e.scientificEffect.decision,'NO_PLAY');
for(const key of ['identityVerified','thresholdVerified','stakeVerified','strategyVerified','rulesFingerprintVerified','prospectiveValidationPassed'])assert.equal(e.execution[key],false);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('edge-diamond-spain-cross-operator-v1.test.mjs: PASS');
