#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DOSSIER='loterias-ai/casino/archive/evidence/botemania-winfall-economics-dossier-v1.json';
const TIKI='loterias-ai/edge-live/evidence/botemania-tiki-templo-closure-v1.json';
const NETWORK='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const PAIRED='loterias-ai/casino/jackpots/evidence/tiki-alice-paired-reset-relationship-v1.json';
const LINEAGE='loterias-ai/casino/jackpots/evidence/winfall-tiki-wonderland-lineage-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/winfall-tiki-network-bridge-v1.json';
export const CANDIDATE_FEED_KEY='generic:tikitemple2_1';

const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};

export function officialRuleNamesTikiTemplo(dossier={}){
  const partners=dossier?.dossier?.sharedNetwork?.officiallyClaimedPartners||dossier?.sharedNetwork?.officiallyClaimedPartners||[];
  return Array.isArray(partners)&&partners.some(x=>norm(x).includes('tiki')&&norm(x).includes('templo'));
}

export function buildWinfallTikiBridge({dossier={},tikiClosure={},network={},pairedRelationship={},lineage={},nowMs=Date.now(),maxAgeSeconds=180}={}){
  const officialSharedPotRule=officialRuleNamesTikiTemplo(dossier);
  const identity=tikiClosure?.identityClosure||{};
  const candidateFeedKey=identity?.feedKey||CANDIDATE_FEED_KEY;
  const exactTikiCounterVerified=identity?.verified===true&&candidateFeedKey===CANDIDATE_FEED_KEY;
  const sameExactMeterAliasDisproved=tikiClosure?.aliasClosure?.sameExactMeterDisproved===true;
  const paired=pairedRelationship?.relationship||pairedRelationship||{};
  const pairedResetCouplingCandidate=paired?.pairedResetCouplingCandidate===true;
  const pairedResetCouplingVerified=paired?.pairedResetCouplingVerified===true;
  const independentPairedResetCount=Number.isFinite(Number(paired?.independentPairedResetCount))?Number(paired.independentPairedResetCount):0;
  const historicalLineageCorroborated=lineage?.interpretation?.tikiWonderlandRelationshipHasIndependentHistoricalLineageSupport===true&&lineage?.guards?.noIdentityPromotionFromLineageAlone===true;
  const exactLiveIdVerified=officialSharedPotRule&&exactTikiCounterVerified;
  const observedAt=network?.observedAt||network?.generatedAt||null;
  const observedMs=Date.parse(observedAt||'');
  const sourceAgeSeconds=Number.isFinite(observedMs)?Math.max(0,Math.floor((nowMs-observedMs)/1000)):null;
  const sourceFresh=sourceAgeSeconds!==null&&sourceAgeSeconds<=maxAgeSeconds;
  const row=network?.currentByKey?.[CANDIDATE_FEED_KEY]||null;
  const candidateMeterEUR=finite(row?.amountEUR);
  const currentJackpotEUR=exactLiveIdVerified&&sourceFresh?candidateMeterEUR:null;
  const blockers=[];
  if(!officialSharedPotRule)blockers.push('OFFICIAL_WINDFALL_TIKI_SHARED_POT_RULE_NOT_VERIFIED');
  if(!exactTikiCounterVerified)blockers.push('TIKI_TEMPLO_EXACT_COUNTER_IDENTITY_NOT_VERIFIED');
  if(!sourceFresh)blockers.push('LIVE_SOURCE_NOT_FRESH');
  if(candidateMeterEUR===null)blockers.push('CANDIDATE_METER_NOT_PRESENT');
  blockers.push('WINDFALL_TRIGGER_HAZARD_NOT_VERIFIED');
  return {
    structuralBridge:{
      officialWinfallSharesPotWithTikiTemplo:officialSharedPotRule,
      historicalGamesysTikiWonderlandLineageCorroborated:historicalLineageCorroborated,
      pairedResetCouplingCandidate,
      pairedResetCouplingVerified,
      independentPairedResetCount,
      tikiTemploExactCounterVerified:exactTikiCounterVerified,
      candidateFeedKey:CANDIDATE_FEED_KEY,
      exactLiveIdVerified,
      derivation:exactLiveIdVerified?'OFFICIAL_SHARED_POT_RULE_PLUS_INDEPENDENT_EXACT_PARTNER_COUNTER_IDENTITY':'CANDIDATE_ONLY_NOT_PROMOTED',
      progressiveAliceSameExactMeterDisproved:sameExactMeterAliasDisproved,
      evidenceLadder:[
        officialSharedPotRule?'CURRENT_OPERATOR_SHARED_POT_RULE':'CURRENT_OPERATOR_RULE_MISSING',
        historicalLineageCorroborated?'HISTORICAL_GAMESYS_TIKI_WONDERLAND_LINEAGE':'NO_EXTERNAL_LINEAGE_CREDIT',
        pairedResetCouplingVerified?'SECOND_INDEPENDENT_PAIRED_RESET_VERIFIED':pairedResetCouplingCandidate?'ONE_FROZEN_PAIRED_RESET_DISCOVERY':'NO_PAIRED_RESET_CANDIDATE',
        exactTikiCounterVerified?'EXACT_TIKI_COUNTER_IDENTITY':'EXACT_TIKI_COUNTER_IDENTITY_PENDING'
      ]
    },
    current:{observedAt,sourceAgeSeconds,sourceFresh,candidateMeterEUR,currentJackpotEUR},
    decision:{
      exactLiveIdVerified,
      identityPromotionAllowed:exactLiveIdVerified,
      economicPromotionAllowed:false,
      currentPositiveEvProven:false,
      realMoneyAllowed:false,
      automaticBettingAllowed:false,
      blockers,
    },
    guards:{
      lineageNeverIdentityProof:true,
      pairedResetCouplingNeverIdentityProof:true,
      semanticFeedNameNeverIdentityProof:true,
      amountEqualityNeverIdentityProof:true,
      partnerIdentityRequiredBeforeTransitiveBinding:true,
      staleMeterNeverCurrentJackpot:true,
      exactAliasDisproofPreserved:true,
      sharedPotIdentityNeverEqualsPositiveEv:true,
      noBetting:true,
      realMoneyAllowed:false,
    },
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return {};}};
  const bridge=buildWinfallTikiBridge({dossier:read(DOSSIER),tikiClosure:read(TIKI),network:read(NETWORK),pairedRelationship:read(PAIRED),lineage:read(LINEAGE)});
  const out={version:'winfall-tiki-network-bridge-v1.1-evidence-ladder',generatedAt:new Date().toISOString(),operator:'botemania-es',target:'winfall-wishes-jackpot',...bridge};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
}
