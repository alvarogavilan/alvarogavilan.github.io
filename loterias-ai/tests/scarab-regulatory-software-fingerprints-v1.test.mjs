import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/scarab-regulatory-software-fingerprints-v1.json','utf8'));
assert.equal(e.mode,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.mississippiGamingCommission.manufacturer,'IGT');

const ids=e.mississippiGamingCommission.builds.map(x=>x.gameId);
for(const id of ['GAME020001J0HS02','GAME020001J0HS03','GAME020001J0HS04','GAME020001JFJS02','GAME020001JFJS03']) assert.ok(ids.includes(id),`missing ${id}`);
assert.equal(new Set(e.mississippiGamingCommission.builds.map(x=>x.title)).size,1);
assert.equal(e.identitySynthesis.regulatorPublishedScarabBuildCountAtLeast,5);
assert.deepEqual(e.identitySynthesis.distinctGameCodeFamiliesObserved,['J0HS','JFJS']);

const j0=e.mississippiGamingCommission.builds.find(x=>x.gameId==='GAME020001J0HS03');
assert.ok(j0);
assert.equal(j0.title,'Scarab');
assert.equal(j0.sha1,'F9BBD5A070EBDADF7860252EF63F6F93808F82FB');
assert.equal(j0.md5,'3444B12467DC77368854B37E3569C10B');
assert.equal(j0.canonicalSearchFingerprintAllowed,true);

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
assert.equal(e.peruMincetur.facts.secondRegistrationCode,'A0015910');
assert.equal(e.peruMincetur.facts.secondIdentificationCode,'GI020001J0HS003');
assert.equal(e.peruMincetur.facts.bothIdentificationCodesAppearInAuthorizedGamingRoomMemoryLists,true);
assert.equal(e.peruMincetur.facts.officialRowsNameScarabDirectly,false);

assert.equal(e.swissFederalGamingBoard.manufacturer,'IGT');
assert.equal(e.swissFederalGamingBoard.title,'Scarab');
assert.equal(e.swissFederalGamingBoard.certificate,'2018IGT13057LC124');
assert.equal(e.swissFederalGamingBoard.directGameIdBinding,false);

assert.equal(e.lowerAuthorityHardwareBridge.regulatoryProof,false);
assert.equal(e.lowerAuthorityHardwareBridge.spainBinding,false);
assert.equal(e.identitySynthesis.jfjs03RegulatorTitleBindingVerified,true);
assert.equal(e.identitySynthesis.j0hs03RegulatorTitleBindingVerified,true);
assert.equal(e.identitySynthesis.gameIdToGiIdDirectOfficialRegulatorBridgeVerified,false);
assert.equal(e.identitySynthesis.casinoLaTojaBuildIdentified,false);
assert.equal(e.identitySynthesis.galiciaModelRecordIdentified,false);
assert.equal(e.hardGuards.foreignRegulatorBuildDoesNotIdentifySpainBuild,true);
assert.equal(e.hardGuards.matchingCommercialTitleDoesNotIdentifyBinary,true);
assert.equal(e.hardGuards.swissTitleCertificateDoesNotIdentifyGameId,true);
assert.equal(e.hardGuards.multipleRegulatorBuildsRequireLocalFingerprint,true);
assert.equal(e.hardGuards.lowerAuthorityTradeRecordCannotCloseRegulatoryIdentity,true);
assert.equal(e.hardGuards.sha1DiscrepancyMustRemainExplicit,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('scarab-regulatory-software-fingerprints-v1.test.mjs: PASS');
