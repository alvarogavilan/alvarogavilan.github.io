#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ENDPOINT='https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette';
const LEGACY_CORPUS='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const ACTIVE_SEGMENT='loterias-ai/casino/lightning/data/casinoorg-lightningroulette-segment-v2.jsonl';
const OUT='loterias-ai/casino/lightning/evidence/casinoorg-source-head-probe.json';
const now=new Date();
const checkedHour=now.toISOString().slice(0,13)+':00:00Z';
const res=await fetch(ENDPOINT,{headers:{accept:'application/json','user-agent':'LoteriasAI-source-head-probe/1.1','cache-control':'no-cache, no-store, max-age=0',pragma:'no-cache'}});
const text=await res.text();
const responseSha256=crypto.createHash('sha256').update(text).digest('hex');
let payload=null,parseError=null;try{payload=JSON.parse(text)}catch(e){parseError=String(e?.message||e)}
const items=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];
function parseItem(item){const d=item?.data||item;const roundId=String(item?.id||d?.id||'');const timestamp=d?.settledAt||d?.startedAt||null;const winner=Number(d?.result?.outcome?.number);return{roundId,timestamp:Number.isNaN(Date.parse(timestamp))?null:new Date(timestamp).toISOString(),winner:Number.isInteger(winner)&&winner>=0&&winner<=36?winner:null};}
const parsed=items.map(parseItem).filter(x=>x.roundId&&x.timestamp&&x.winner!==null).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
const sourceLatest=parsed.at(-1)||null;
function readCorpusLatest(file){
  let latest=null,rows=0;
  if(!fs.existsSync(file))return{latest,rows};
  for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean)){
    try{const r=JSON.parse(line),timestamp=r.timestamp??r.ts;const t=Date.parse(timestamp);if(!Number.isFinite(t))continue;rows++;const candidate={roundId:String(r.roundId||''),timestamp:new Date(t).toISOString(),winner:Number(r.winner)};if(!latest||candidate.timestamp>latest.timestamp)latest=candidate;}catch{}
  }
  return{latest,rows};
}
const legacy=readCorpusLatest(LEGACY_CORPUS);
const active=readCorpusLatest(ACTIVE_SEGMENT);
const corpusLatest=active.latest||legacy.latest;
const corpusRows=active.rows||legacy.rows;
const sourceMs=Date.parse(sourceLatest?.timestamp),activeMs=Date.parse(corpusLatest?.timestamp),nowMs=Date.now();
const lagMin=Number.isFinite(sourceMs)?Math.max(0,(nowMs-sourceMs)/60000):null;
const headGapMin=Number.isFinite(sourceMs)&&Number.isFinite(activeMs)?Math.max(0,(sourceMs-activeMs)/60000):null;
const bucket=m=>m==null?'UNKNOWN':m<15?'LT15M':m<30?'15_30M':m<60?'30_60M':m<120?'60_120M':m<240?'120_240M':'GE240M';
const semantic={
  version:'casinoorg-source-head-probe-v2',
  checkedHour,
  endpoint:ENDPOINT,
  httpStatus:res.status,
  httpOk:res.ok,
  contentType:res.headers.get('content-type'),
  parseError,
  received:items.length,
  validParsed:parsed.length,
  responseSha256,
  sourceLatest,
  activeCorpus:{segment:active.rows?'authoritative-v2':'legacy-v1-fallback',latest:corpusLatest,rows:corpusRows},
  legacyCorpus:{latest:legacy.latest,rows:legacy.rows,retiredFromScheduledCapture:true},
  corpusLatest,
  corpusRows,
  sourceLatestLagBucket:bucket(lagMin),
  sourceToActiveCorpusGapBucket:bucket(headGapMin),
  sourceAheadOfCorpus:Boolean(sourceLatest&&corpusLatest&&sourceLatest.timestamp>corpusLatest.timestamp),
  sourceSameHeadAsCorpus:Boolean(sourceLatest&&corpusLatest&&sourceLatest.roundId===corpusLatest.roundId),
  policy:{diagnosticOnly:true,activeContinuityReference:'authoritative-v2',mayMutateCorpus:false,mayAdvanceProspectives:false,authenticationBypassAttempted:false},
  guards:{trainingDataMutation:false,prospectiveOutcomeMutation:false,realMoneyAllowed:false}
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(semantic,null,2)+'\n');
console.log(JSON.stringify({...semantic,sourceLatestLagMinutes:lagMin,sourceToActiveCorpusGapMinutes:headGapMin},null,2));
if(!res.ok||parseError||!sourceLatest)process.exitCode=1;
