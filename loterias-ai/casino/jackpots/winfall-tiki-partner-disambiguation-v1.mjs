#!/usr/bin/env node

export const WINFALL_TIKI_PHRASE='La Isla de Tiki Templo';
export const TIKI_TEMPLO_SLUG='tiki-templo';
export const TIKI_BOTE_SLUG='la-isla-de-tiki-bote';
export const TIKI_BASE_SLUG='la-isla-de-tiki';

const has=(xs,x)=>Array.isArray(xs)&&xs.includes(x);

export function resolveWinfallTikiPartner({
  winfallPartners=[],
  catalogTitles=[],
  tikiBoteDeclaredPartners=[],
  tikiTemploProgressive=false,
  tikiBoteProgressive=false,
  tikiBaseProgressive=false,
}={}){
  const phrasePresent=has(winfallPartners,WINFALL_TIKI_PHRASE);
  const exactPhraseExistsInCatalog=has(catalogTitles,WINFALL_TIKI_PHRASE);
  const tikiTemploExists=has(catalogTitles,'Tiki Templo');
  const tikiBoteExists=has(catalogTitles,'La Isla de Tiki Bote');
  const tikiBaseExists=has(catalogTitles,'La Isla de Tiki');
  const tikiBoteSeparateNetworkEvidence=has(tikiBoteDeclaredPartners,'Boteman')&&has(tikiBoteDeclaredPartners,'Paper Wins Jackpot');
  const baseGameExcluded=tikiBaseExists&&tikiBaseProgressive!==true;
  const tikiBoteStructurallyDisfavored=tikiBoteExists&&tikiBoteProgressive===true&&tikiBoteSeparateNetworkEvidence;
  const tikiTemploBestResolved=phrasePresent&&tikiTemploExists&&tikiTemploProgressive===true&&baseGameExcluded&&tikiBoteStructurallyDisfavored;

  return {
    officialPhrase:WINFALL_TIKI_PHRASE,
    exactPhraseExistsInCatalog,
    candidates:{
      tikiTemplo:{slug:TIKI_TEMPLO_SLUG,exists:tikiTemploExists,progressive:tikiTemploProgressive===true},
      tikiBote:{slug:TIKI_BOTE_SLUG,exists:tikiBoteExists,progressive:tikiBoteProgressive===true,separateNetworkEvidence:tikiBoteSeparateNetworkEvidence},
      tikiBase:{slug:TIKI_BASE_SLUG,exists:tikiBaseExists,progressive:tikiBaseProgressive===true,excludedAsNonProgressiveBase:baseGameExcluded},
    },
    resolution:{
      operationalTarget:tikiTemploBestResolved?TIKI_TEMPLO_SLUG:null,
      confidence:tikiTemploBestResolved?'HIGH_STRUCTURAL_DISAMBIGUATION':'UNRESOLVED',
      exactStringTitleVerified:false,
      exactCounterIdentityVerified:false,
      liveIdVerified:false,
      reason:tikiTemploBestResolved
        ?'Official Winfall phrase has no exact catalog title; the non-jackpot La Isla de Tiki base is excluded and La Isla de Tiki Bote has explicit evidence of a different shared-jackpot family, leaving Tiki Templo as the strongest operational resolution.'
        :'Evidence is insufficient to resolve the operator phrase safely.',
    },
    guards:{
      noSemanticPhraseEqualsExactIdentity:true,
      separateNetworkEvidenceDoesNotProveImpossibilityOfMultiNetworkMembership:true,
      operationalSlugDoesNotEqualExactCounterIdentity:true,
      noEconomicPromotion:true,
      noBetting:true,
      realMoneyAllowed:false,
    },
  };
}
