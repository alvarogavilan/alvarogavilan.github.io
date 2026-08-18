#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai/casino/lightning';
const DATA=`${ROOT}/data/casinoorg-lightningroulette.jsonl`;
const COLLECTOR=`${ROOT}/evidence/casinoorg-api-collector.json`;
const OBSERVER=`${ROOT}/evidence/public-observer.json`;
const OUT=`${ROOT}/evidence/source-staleness-watchdog.json`;

const collector=JSON.parse(fs.readFileSync(COLLECTOR,'utf8'));
const observer=JSON.parse(fs.readFileSync(OBSERVER,'utf8'));
const rows=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const ts=r=>Date.parse(r.ts??r.timestamp??r.observedAt??r.createdAt);
const validTs=rows.map(ts).filter(Number.isFinite);
if(!validTs.length)throw new Error('no timestamped authoritative rows');
const latestRoundMs=Math.max(...validTs),latestRoundAt=new Date(latestRoundMs).toISOString();
const now=Date.now(),collectorMs=Date.parse(collector.generatedAt),observerMs=Date.parse(observer.observedAt);
const mins=x=>Number.isFinite(x)?Math.max(0,(now-x)/60000):null;
const roundLag=mins(latestRoundMs),collectorAge=mins(collectorMs),observerAge=mins(observerMs);
const bucket=m=>m==null?'UNKNOWN':m<15?'LT15M':m<30?'15_30M':m<60?'30_60M':m<120?'60_120M':m<240?'120_240M':'GE240M';
let status='HEALTHY_OR_NO_STALENESS_EVIDENCE';
if(observerAge!=null&&observerAge<=30&&roundLag!=null&&roundLag>=60)status='AUTHORITATIVE_ROUND_SOURCE_STALE_PUBLIC_VISIBILITY_OK';
else if(observerAge!=null&&observerAge>60&&roundLag!=null&&roundLag>=60)status='BOTH_SOURCES_STALE_OR_UNCERTAIN';
else if(roundLag!=null&&roundLag>=60)status='AUTHORITATIVE_ROUND_SOURCE_STALE_PUBLIC_OBSERVER_NOT_FRESH';
const semantic={
  version:'lightning-source-staleness-watchdog-v1',status,
  authoritative:{source:'casinoorg-api',latestRoundAt,totalStored:Number(collector.totalStored)||rows.length,collectorStatus:Number(collector.status)||null,roundLagBucket:bucket(roundLag),collectorAgeBucket:bucket(collectorAge)},
  independentObserver:{source:observer.source||'tracksino-public-web',observedAt:observer.observedAt||null,visibility:Boolean(observer.detected?.lightningRoulette&&observer.detected?.roundHistory),observerAgeBucket:bucket(observerAge),roundLevelData:Boolean(observer.roundLevelData),trainingEligible:Boolean(observer.trainingEligible)},
  policy:{aggregateObserverMayReplaceRoundCorpus:false,automaticSourcePromotion:false,requiresRoundLevelLuckyMultiplierData:true,requiresIndependentProvenanceAuditBeforeAlternateSource:true},
  action:status==='AUTHORITATIVE_ROUND_SOURCE_STALE_PUBLIC_VISIBILITY_OK'?'Investigate authoritative API freshness or a separately audited round-level source. Do not ingest aggregate observer data.':status==='HEALTHY_OR_NO_STALENESS_EVIDENCE'?'No source substitution action. Continue normal authoritative capture.':'Keep scientific prospectives paused on missing authoritative rounds; investigate source visibility without substituting unqualified data.',
  guards:{trainingDataMutation:false,prospectiveOutcomeMutation:false,realMoneyAllowed:false}
};
let previous=null;if(fs.existsSync(OUT)){try{previous=JSON.parse(fs.readFileSync(OUT,'utf8'));delete previous.checkedAt;}catch{}}
if(previous&&JSON.stringify(previous)===JSON.stringify(semantic)){console.log(JSON.stringify({changed:false,status,roundLagBucket:semantic.authoritative.roundLagBucket,observerAgeBucket:semantic.independentObserver.observerAgeBucket}));process.exit(0);}
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...semantic,checkedAt:new Date().toISOString()},null,2)+'\n');
console.log(JSON.stringify({changed:true,status,latestRoundAt,roundLagMinutes:roundLag,observerAgeMinutes:observerAge,roundLagBucket:semantic.authoritative.roundLagBucket,observerAgeBucket:semantic.independentObserver.observerAgeBucket,realMoneyAllowed:false},null,2));
