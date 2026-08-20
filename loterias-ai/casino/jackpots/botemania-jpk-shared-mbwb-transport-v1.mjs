#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const MBWB='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-mbwb-v1.json';
const CATALOG='loterias-ai/casino/jackpots/evidence/botemania-progressive-catalog-summary-v1.json';
const IRISH_META='loterias-ai/casino/jackpots/evidence/botemania-irish-metadata-probe-v1.json';
const IRISH_HELP='loterias-ai/casino/jackpots/evidence/blueprint-botemania-irish-help-probe-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-shared-mbwb-transport-v1.json';
const mbwb=read(MBWB)||{},catalog=read(CATALOG)||{},meta=read(IRISH_META)||{},help=read(IRISH_HELP)||{};
const catalogText=JSON.stringify(catalog);
const metaText=JSON.stringify(meta);
const helpText=JSON.stringify(help);
const exactSource=mbwb?.decision?.exactSpainMbwbKnown===true&&Number.isFinite(Number(mbwb?.mustBeWonBeforeEUR?.ROYAL))&&Number.isFinite(Number(mbwb?.mustBeWonBeforeEUR?.REGAL));
const sharedStatement=/compartidos con todos los demás juegos de Blueprint que tengan la funcionalidad de Jackpot King activa/i.test(catalogText)&&/Real|Royal/i.test(catalogText)&&/Majestuoso|Regal/i.test(catalogText);
const irishBlueprint=/"providerId"\s*:\s*"blueprint"/i.test(metaText);
const irishJpk=/irish-riches-megaways-jackpot-king/i.test(metaText)&&/Jackpot King Deluxe|Sistema de Jackpot King Deluxe/i.test(helpText);
const botemaniaEs=mbwb?.operator==='botemania-es'&&meta?.operator==='botemania-es'&&help?.operator==='botemania-es';
const transportValidated=exactSource&&sharedStatement&&irishBlueprint&&irishJpk&&botemaniaEs;
const values=transportValidated?{ROYAL:Number(mbwb.mustBeWonBeforeEUR.ROYAL),REGAL:Number(mbwb.mustBeWonBeforeEUR.REGAL)}:null;
const out={
  version:'botemania-jpk-shared-mbwb-transport-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',targetGame:'irish-riches-megaways-jackpot-king',
  sourceEvidence:{
    sourceGame:mbwb?.game||null,
    evidenceClass:mbwb?.evidenceClass||null,
    capturedAtLocal:mbwb?.capturedAtLocal||null,
    exactSpainMbwbKnown:exactSource,
    mustBeWonBeforeEUR:exactSource?{ROYAL:Number(mbwb.mustBeWonBeforeEUR.ROYAL),REGAL:Number(mbwb.mustBeWonBeforeEUR.REGAL)}:null,
    sourceJackpotsVisibleEUR:mbwb?.jackpotsVisibleEUR||null
  },
  networkEvidence:{
    sharedNetworkStatementPresent:sharedStatement,
    statementMeaning:'Botemania public pages state that Royal/Real, Regal/Majestuoso and Jackpot King pots are shared with all other Blueprint games with Jackpot King active.',
    irishProviderBlueprint:irishBlueprint,
    irishJackpotKingDeluxeConfirmed:irishJpk,
    sameOperatorSpain:botemaniaEs
  },
  decision:{
    exactSpainMbwbTransportValidatedForIrish:transportValidated,
    exactSpainMbwbKnownForIrish:transportValidated,
    mustBeWonBeforeEUR:values,
    economicPromotionAllowedByThisEvidenceAlone:false,
    realMoneyAllowed:false
  },
  guards:{
    sameOperatorOnly:true,
    sharedNetworkStatementRequired:true,
    exactInGameSourceRequired:true,
    noCrossOperatorSubstitution:true,
    noHazardInferenceFromMbwbAlone:true,
    noEconomicPromotionFromMbwbAlone:true,
    noBetting:true,
    realMoneyAllowed:false
  }
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
