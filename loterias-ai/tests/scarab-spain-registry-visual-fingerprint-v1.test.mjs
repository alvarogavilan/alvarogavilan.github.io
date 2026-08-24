import assert from 'node:assert/strict';
import fs from 'node:fs';

const path='loterias-ai/edge-live/evidence/scarab-spain-registry-visual-fingerprint-v1.json';
const e=JSON.parse(fs.readFileSync(path,'utf8'));

assert.equal(e.version,'scarab-spain-registry-visual-fingerprint-v1');
assert.equal(e.status,'PARTIAL_LOCAL_PLATFORM_AND_SPANISH_REGISTRY_BRIDGE_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);

const venue=e.casinoLaToja;
assert.equal(venue.facts.venueListsIgtCrystal,true);
assert.equal(venue.facts.venueListsExactScarabTitleUnderIgtCrystalSection,true);
assert.equal(venue.facts.venueImageShowsIgtBrandedMachineBank,true);
assert.equal(venue.facts.venueImageShowsUSwitchBrandingOnVisibleScreens,true);
assert.equal(venue.facts.venueImageFilenameLabelsIgtCrystal,true);
assert.equal(venue.limits.exactScarabScreenVisibleInRecoveredVenuePhoto,false);
assert.equal(venue.limits.exactCabinetModelVerifiedFromVenuePhoto,false);
assert.equal(venue.limits.exactScarabSoftwareBuildVerified,false);
assert.equal(venue.limits.exactScarabPaylineConfigurationVerified,false);
assert.equal(venue.limits.exactScarabPaytableVerified,false);
assert.equal(venue.limits.familyBetRangeIsExactScarabStakeMapping,false);

const and=e.spainAutonomousRegistryComparators.andalucia;
assert.equal(and.igtEspanaManufacturerCode,'F-M-184');
for(const expected of [
  ['CJ-C-C-0-148','VIDEO SLOT'],
  ['CJ-C-C-0-145','GAME KING'],
  ['CJ-C-C-0-139','EDGE PLUS']
]){
  const row=and.igtEspanaEntries.find(x=>x.registrationCode===expected[0]);
  assert.ok(row,`missing Andalucía IGT row ${expected[0]}`);
  assert.equal(row.modelName,expected[1]);
  assert.equal(row.manufacturer,'INTERNATIONAL GAME TECHNOLOGY ESPAÑA, S.L.');
  assert.equal(row.manufacturerCode,'F-M-184');
}
for(const expected of [
  ['JA-C-C-0-2432','CRYSTAL 27 12J MP4'],
  ['JA-C-C-0-1689','MULTIGAME XTALDUAL MP6 PK1'],
  ['JA-C-C-0-1762','MULTIGAME XTALDUAL MP6 PK2'],
  ['JA-C-C-0-1861','AXXIS 23/23 MP4 VOLUME I MP4']
]){
  const row=and.laterIgtPlatformImporterEntries.find(x=>x.registrationCode===expected[0]);
  assert.ok(row,`missing Andalucía later IGT-family row ${expected[0]}`);
  assert.equal(row.modelName,expected[1]);
  assert.equal(row.registrant,'LOGICAL GAMES 46 IMPORTACION Y SERVICIOS, S.L');
  assert.equal(row.registrantCode,'F-JA-30');
}
assert.equal(and.exactScarabNameFoundInRecoveredAndaluciaModelList,false);

const murcia=e.spainAutonomousRegistryComparators.murcia;
assert.equal(murcia.facts.modelName,'CRYSTAL 27 12J MP4');
assert.equal(murcia.facts.homologationDate,'2019-04-23');
assert.equal(murcia.facts.registrantIdentifier,'1EC-00001020');
assert.equal(murcia.localTransferAllowed,false);

assert.equal(e.globalCabinetBridge.facts.scarabShownOnCrystalDual27In2018,true);
assert.equal(e.globalCabinetBridge.localTransferAllowed,false);
assert.equal(e.candidateSpanishRegistrationAliases.hypothesesOnly,true);
for(const name of ['VIDEO SLOT','CRYSTAL 27 12J MP4','MULTIGAME XTALDUAL MP6 PK1','MULTIGAME XTALDUAL MP6 PK2']){
  assert.ok(e.candidateSpanishRegistrationAliases.names.includes(name),`missing search-only alias ${name}`);
}

assert.equal(e.closureImpact.localPlatformFamilyPhotographicallyStrengthened,true);
for(const [key,value] of Object.entries(e.closureImpact)){
  if(key==='localPlatformFamilyPhotographicallyStrengthened') continue;
  assert.equal(value,false,`closure impact ${key} must remain fail-closed`);
}
assert.equal(e.realMoneyAllowed,false);

console.log('scarab-spain-registry-visual-fingerprint-v1.test.mjs: PASS');
