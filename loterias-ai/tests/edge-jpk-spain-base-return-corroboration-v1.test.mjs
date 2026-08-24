import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/jpk-spain-base-return-corroboration-v1.json','utf8'));
assert.equal(e.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.bet365SpainRegulatoryDisclosure.regulatorySemantics.jackpotAssignedAmountsExcludedFromTheseCalculations,true);
assert.equal(e.exactTitleMatches.length,2);
for(const row of e.exactTitleMatches){
  assert.equal(row.assessment.exactTitleFamilyMatch,true);
  assert.equal(row.assessment.exactBaseRtpMatch,true);
  assert.equal(row.assessment.independentSpanishOperatorCorroboration,true);
  assert.equal(row.assessment.baseRtpExJackpotSemanticsCorroborated,true);
  assert.equal(row.assessment.exactConfigurationEquivalent,false);
  assert.equal(row.assessment.hazardEquivalent,false);
  assert.equal(row.assessment.executionEligible,false);
  assert.equal(row.bet365.actualReturnExJackpotByMonth.length,6);
}
const eye=e.exactTitleMatches.find(x=>x.title==='Eye Of Horus Jackpot King');
assert.ok(eye);
assert.equal(eye.bet365.theoreticalRtp,0.9546);
assert.equal(eye.botemania.baseRtp,0.9546);
assert.equal(eye.botemania.contributionConflict.resolved,false);
const mega=e.exactTitleMatches.find(x=>x.title==='Eye of Horus Megaways Jackpot King');
assert.ok(mega);
assert.equal(mega.bet365.theoreticalRtp,0.945);
assert.equal(mega.botemania.baseRtp,0.945);
assert.equal(mega.botemania.contributionDisclosureConsistent,true);
assert.equal(e.execution.decision,'NO_PLAY');
for(const key of ['identityVerified','thresholdVerified','stakeVerified','strategyVerified','rulesFingerprintVerified','prospectiveValidationPassed'])assert.equal(e.execution[key],false);
assert.equal(e.hardGuards.sameBaseRtpIsNotConfigurationEquivalence,true);
assert.equal(e.hardGuards.realizedMonthlyReturnIsNotExpectedFutureReturn,true);
assert.equal(e.hardGuards.baseRtpCorroborationDoesNotProveEqualHazard,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('edge-jpk-spain-base-return-corroboration-v1.test.mjs: PASS');
