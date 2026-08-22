import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyTargetConfig,auditSources,EXPECTED_SHARED_TIKI_SLUG,WRONG_SHARED_TIKI_SLUG} from '../casino/jackpots/winfall-shared-target-audit-v1.mjs';

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

const audit=auditSources([{file:'old-probe.mjs',source:wrong},{file:'correct-probe.mjs',source:right}]);
assert.deepEqual(audit.invalidated,['old-probe.mjs']);
assert.equal(audit.negativeClosureValid,false);
assert.equal(audit.exactLiveIdVerified,false);
assert.equal(audit.identityPromotionAllowed,false);
assert.equal(audit.economicPromotionAllowed,false);
assert.equal(audit.realMoneyAllowed,false);

const correctedProbe=fs.readFileSync('loterias-ai/casino/jackpots/winfall-shared-network-triangulation-v1.mjs','utf8');
assert.match(correctedProbe,/TARGETS=\['winfall-wishes-jackpot','wonderland','tiki-templo'\]/);
assert.doesNotMatch(correctedProbe,/TARGETS=\['winfall-wishes-jackpot','wonderland','la-isla-de-tiki'\]/);
assert.match(correctedProbe,/correctTikiTemploSlugFrozenBeforeRun:true/);
assert.match(correctedProbe,/singleRunNeverVerifiesIdentity:true/);
assert.match(correctedProbe,/realMoneyAllowed:false/);

console.log('winfall-shared-target-audit-v1.test.mjs: PASS');
