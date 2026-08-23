import assert from 'node:assert/strict';
import fs from 'node:fs';

const evidence=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/ultimate-video-poker-config-equivalence-v1.json','utf8'));

assert.equal(evidence.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(evidence.realMoneyAllowed,false);
assert.equal(evidence.botemaniaCurrentProductEvidence.progressiveVariantExplicitlyListed,'Jotas o Mejor Progresivo');
assert.deepEqual(evidence.botemaniaCurrentProductEvidence.publishedRtpRangePct,[96.77,99.54]);
assert.equal(evidence.botemaniaCurrentProductEvidence.exactProgressiveVariantPaytablePublishedOnOperatorPage,false);
assert.equal(evidence.equivalenceAssessment.exactConfigurationEquivalent,false);
assert.equal(evidence.equivalenceAssessment.equivalenceStatus,'NOT_PROVEN');
assert.equal(evidence.equivalenceAssessment.safeToTransfer81387CreditThresholdToSpain,false);
assert.equal(evidence.equivalenceAssessment.safeToTransfer20436CurrencyThresholdToSpain,false);
assert.equal(evidence.execution.thresholdVerified,false);
assert.equal(evidence.execution.stakeVerified,false);
assert.equal(evidence.execution.strategyVerified,false);
assert.equal(evidence.execution.rulesFingerprintVerified,false);
assert.equal(evidence.execution.prospectiveValidationPassed,false);
assert.equal(evidence.execution.breakEvenRoyalCredits,null);
assert.equal(evidence.execution.breakEvenJackpotEUR,null);
assert.equal(evidence.execution.exactStakeEUR,null);
assert.equal(evidence.execution.maxSpins,0);
assert.equal(evidence.execution.maxTotalStakeEUR,0);
assert.equal(evidence.execution.decision,'NO_PLAY');
assert.equal(evidence.hardGuards.externalThresholdIsNotExecutionSignal,true);
assert.equal(evidence.hardGuards.realMoneyAllowed,false);

console.log('edge-uvp-config-equivalence-v1.test.mjs: PASS');
