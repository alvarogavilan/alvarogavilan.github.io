import assert from 'node:assert/strict';
import fs from 'node:fs';

const p='loterias-ai/edge-live/evidence/spain-direct-persistent-state-v2.json';
const e=JSON.parse(fs.readFileSync(p,'utf8'));
assert.equal(e.status,'P0_DISCOVERY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.portfolioFinding.executionReadyCandidateCount,0);
assert.equal(e.portfolioFinding.spainDirectPersistentStateProven,true);

const magic=e.priority.find(x=>x.id==='magic-of-the-nile-9602-spain');
assert.ok(magic);
assert.equal(magic.spainEvidence.betfair.rtpPct,96.02);
assert.equal(magic.spainEvidence.monopolyCasino.rtpPct,96.02);
assert.equal(magic.exact9602RulesComparator.rtpPct,96.02);
assert.equal(magic.exact9602RulesComparator.persistentPerBetBetweenSessions,true);
assert.equal(magic.physicalCrossPlayerEvidence.meterSavedAfterCashOut,true);
assert.equal(magic.physicalCrossPlayerEvidence.playersCanShopBetLevelMeters,true);
assert.equal(magic.physicalCrossPlayerEvidence.spainPhysicalInstallationVerified,false);
assert.equal(magic.onlineScopeRisk.crossPlayerOnlinePersistenceVerifiedInSpain,false);
assert.equal(magic.onlineScopeRisk.accountPrivatePersistenceExcluded,false);
assert.equal(magic.currentAdvantagePlayEvidence.fieldGuidanceIsExactSpainThreshold,false);
assert.equal(magic.decision.executionEligible,false);
assert.equal(magic.decision.maxSpins,0);
assert.equal(magic.decision.maxTotalStakeEUR,0);
assert.equal(magic.decision.realMoneyAllowed,false);

const supa=e.priority.find(x=>x.id==='supajax-spain-network-identity');
assert.ok(supa);
assert.equal(supa.spainAvailabilityEvidence.primaryOperatorPageVerified,false);
assert.equal(supa.spainAvailabilityEvidence.evidenceStrength,'SECONDARY_ONLY');
assert.equal(supa.globalProgressiveEvidence.breakEven,52417);
assert.equal(supa.globalProgressiveEvidence.estimatedCurrentRtpPct,120.2);
assert.equal(supa.globalProgressiveEvidence.networkIdentityWithSpainVerified,false);
assert.equal(supa.globalProgressiveEvidence.currencyAndMeterIdentityVerified,false);
assert.equal(supa.globalProgressiveEvidence.freshOperatorCounterVerified,false);
assert.equal(supa.decision.executionEligible,false);
assert.equal(supa.decision.maxSpins,0);
assert.equal(supa.decision.realMoneyAllowed,false);

const viking=e.priority.find(x=>x.id==='viking-queen-spain-direct-persistence');
assert.ok(viking);
assert.equal(viking.spainEvidence.botemania.savedByBetDirectRule,true);
assert.equal(viking.spainEvidence.casino777.savedByBetDirectRule,true);
assert.equal(viking.resetSemantics.x10AbsorbingStateNotDisproved,true);
assert.equal(viking.scientificDowngrade.positiveEvStateProven,false);
assert.equal(viking.decision.executionEligible,false);
assert.equal(viking.decision.realMoneyAllowed,false);

for(const x of e.priority){
  assert.equal(x.decision.executionEligible,false);
  assert.equal(x.decision.maxSpins,0);
  assert.equal(x.decision.realMoneyAllowed,false);
}
for(const [k,v] of Object.entries(e.hardGuards)) assert.equal(v,true,`hard guard ${k} drifted`);
console.log('spain-direct-persistent-state-v2.test.mjs: PASS');
