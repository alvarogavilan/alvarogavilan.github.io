import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyTargetConfig,classifyEvidenceTarget,auditSources,auditProbes,EXPECTED_SHARED_TIKI_SLUG,WRONG_SHARED_TIKI_SLUG} from '../casino/jackpots/winfall-shared-target-audit-v1.mjs';

assert.equal(EXPECTED_SHARED_TIKI_SLUG,'tiki-templo');
assert.equal(WRONG_SHARED_TIKI_SLUG,'la-isla-de-tiki');

const wrong=`const TARGETS=['winfall-wishes-jackpot','wonderland','la-isla-de-tiki'];\nconst hypothesis=['Wonderland','La Isla de Tiki Templo'];`;
const right=`const TARGETS=['winfall-wishes-jackpot','wonderland','tiki-templo'];\nconst hypothesis=['Wonderland','La Isla de Tiki Templo'];`;

assert.deepEqual(classifyTargetConfig(wrong),{
  usesExpectedSharedTikiSlug:false,
  usesWrongSharedTikiSlug:true,
  hypothesisNamesTikiTemplo:true,
  targetMismatch:true,
});
assert.equal(classifyTargetConfig(right).targetMismatch,false);

const legacy=auditSources([{file:'old-probe.mjs',source:wrong},{file:'correct-probe.mjs',source:right}]);
assert.deepEqual(legacy.invalidated,['old-probe.mjs']);
assert.equal(legacy.negativeClosureValid,false);

const wrongEvidence={hypothesis:{officiallySharedWith:['Wonderland','La Isla de Tiki Templo']},pages:[{slug:'la-isla-de-tiki'}]};
const correctEvidence={hypothesis:{resolvedBotemaniaSlug:'tiki-templo'},pages:[{slug:'tiki-templo'}]};
assert.equal(classifyEvidenceTarget(wrongEvidence).staleWrongTargetEvidence,true);
assert.equal(classifyEvidenceTarget(correctEvidence).correctlyTargeted,true);

const custody=auditProbes([
  {sourceFile:'fixed.mjs',source:right,evidenceFile:'old.json',evidence:wrongEvidence},
]);
assert.equal(custody.currentSourcesCorrect,true,'fixing source code is not enough to rehabilitate old evidence');
assert.deepEqual(custody.invalidatedEvidence,['old.json']);
assert.equal(custody.priorNegativeEvidenceValid,false);
assert.equal(custody.correctedRerunRequired,true);
assert.equal(custody.realMoneyAllowed,false);

const fresh=auditProbes([
  {sourceFile:'fixed.mjs',source:right,evidenceFile:'fresh.json',evidence:correctEvidence},
]);
assert.equal(fresh.priorNegativeEvidenceValid,true);
assert.equal(fresh.correctedRerunRequired,false);

for(const file of [
  'loterias-ai/casino/jackpots/winfall-shared-network-triangulation-v1.mjs',
  'loterias-ai/casino/jackpots/winfall-passive-network-triangulation-v2.mjs',
  'loterias-ai/casino/jackpots/winfall-provider-network-metadata-v1.mjs',
]){
  const source=fs.readFileSync(file,'utf8');
  assert.match(source,/TARGETS=\['winfall-wishes-jackpot','wonderland','tiki-templo'\]/,`${file} must use corrected Tiki Templo partner`);
  assert.doesNotMatch(source,/TARGETS=\['winfall-wishes-jackpot','wonderland','la-isla-de-tiki'\]/,`${file} must not use La Isla de Tiki as Winfall partner`);
  assert.match(source,/realMoneyAllowed:false/);
}

const renderedProbe=fs.readFileSync('loterias-ai/casino/jackpots/winfall-shared-network-triangulation-v1.mjs','utf8');
const passiveProbe=fs.readFileSync('loterias-ai/casino/jackpots/winfall-passive-network-triangulation-v2.mjs','utf8');
const metadataProbe=fs.readFileSync('loterias-ai/casino/jackpots/winfall-provider-network-metadata-v1.mjs','utf8');
assert.match(renderedProbe,/correctTikiTemploSlugFrozenBeforeRun:true/);
assert.match(passiveProbe,/correctTikiTemploSlugFrozenBeforeRun:true/);
assert.match(metadataProbe,/correctTikiTemploSlugFrozenBeforeRun:true/);
assert.match(renderedProbe,/singleRunNeverVerifiesIdentity:true/);
assert.match(passiveProbe,/singleRunNeverVerifiesIdentity:true/);
assert.match(metadataProbe,/singleRunNeverVerifiesNetworkConfig:true/);

console.log('winfall-shared-target-audit-v1.test.mjs: PASS');
