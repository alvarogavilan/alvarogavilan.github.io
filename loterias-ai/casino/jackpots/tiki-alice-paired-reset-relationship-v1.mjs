#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const LEDGER='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const DOSSIER='loterias-ai/casino/archive/evidence/botemania-winfall-economics-dossier-v1.json';
const DIVERGENCE='loterias-ai/edge-live/evidence/tiki-alice-simultaneous-divergence-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/tiki-alice-paired-reset-relationship-v1.json';

export const TIKI_ID='tikitemple2_1';
export const ALICE_ID='progressivealice1';
export const DISCOVERY_RESET_AT='2026-08-21T14:44:06.603Z';
export const REQUIRED_INDEPENDENT_PAIRED_RESETS=2;

const finite=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const resetLike=e=>['CONFIRMED_METER_RESET','CONFIRMED_RESET'].includes(String(e?.classification||''));

function pairedEvents(events=[]){
  const byTime=new Map();
  for(const e of events){
    if(!resetLike(e)||e?.network!=='generic'||![TIKI_ID,ALICE_ID].includes(String(e?.id||'')))continue;
    const t=String(e?.observedAt||'');if(!t)continue;
    if(!byTime.has(t))byTime.set(t,{});
    byTime.get(t)[e.id]=e;
  }
  const out=[];
  for(const [observedAt,pair] of byTime){
    const tiki=pair[TIKI_ID],alice=pair[ALICE_ID];if(!tiki||!alice)continue;
    const tp=finite(tiki.previousEUR),ap=finite(alice.previousEUR),tc=finite(tiki.currentEUR),ac=finite(alice.currentEUR);
    const sameTransition=tp!==null&&ap!==null&&tc!==null&&ac!==null&&Math.abs(tp-ap)<=0.01&&Math.abs(tc-ac)<=0.01;
    if(!sameTransition)continue;
    out.push({
      observedAt,
      tiki:{previousEUR:tp,currentEUR:tc,eventKey:tiki.eventKey||null},
      alice:{previousEUR:ap,currentEUR:ac,eventKey:alice.eventKey||null},
      sameTransition:true,
      isFrozenDiscoveryEvent:observedAt===DISCOVERY_RESET_AT,
    });
  }
  return out.sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
}

export function evaluatePairedResetRelationship({ledger={},dossier={},divergence={}}={}){
  const events=Array.isArray(ledger?.events)?ledger.events:[];
  const pairs=pairedEvents(events);
  const officialPartners=dossier?.dossier?.sharedNetwork?.officiallyClaimedPartners||[];
  const operatorRuleSupportsCoupling=officialPartners.includes('Wonderland')&&officialPartners.includes('La Isla de Tiki Templo');
  const exactAliasDisproved=divergence?.conclusion?.exactAliasDisproved===true||divergence?.conclusion?.sameExactMeterDisproved===true;
  const frozenDiscoveryPresent=pairs.some(x=>x.isFrozenDiscoveryEvent);
  const prospectivePairs=pairs.filter(x=>!x.isFrozenDiscoveryEvent&&Date.parse(x.observedAt)>Date.parse(DISCOVERY_RESET_AT));
  const independentPairedResetCount=(frozenDiscoveryPresent?1:0)+prospectivePairs.length;
  const pairedResetCouplingVerified=operatorRuleSupportsCoupling&&exactAliasDisproved&&frozenDiscoveryPresent&&independentPairedResetCount>=REQUIRED_INDEPENDENT_PAIRED_RESETS;
  return {
    pairIds:[`generic:${TIKI_ID}`,`generic:${ALICE_ID}`],
    operatorRuleSupportsCoupling,
    exactAliasDisproved,
    frozenDiscoveryPresent,
    frozenDiscoveryResetAt:DISCOVERY_RESET_AT,
    prospectivePairedResetCount:prospectivePairs.length,
    independentPairedResetCount,
    requiredIndependentPairedResets:REQUIRED_INDEPENDENT_PAIRED_RESETS,
    pairedResetCouplingCandidate:operatorRuleSupportsCoupling&&exactAliasDisproved&&frozenDiscoveryPresent,
    pairedResetCouplingVerified,
    exactAliasVerified:false,
    exactGameIdentityVerified:false,
    winfallExactLiveIdVerified:false,
    economicPromotionAllowed:false,
    realMoneyAllowed:false,
    pairedEvents:pairs,
    nextStep:pairedResetCouplingVerified
      ?'COUPLED_RESET_RELATIONSHIP_VERIFIED_NARROWLY; KEEP_GAME_IDENTITY_AND_ECONOMICS_SEPARATE'
      :'WAIT_FOR_SECOND_INDEPENDENT_SYNCHRONIZED_RESET_AFTER_FROZEN_DISCOVERY_EVENT',
  };
}

export function buildEvidence({ledger={},dossier={},divergence={}}={}){
  const relationship=evaluatePairedResetRelationship({ledger,dossier,divergence});
  return {
    version:'tiki-alice-paired-reset-relationship-v1',
    generatedAt:new Date().toISOString(),
    operator:'botemania-es',
    hypothesis:{
      operatorClaim:'Winfall Wishes Jackpot shares its progressive pot with Wonderland and La Isla de Tiki Templo and all reset together after an award.',
      feedCandidates:{tikiTemplo:`generic:${TIKI_ID}`,wonderland:`generic:${ALICE_ID}`},
      scope:'TEST_COUPLED_RESET_RELATIONSHIP_ONLY_NOT_EXACT_ALIAS_OR_GAME_IDENTITY',
    },
    relationship,
    guards:{
      firstResetFrozenBeforeProspectiveReplication:true,
      secondIndependentPairedResetRequired:true,
      exactAliasDisproofIsMonotonic:true,
      pairedResetCouplingNeverEqualsExactGameIdentity:true,
      pairedResetCouplingNeverEqualsWinfallLiveId:true,
      noAmountEqualityIdentityInference:true,
      noJackpotWinAttributionFromMeterReset:true,
      noHazardInferenceFromTwoResets:true,
      noBetting:true,
      realMoneyAllowed:false,
    },
  };
}

const isEntrypoint=Boolean(process.argv[1])&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isEntrypoint){
  const out=buildEvidence({ledger:read(LEDGER)||{},dossier:read(DOSSIER)||{},divergence:read(DIVERGENCE)||{}});
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({relationship:out.relationship,guards:out.guards},null,2));
}
