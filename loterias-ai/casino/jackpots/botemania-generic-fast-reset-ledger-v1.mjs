#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { canonicalizeGenericRows, detectStableDrops } from './generic-jackpot-identity-v2.mjs';
import { normalizeConfirmedResetEvidence, promoteStableDropEvent, confirmedResetSummary } from './confirmed-reset-evidence-v1.mjs';

const FEED='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const EVIDENCE_DIR='loterias-ai/casino/jackpots/evidence';
const VERSION='botemania-generic-fast-reset-ledger-v2.1-independent-reset-confirmation';
const PRIOR_STABLE_VERSIONS=new Set(['botemania-generic-fast-reset-ledger-v2-stable-id',VERSION]);
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const feed=read(FEED);
const genericRows=Array.isArray(feed?.rows)?feed.rows.filter(r=>r?.network==='generic'):[];
if(!genericRows.length) throw new Error('generic all-network live feed unavailable');
const prior=read(OUT)||{};
const observedAt=feed.observedAt||feed.generatedAt||new Date().toISOString();

const confirmationFiles=fs.existsSync(EVIDENCE_DIR)
  ? fs.readdirSync(EVIDENCE_DIR).filter(f=>/^botemania-.+-reset-confirm-v\d+\.json$/i.test(f)).sort()
  : [];
const independentConfirmations=confirmationFiles
  .map(f=>normalizeConfirmedResetEvidence(read(path.join(EVIDENCE_DIR,f)),{sourceFile:path.join(EVIDENCE_DIR,f)}))
  .filter(Boolean);

const { tracks, quarantined }=canonicalizeGenericRows(genericRows);
const priorIsStable=PRIOR_STABLE_VERSIONS.has(prior?.version);
const rawNewEvents=priorIsStable
  ? detectStableDrops({currentTracks:tracks,priorTracks:prior?.lastTracks||[],observedAt})
  : [];
const newEvents=rawNewEvents.map(e=>promoteStableDropEvent(e,independentConfirmations));
const existingEvents=priorIsStable&&Array.isArray(prior?.events)
  ? prior.events.map(e=>promoteStableDropEvent(e,independentConfirmations))
  : [];
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

const confirmationSummary=confirmedResetSummary(independentConfirmations);
const confirmedEventCount=events.filter(e=>e?.classification==='CONFIRMED_METER_RESET').length;
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
    independentResetConfirmationFilesScanned:confirmationFiles.length,
    validIndependentResetConfirmations:independentConfirmations.length,
  },
  lastTracks:tracks,
  quarantinedIds:quarantined,
  events:events.slice(-1200),
  independentlyConfirmedMeterResets:independentConfirmations,
  legacyRankBasedEvidence,
  summary:{
    eventCount:events.length,
    newEventCount:newEvents.length,
    confirmedMeterResetEventCount:confirmedEventCount,
    independentConfirmedMeterResetCount:confirmationSummary.count,
    newestEvent:events.length?events[events.length-1]:null,
    latestIndependentConfirmation:confirmationSummary.latest,
  },
  interpretation:'Stable generic jackpot ledger sourced from the same fresh all-network sample used by EDGE. Duplicate rows with the same network+ID+amount collapse to one track. Same network+ID with multiple simultaneous amounts is quarantined and never compared across samples. A stable-ID drop is an UNCLASSIFIED_DROP_CANDIDATE unless an independent evidence file with two fresh unique-ID confirmation samples validates the same baseline transition; then it may become CONFIRMED_METER_RESET. A confirmed meter reset is still not proof of a jackpot win, triggering game/tier, exact seed, or positive EV.',
  guards:{
    publicFeedOnly:true,
    sameFreshAllNetworkSampleAsEdge:true,
    noRankBasedIdentity:true,
    equalAmountAliasesCollapsed:true,
    conflictingAmountIdsQuarantined:true,
    migrationStartsFreshBaseline:true,
    independentConfirmationRequiredForConfirmedMeterReset:true,
    noResetEqualsWinAssumption:true,
    noPostResetEqualsExactSeed:true,
    noTriggerAttributionFromReset:true,
    noAuthentication:true,
    noCookies:true,
    noBetting:true,
    noEconomicPromotionFromLedgerAlone:true,
    realMoneyAllowed:false,
  },
};
fs.mkdirSync(EVIDENCE_DIR,{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({coverage:out.coverage,summary:out.summary,independentlyConfirmedMeterResets:out.independentlyConfirmedMeterResets,quarantinedIds:out.quarantinedIds},null,2));
