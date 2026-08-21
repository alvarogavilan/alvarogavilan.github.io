#!/usr/bin/env node
import fs from 'node:fs';
import { canonicalizeGenericRows, detectStableDrops } from './generic-jackpot-identity-v2.mjs';

const FEED='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const VERSION='botemania-generic-fast-reset-ledger-v2-stable-id';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const feed=read(FEED);
const genericRows=Array.isArray(feed?.rows)?feed.rows.filter(r=>r?.network==='generic'):[];
if(!genericRows.length) throw new Error('generic all-network live feed unavailable');
const prior=read(OUT)||{};
const observedAt=feed.observedAt||feed.generatedAt||new Date().toISOString();

const { tracks, quarantined }=canonicalizeGenericRows(genericRows);
const priorIsStable=prior?.version===VERSION;
const newEvents=priorIsStable
  ? detectStableDrops({currentTracks:tracks,priorTracks:prior?.lastTracks||[],observedAt})
  : [];
const existingEvents=priorIsStable&&Array.isArray(prior?.events)?prior.events:[];
const seen=new Set(existingEvents.map(e=>e?.eventKey));
const events=[...existingEvents];
for(const event of newEvents){
  if(!seen.has(event.eventKey)){
    events.push(event);
    seen.add(event.eventKey);
  }
}

const legacyRankBasedEvidence=priorIsStable
  ? (prior?.legacyRankBasedEvidence||null)
  : {
      quarantined:true,
      sourceVersion:prior?.version||null,
      eventCount:Array.isArray(prior?.events)?prior.events.length:0,
      lastEvents:Array.isArray(prior?.events)?prior.events.slice(-25):[],
      reason:'LEGACY_ID_PLUS_SORTED_RANK_CAN_REASSIGN_POOLS_WHEN_ORDER_CHANGES',
      economicPromotionAllowed:false,
    };

const out={
  version:VERSION,
  generatedAt:new Date().toISOString(),
  operator:'botemania-es',
  source:'botemania-all-network-live-state-v1.json',
  sourceFeedGeneratedAt:observedAt,
  coverage:{
    genericRows:genericRows.length,
    stableTrackCount:tracks.length,
    quarantinedIdCount:quarantined.length,
    baselineOnlyBecauseIdentityMigration:!priorIsStable,
  },
  lastTracks:tracks,
  quarantinedIds:quarantined,
  events:events.slice(-1200),
  legacyRankBasedEvidence,
  summary:{
    eventCount:events.length,
    newEventCount:newEvents.length,
    newestEvent:events.length?events[events.length-1]:null,
  },
  interpretation:'Stable generic jackpot ledger sourced from the same fresh all-network sample used by EDGE. Duplicate rows with the same network+ID+amount collapse to one track. Same network+ID with multiple simultaneous amounts is quarantined and never compared across samples. A stable-ID drop remains a candidate only, not proof of a win/reset.',
  guards:{
    publicFeedOnly:true,
    sameFreshAllNetworkSampleAsEdge:true,
    noRankBasedIdentity:true,
    equalAmountAliasesCollapsed:true,
    conflictingAmountIdsQuarantined:true,
    migrationStartsFreshBaseline:true,
    noAuthentication:true,
    noCookies:true,
    noBetting:true,
    noDropEqualsWinAssumption:true,
    noEconomicPromotionFromLedgerAlone:true,
    realMoneyAllowed:false,
  },
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({coverage:out.coverage,summary:out.summary,quarantinedIds:out.quarantinedIds},null,2));
