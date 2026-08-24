import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/scarab-regulatory-software-fingerprints-v1.json','utf8'));
assert.equal(e.mode,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.mississippiGamingCommission.manufacturer,'IGT');

const j3=e.mississippiGamingCommission.builds.find(x=>x.gameId==='GAME020001JFJS03');
assert.ok(j3);
assert.equal(j3.title,'Scarab');
assert.equal(j3.sha1,'25DBCEA2D2352D635D4DCB756243DC137D96A142');
assert.equal(j3.md5,'FF4B81ED6897C33A385A5713AAA3F03F');
assert.equal(j3.currentAndHistoricalListsAgree,true);
assert.equal(j3.canonicalSearchFingerprintAllowed,true);

const j2=e.mississippiGamingCommission.builds.find(x=>x.gameId==='GAME020001JFJS02');
assert.ok(j2);
assert.equal(j2.title,'Scarab');
assert.equal(j2.sha1,null);
assert.equal(j2.publishedSha1DiscrepancyDetected,true);
assert.notEqual(j2.currentListSha1AsIndexed,j2.historicalListSha1AsIndexed);
assert.equal(j2.canonicalSearchFingerprintAllowed,false);

assert.equal(e.peruMincetur.facts.registrationCode,'A0015914');
assert.equal(e.peruMincetur.facts.manufacturer,'INTERNATIONAL GAME TECHNOLOGY (IGT)');
assert.equal(e.peruMincetur.facts.identificationCode,'GI020001JFJS003');
assert.equal(e.peruMincetur.facts.officialRowsNameScarabDirectly,false);
assert.equal(e.lowerAuthorityHardwareBridge.regulatoryProof,false);
assert.equal(e.lowerAuthorityHardwareBridge.spainBinding,false);
assert.equal(e.identitySynthesis.jfjs03RegulatorTitleBindingVerified,true);
assert.equal(e.identitySynthesis.gameIdToGiIdDirectOfficialRegulatorBridgeVerified,false);
assert.equal(e.identitySynthesis.casinoLaTojaBuildIdentified,false);
assert.equal(e.identitySynthesis.galiciaModelRecordIdentified,false);
assert.equal(e.hardGuards.foreignRegulatorBuildDoesNotIdentifySpainBuild,true);
assert.equal(e.hardGuards.lowerAuthorityTradeRecordCannotCloseRegulatoryIdentity,true);
assert.equal(e.hardGuards.sha1DiscrepancyMustRemainExplicit,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('scarab-regulatory-software-fingerprints-v1.test.mjs: PASS');
