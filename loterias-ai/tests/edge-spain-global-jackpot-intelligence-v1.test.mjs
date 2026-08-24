import assert from 'node:assert/strict';
import fs from 'node:fs';

const spain=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-progressive-intelligence-map-v1.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-progressive-regulatory-ledger-v1.json','utf8'));
const world=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/global-jackpot-intelligence-benchmark-v1.json','utf8'));

assert.equal(spain.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(spain.realMoneyAllowed,false);
assert.equal(spain.regulatoryFoundation.order,'Orden HAP/1370/2014');
assert.ok(spain.regulatoryFoundation.facts.some(x=>x.includes('Article 8(k)')));
assert.ok(spain.poolFamilies.length>=5);
const mixed=spain.poolFamilies.find(x=>x.id==='gamesys-roxor-zero-reset-tiki-paper-boteman-winstones-family');
assert.ok(mixed);
assert.equal(mixed.resetEUR,0);
const contributions=new Set(mixed.members.map(x=>x.contributionPct));
assert.ok(contributions.size>=3);
const bubble=spain.poolFamilies.find(x=>x.id==='bubble-progressive-family');
assert.ok(bubble.tierSharing.some(x=>x.includes('Mini is independent')));
assert.equal(spain.hardGuards.samePoolDoesNotMeanSameContribution,true);
assert.equal(spain.hardGuards.samePoolDoesNotMeanSameHazard,true);
assert.equal(spain.hardGuards.contributionDoesNotEqualHazard,true);
assert.equal(spain.hardGuards.foreignConfigurationCannotFillSpainMissingInputs,true);
assert.equal(spain.hardGuards.realMoneyAllowed,false);

assert.equal(ledger.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(ledger.section,'3.20 Botes, botes progresivos, y premios adicionales');
assert.ok(ledger.operatorTechnicalRequirements.accountingLedgerMinimum.includes('jackpot balance at all times'));
assert.ok(ledger.operatorTechnicalRequirements.accountingLedgerMinimum.includes('contribution to the jackpot differentiated by each game/machine type'));
assert.ok(ledger.operatorTechnicalRequirements.accountingLedgerMinimum.includes('jackpot awards with winner, amount and time'));
assert.ok(ledger.edgeRequiredMirrorSchema.includes('configurationFingerprint'));
assert.ok(ledger.edgeRequiredMirrorSchema.includes('awardVerified'));
assert.equal(ledger.hardGuards.publicReconstructionIsNotOperatorInternalLedger,true);
assert.equal(ledger.hardGuards.samePoolContributionMustRemainGameSpecific,true);
assert.equal(ledger.hardGuards.realMoneyAllowed,false);

assert.equal(world.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(world.realMoneyAllowed,false);
const tracker=world.referenceSystems.find(x=>x.name.includes('Casino Listings'));
assert.ok(tracker.publicScaleObserved.jackpotsTracked>=400);
assert.ok(tracker.capabilities.includes('known break-even value'));
assert.ok(world.worldMechanicsEvidence.some(x=>x.class==='MUST_HIT_BY_RANDOM_HIDDEN_THRESHOLD'));
assert.ok(world.worldMechanicsEvidence.some(x=>x.class==='MUST_HIT_BY_DYNAMIC_PROBABILITY'));
assert.ok(world.edgeWorldClassTarget.mustHavePerMeter.includes('cycle maxima'));
assert.ok(world.edgeWorldClassTarget.edgeDifferentiators.includes('fail-closed executable contract requiring all scientific gates'));
for(const x of world.knownBreakEvenReferenceExamples) assert.equal(x.transferToSpain,false);
assert.equal(world.hardGuards.historicalAverageWinDoesNotMeanOverdue,true);
assert.equal(world.hardGuards.mustHitByMechanismCannotBeAssumedUniformAcrossProducts,true);
assert.equal(world.hardGuards.realMoneyAllowed,false);

console.log('edge-spain-global-jackpot-intelligence-v1.test.mjs: PASS');
