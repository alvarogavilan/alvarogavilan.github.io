#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/economic-number-selection-prospective-freeze-v1.json';
const OUT='loterias-ai/casino/lightning/evidence/prospective-capture-continuity-v1.json';
const API_WINDOW_ROWS=30;
const SCHEDULE_MINUTES=5;

const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const startMs=Date.parse(freeze.prospectiveStartsAt);
if(!Number.isFinite(startMs)) throw new Error('Invalid prospective start');

function ts(r){const v=Date.parse(r.timestamp??r.ts??r.observedAt??r.createdAt);return Number.isFinite(v)?v:null;}
function q(sorted,p){if(!sorted.length)return null;const i=Math.min(sorted.length-1,Math.max(0,Math.floor((sorted.length-1)*p)));return sorted[i];}
function round(v,d=3){return Number.isFinite(v)?Number(v.toFixed(d)):null;}

const all=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map((s,i)=>({...JSON.parse(s),_i:i}))
  .filter(r=>r.trainingEligible!==false&&r.source==='casinoorg-evolution-public-api'&&r.roundId&&ts(r)!=null)
  .map(r=>({...r,_ts:ts(r)})).sort((a,b)=>a._ts-b._ts||a._i-b._i);
const future=all.filter(r=>r._ts>=startMs);
const duplicateRoundIds=future.length-new Set(future.map(r=>String(r.roundId))).size;
const intervals=[];
for(let i=1;i<future.length;i++) intervals.push((future[i]._ts-future[i-1]._ts)/1000);
const sorted=[...intervals].sort((a,b)=>a-b);
const first=future[0]?._ts??null,last=future.at(-1)?._ts??null;
const elapsedHours=future.length>=2&&last>first?(last-first)/3600000:null;
const roundsPerHour=elapsedHours&&elapsedHours>0?(future.length-1)/elapsedHours:null;
const apiWindowCoverageMinutes=roundsPerHour&&roundsPerHour>0?API_WINDOW_ROWS/roundsPerHour*60:null;
const windowToCadenceRatio=apiWindowCoverageMinutes?apiWindowCoverageMinutes/SCHEDULE_MINUTES:null;
const over120=intervals.filter(x=>x>120).length,over300=intervals.filter(x=>x>300).length;

const result={
  version:'prospective-capture-continuity-v1',
  generatedAt:new Date().toISOString(),
  prospectiveStartsAt:freeze.prospectiveStartsAt,
  source:{file:DATA,endpointWindowRows:API_WINDOW_ROWS,scheduledCaptureCadenceMinutes:SCHEDULE_MINUTES},
  futureRounds:future.length,
  firstFutureRoundAt:first?new Date(first).toISOString():null,
  lastFutureRoundAt:last?new Date(last).toISOString():null,
  duplicateAuthoritativeRoundIds:duplicateRoundIds,
  cadence:{
    observedRoundsPerHour:round(roundsPerHour),
    medianInterRoundSeconds:round(q(sorted,.5)),
    p95InterRoundSeconds:round(q(sorted,.95)),
    maxInterRoundSeconds:round(sorted.at(-1)),
    gapsOver120Seconds:over120,
    gapsOver300Seconds:over300
  },
  endpointWindowSafety:{
    estimatedMinutesRepresentedBy30LatestRows:round(apiWindowCoverageMinutes),
    scheduledCadenceMinutes:SCHEDULE_MINUTES,
    estimatedWindowToCadenceRatio:round(windowToCadenceRatio),
    warning:windowToCadenceRatio!=null&&windowToCadenceRatio<2?'LOW_CAPTURE_MARGIN':null
  },
  guards:{
    descriptiveOnly:true,
    doesNotUseWinnerValuesForScientificSelection:true,
    doesNotChangeFreeze:true,
    doesNotChangeProspectiveBoundaries:true,
    realMoneyAllowed:false
  },
  review:{
    continuityReviewRequired:duplicateRoundIds>0||over300>0||(windowToCadenceRatio!=null&&windowToCadenceRatio<2),
    reason:duplicateRoundIds>0?'DUPLICATE_AUTHORITATIVE_IDS':over300>0?'INTERROUND_GAP_OVER_5_MINUTES':(windowToCadenceRatio!=null&&windowToCadenceRatio<2?'ENDPOINT_WINDOW_MARGIN_LOW':null)
  }
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
