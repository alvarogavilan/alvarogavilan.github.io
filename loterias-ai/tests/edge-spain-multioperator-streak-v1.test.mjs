import assert from 'node:assert/strict';
import fs from 'node:fs';

const wh=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-williamhill-progressive-catalog-v1.json','utf8'));
const streak=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/streak-of-luck-spain-progressive-model-v1.json','utf8'));
const pots=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/wizard-of-pots-benchmark-v1.json','utf8'));

assert.equal(wh.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(wh.realMoneyAllowed,false);
assert.ok(wh.titles.length>=15);
const sol=wh.titles.find(x=>x.game==='Streak of Luck');
assert.ok(sol);
assert.equal(sol.provider,'Playtech');
assert.equal(sol.progressiveTiers,6);
assert.equal(sol.seedFormula,'8750 × coin value');
assert.equal(sol.contributionPct,1.40);
assert.match(sol.trigger,/10 consecutive/i);
assert.match(sol.statePersistence,/separately for each bet-per-line/i);
assert.equal(sol.launcherPathObserved,'/wh-es/launch/streak-of-luck');
const jb=wh.titles.find(x=>x.game==='Jackpot Bells');
const cjb=wh.titles.find(x=>x.game==='Christmas Jackpot Bells');
assert.equal(jb.contributionPct,2.92);
assert.equal(cjb.contributionPct,2.00);
assert.equal(wh.hardGuards.sameTriggerPatternDoesNotProveSameContributionOrEconomics,true);
assert.equal(wh.hardGuards.contributionDoesNotEqualHazard,true);
assert.equal(wh.hardGuards.realMoneyAllowed,false);

assert.equal(streak.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(streak.realMoneyAllowed,false);
assert.equal(streak.spainEvidence.williamHill.facts.progressiveJackpotCount,6);
assert.equal(streak.spainEvidence.williamHill.facts.contributionPct,1.40);
assert.equal(streak.advantagePlayAssessment.crossPlayerScavengingProven,false);
assert.equal(streak.advantagePlayAssessment.lowBetBuildThenHighBetSwitchExploitProven,false);
assert.equal(streak.advantagePlayAssessment.currentExecutableThresholdEUR,null);
assert.equal(streak.advantagePlayAssessment.decision,'NO_PLAY');
assert.equal(streak.hardGuards.tenWinsDoesNotMeanSimpleQPowerTenWithoutStateModel,true);
assert.equal(streak.hardGuards.rtpRangeWidthMatchingContributionIsNotDecompositionProof,true);
assert.equal(streak.hardGuards.counterPersistenceDoesNotProveCrossPlayerInheritance,true);
assert.equal(streak.hardGuards.realMoneyAllowed,false);

assert.equal(pots.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(pots.realMoneyAllowed,false);
assert.equal(pots.publicCapabilities.progressiveJackpotsTracked,'1500+');
assert.equal(pots.publicCapabilities.nominalUpdateIntervalMinutes,5);
assert.equal(pots.publicCapabilities.historicalGraphYearsUpTo,18);
assert.match(pots.scoreMethodology.type1Formula,/currentJackpot - seed/);
assert.ok(pots.scientificLimitationsForEdgeExecution.some(x=>x.includes('not by itself a verified positive-EV threshold')));
assert.equal(pots.edgeResponse.researchOnlyScorePolicy.canEnableExecution,false);
assert.equal(pots.hardGuards.scoreIsNotProbabilityOfWinning,true);
assert.equal(pots.hardGuards.scoreAloneCannotEnableRealMoney,true);
assert.equal(pots.hardGuards.realMoneyAllowed,false);

console.log('edge-spain-multioperator-streak-v1.test.mjs: PASS');
