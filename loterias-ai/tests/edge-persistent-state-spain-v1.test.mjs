import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/persistent-state-spain-v1.json','utf8'));
assert.equal(e.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.ok(Array.isArray(e.candidates)&&e.candidates.length>=2);
const pirate=e.candidates.find(x=>x.game==='El Tesoro Pirata Plus');
assert.ok(pirate);
assert.equal(pirate.scientificGates.stateExists,true);
assert.equal(pirate.scientificGates.inheritedByNextPlayer,false);
assert.equal(pirate.scientificGates.exactStateConditionalEVKnown,false);
assert.equal(pirate.scientificGates.exactOptimalEntryThresholdKnown,false);
assert.equal(pirate.technicalRulesComparator.configurationEquivalenceToBotemaniaProven,false);
assert.equal(pirate.technicalRulesComparator.bonusApproxConversionIsDirectCashEV,false);
assert.equal(e.execution.decision,'NO_PLAY');
assert.equal(e.execution.stakeEUR,0);
assert.equal(e.execution.maxSpins,0);
assert.equal(e.execution.maxTotalStakeEUR,0);
assert.equal(e.hardGuards.visibleMeterIsNotPersistenceProof,true);
assert.equal(e.hardGuards.reconnectRestorationIsNotCrossPlayerInheritanceProof,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('edge-persistent-state-spain-v1.test.mjs: PASS');
