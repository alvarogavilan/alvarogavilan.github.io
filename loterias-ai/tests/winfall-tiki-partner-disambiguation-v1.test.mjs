import assert from 'node:assert/strict';
import {resolveWinfallTikiPartner,TIKI_TEMPLO_SLUG,TIKI_BOTE_SLUG,TIKI_BASE_SLUG} from '../casino/jackpots/winfall-tiki-partner-disambiguation-v1.mjs';

const x=resolveWinfallTikiPartner({
  winfallPartners:['Wonderland','La Isla de Tiki Templo'],
  catalogTitles:['Tiki Templo','La Isla de Tiki Bote','La Isla de Tiki'],
  tikiBoteDeclaredPartners:['Boteman','Paper Wins Jackpot','Winstones Bote'],
  tikiTemploProgressive:true,
  tikiBoteProgressive:true,
  tikiBaseProgressive:false,
});

assert.equal(x.exactPhraseExistsInCatalog,false);
assert.equal(x.candidates.tikiBase.slug,TIKI_BASE_SLUG);
assert.equal(x.candidates.tikiBase.excludedAsNonProgressiveBase,true);
assert.equal(x.candidates.tikiBote.slug,TIKI_BOTE_SLUG);
assert.equal(x.candidates.tikiBote.separateNetworkEvidence,true);
assert.equal(x.resolution.operationalTarget,TIKI_TEMPLO_SLUG);
assert.equal(x.resolution.confidence,'HIGH_STRUCTURAL_DISAMBIGUATION');
assert.equal(x.resolution.exactStringTitleVerified,false);
assert.equal(x.resolution.exactCounterIdentityVerified,false);
assert.equal(x.resolution.liveIdVerified,false);
assert.equal(x.guards.separateNetworkEvidenceDoesNotProveImpossibilityOfMultiNetworkMembership,true);
assert.equal(x.guards.noEconomicPromotion,true);
assert.equal(x.guards.realMoneyAllowed,false);

const ambiguous=resolveWinfallTikiPartner({
  winfallPartners:['Wonderland','La Isla de Tiki Templo'],
  catalogTitles:['Tiki Templo','La Isla de Tiki Bote','La Isla de Tiki'],
  tikiBoteDeclaredPartners:[],
  tikiTemploProgressive:true,
  tikiBoteProgressive:true,
  tikiBaseProgressive:false,
});
assert.equal(ambiguous.resolution.operationalTarget,null,'without independent network disambiguation target must fail closed');
assert.equal(ambiguous.resolution.confidence,'UNRESOLVED');

console.log('winfall-tiki-partner-disambiguation-v1.test.mjs: PASS');
