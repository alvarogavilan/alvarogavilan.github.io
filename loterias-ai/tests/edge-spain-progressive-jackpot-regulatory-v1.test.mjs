import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-progressive-jackpot-regulatory-v1.json','utf8'));
assert.equal(e.status,'RESEARCH_ONLY_REGULATORY_CONSTRAINTS');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.primaryLaw.article8InformationDuties.playerParticipationPercentageAllocatedToJackpotMustBeDisclosed,true);
assert.equal(e.primaryLaw.article14JackpotFunding.onlyProgressiveJackpotsPermitted,true);
assert.equal(e.primaryLaw.article14JackpotFunding.guaranteedJackpotsProhibited,true);
assert.equal(e.primaryLaw.article14JackpotFunding.operatorOwnFundsMayNotOriginateGuaranteedJackpot,true);
assert.equal(e.scientificConsequences.spainJackpotContributionPctIsDisclosureTargetNotEstimationTarget,true);
assert.equal(e.scientificConsequences.foreignOperatorFundedSeedCannotBeImportedToSpain,true);
assert.equal(e.diamondBonanza.currentKnownSpainContributionPct,null);
assert.equal(e.diamondBonanza.ballyContributionTransferAllowed,false);
assert.equal(e.diamondBonanza.thresholdEUR,null);
assert.equal(e.jackpotKing.genericBlueprintHelpMarketEquivalentToSpainProven,false);
assert.equal(e.jackpotKing.regulatoryConflictStatus,'MARKET_SCOPE_MUST_BE_RESOLVED_NOT_NONCOMPLIANCE_FINDING');
assert.equal(e.jackpotKing.equalHazardPerEURProven,false);
assert.equal(e.jackpotKing.thresholdEUR,null);
assert.equal(e.guards.missingWebScrapeFieldIsNotOperatorNonComplianceProof,true);
assert.equal(e.guards.reserveIsNotOperatorSeedWithoutEvidence,true);
assert.equal(e.guards.contributionIsNotHazard,true);
assert.equal(e.guards.regulatoryRuleCannotEnableExecutionContract,true);
assert.equal(e.guards.realMoneyAllowed,false);

console.log('edge-spain-progressive-jackpot-regulatory-v1.test.mjs: PASS');
