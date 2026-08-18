#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai/casino/lightning';
const LEGACY_DATA=`${ROOT}/data/casinoorg-lightningroulette.jsonl`;
const ACTIVE_DATA=`${ROOT}/data/casinoorg-lightningroulette-segment-v2.jsonl`;
const COLLECTOR=`${ROOT}/evidence/casinoorg-api-collector.json`;
const OBSERVER=`${ROOT}/evidence/public-observer.json`;
const PROBE=`${ROOT}/evidence/casinoorg-source-head-probe.json`;
const OUT=`${ROOT}/evidence/source-staleness-watchdog.json`;

const collector=JSON.parse(fs.readFileSync(COLLECTOR,'utf8'));
const observer=JSON.parse(fs.readFileSync(OBSERVER,'utf8'));
const probe=fs.existsSync(PROBE)?JSON.parse(fs.readFileSync(PROBE,'utf8')):null;
const dataPath=fs.existsSync(ACTIVE_DATA)?ACTIVE_DATA:LEGACY_DATA;
const rows=fs.readFileSync(dataPath,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const ts=r=>Date.parse(r.ts??r.timestamp??r.observedAt??r.createdAt);
const validTs=rows.map(ts).filter(Number.isFinite);
if(!validTs.length)throw new Error('no timestamped authoritative rows');
const latestRoundMs=Math.max(...validTs),latestRoundAt=new Date(latestRoundMs).toISOString();
const now=Date.now(),collectorMs=Date.parse(collector.generatedAt),observerMs=Date.parse(observer.observedAt),probeSourceMs=Date.parse(probe?.sourceLatest?.timestamp),probeCheckedMs=Date.parse(probe?.checkedHour);
const mins=x=>Number.isFinite(x)?Math.max(0,(now-x)/60000):null;
const roundLag=mins(latestRoundMs),collectorAge=mins(collectorMs),observerAge=mins(observerMs),sourceHeadLag=mins(probeSourceMs),probeAge=mins(probeCheckedMs);
const bucket=m=>m==null?'UNKNOWN':m<15?'LT15M':m<30?'15_30M':m<60?'30_60M':m<120?'60_120M':m<240?'120_240M':'GE240M';
const freshProbe=Boolean(probe?.httpOk&&probe?.sourceLatest&&probeAge!=null&&probeAge<90);
const probeActiveLatest=probe?.activeCorpus?.latest??probe?.corpusLatest??null;
const sourceAhead=Boolean(freshProbe&&probe.sourceLatest&&probeActiveLatest&&probe.sourceLatest.timestamp>latestRoundAt&&probe.sourceLatest.timestamp>probeActiveLatest.timestamp);
let status='HEALTHY_OR_NO_STALENESS_EVIDENCE';
if(sourceAhead&&sourceHeadLag!=null&&sourceHeadLag<30)status='SOURCE_FRESH_ACTIVE_SEGMENT_INGESTION_LAGGING';
else if(freshProbe&&sourceHeadLag!=null&&sourceHeadLag>=60)status='AUTHORITATIVE_SOURCE_HEAD_STALE_CONFIRMED';
else if(observerAge!=null&&observerAge<=30&&roundLag!=null&&roundLag>=60)status='ACTIVE_SEGMENT_STALE_PUBLIC_VISIBILITY_OK_SOURCE_HEAD_UNCERTAIN';
else if(observerAge!=null&&observerAge>60&&roundLag!=null&&roundLag>=60)status='ACTIVE_SEGMENT_AND_OBSERVERS_STALE_OR_UNCERTAIN';
else if(roundLag!=null&&roundLag>=60)status='ACTIVE_SEGMENT_STALE_SOURCE_HEAD_UNCERTAIN';
const actionByStatus={
  SOURCE_FRESH_ACTIVE_SEGMENT_INGESTION_LAGGING:'Repair or rerun clean-segment v2 capture/recovery; do not reactivate legacy v1 or substitute an unaudited source.',
  AUTHORITATIVE_SOURCE_HEAD_STALE_CONFIRMED:'Keep active prospectives paused and investigate an independently audited round-level source; do not ingest aggregate observer data.',
  ACTIVE_SEGMENT_STALE_PUBLIC_VISIBILITY_OK_SOURCE_HEAD_UNCERTAIN:'Probe the authoritative source head directly before any source substitution.',
  ACTIVE_SEGMENT_AND_OBSERVERS_STALE_OR_UNCERTAIN:'Keep scientific prospectives paused; source state is uncertain.',
  ACTIVE_SEGMENT_STALE_SOURCE_HEAD_UNCERTAIN:'Probe the authoritative source head directly; do not infer game behavior from missing data.',
  HEALTHY_OR_NO_STALENESS_EVIDENCE:'No source substitution action. Continue normal clean-segment v2 capture.'
};
const semantic={
  version:'lightning-source-staleness-watchdog-v3',status,
  authoritativeCorpus:{source:'casinoorg-api',activeSegment:dataPath===ACTIVE_DATA?'authoritative-v2':'legacy-v1-fallback',latestRoundAt,totalStored:rows.length,collectorStatus:Number(collector.status)||null,roundLagBucket:bucket(roundLag),collectorAgeBucket:bucket(collectorAge)},
  authoritativeSourceProbe:probe?{httpOk:Boolean(probe.httpOk),checkedHour:probe.checkedHour||null,sourceLatest:probe.sourceLatest||null,activeCorpus:probe.activeCorpus||null,sourceHeadLagBucket:bucket(sourceHeadLag),probeAgeBucket:bucket(probeAge),sourceAheadOfActiveSegment:sourceAhead,responseSha256:probe.responseSha256||null}:null,
  independentObserver:{source:observer.source||'tracksino-public-web',observedAt:observer.observedAt||null,visibility:Boolean(observer.detected?.lightningRoulette&&observer.detected?.roundHistory),observerAgeBucket:bucket(observerAge),roundLevelData:Boolean(observer.roundLevelData),trainingEligible:Boolean(observer.trainingEligible)},
  policy:{legacyV1MayResumeScheduledCapture:false,aggregateObserverMayReplaceRoundCorpus:false,automaticSourcePromotion:false,requiresRoundLevelLuckyMultiplierData:true,requiresIndependentProvenanceAuditBeforeAlternateSource:true},
  action:actionByStatus[status],
  guards:{trainingDataMutation:false,prospectiveOutcomeMutation:false,realMoneyAllowed:false}
};
let previous=null;if(fs.existsSync(OUT)){try{previous=JSON.parse(fs.readFileSync(OUT,'utf8'));delete previous.checkedAt;}catch{}}
if(previous&&JSON.stringify(previous)===JSON.stringify(semantic)){console.log(JSON.stringify({changed:false,status,roundLagBucket:semantic.authoritativeCorpus.roundLagBucket,sourceHeadLagBucket:semantic.authoritativeSourceProbe?.sourceHeadLagBucket||'UNKNOWN'}));process.exit(0);}
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...semantic,checkedAt:new Date().toISOString()},null,2)+'\n');
console.log(JSON.stringify({changed:true,status,activeSegment:semantic.authoritativeCorpus.activeSegment,latestRoundAt,roundLagMinutes:roundLag,sourceHeadLagMinutes:sourceHeadLag,sourceAheadOfActiveSegment:sourceAhead,realMoneyAllowed:false},null,2));
