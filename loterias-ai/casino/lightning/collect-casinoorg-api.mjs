#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const endpoint='https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette';
const root='loterias-ai/casino/lightning';
const outDir=path.join(root,'data');
const outFile=path.join(outDir,'casinoorg-lightningroulette.jsonl');
const evidenceFile=path.join(root,'evidence','casinoorg-api-collector.json');
fs.mkdirSync(outDir,{recursive:true});
fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});

const res=await fetch(endpoint,{headers:{
  accept:'application/json',
  'user-agent':'LoteriasAI-research/1.2',
  'cache-control':'no-cache, no-store, max-age=0',
  pragma:'no-cache'
}});
const text=await res.text();
if(!res.ok) throw new Error(`HTTP ${res.status}`);
let payload; try{payload=JSON.parse(text)}catch{throw new Error('invalid JSON')}
const items=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];
const sourceResponseSha256=crypto.createHash('sha256').update(text).digest('hex');

const existing=new Set();let previousCorpusLatest=null;
if(fs.existsSync(outFile)){
  for(const line of fs.readFileSync(outFile,'utf8').split(/\r?\n/).filter(Boolean)){
    try{
      const r=JSON.parse(line);if(r.roundId)existing.add(String(r.roundId));
      const t=Date.parse(r.timestamp??r.ts);if(Number.isFinite(t)){
        const x={roundId:String(r.roundId||''),timestamp:new Date(t).toISOString(),winner:Number(r.winner)};
        if(!previousCorpusLatest||x.timestamp>previousCorpusLatest.timestamp)previousCorpusLatest=x;
      }
    }catch{}
  }
}

let accepted=0,duplicates=0,rejected=0;const rows=[];let sourceLatest=null;
for(const item of items){
  const d=item?.data||item;
  const roundId=String(item?.id||d?.id||'');
  const timestamp=d?.settledAt||d?.startedAt||null;
  const winner=Number(d?.result?.outcome?.number);
  const lucky=Array.isArray(d?.result?.luckyNumbersList)?d.result.luckyNumbersList:[];
  if(!roundId||!timestamp||Number.isNaN(Date.parse(timestamp))||!Number.isInteger(winner)||winner<0||winner>36){rejected++;continue}
  const iso=new Date(timestamp).toISOString();
  if(!sourceLatest||iso>sourceLatest.timestamp)sourceLatest={roundId,timestamp:iso,winner};
  if(existing.has(roundId)){duplicates++;continue}
  const luckyNumbers=[];const luckyMultipliers=[];
  for(const x of lucky){const n=Number(x?.number),m=Number(x?.roundedMultiplier??x?.multiplier);if(Number.isInteger(n)&&n>=0&&n<=36&&Number.isFinite(m)&&m>0){luckyNumbers.push(n);luckyMultipliers.push(m)}}
  const rawHash=crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex');
  rows.push({source:'casinoorg-evolution-public-api',sourceRole:'PRIMARY_STRUCTURED_PUBLIC',endpoint,roundId,timestamp:iso,winner,allLuckyNumbers:luckyNumbers,allLuckyMultipliers:luckyMultipliers,roundIdQuality:'authoritative_source_id',timestampQuality:'authoritative_settled_at',trainingEligible:true,confidenceTier:'A',rawHash,realMoney:false});
  existing.add(roundId);accepted++;
}
rows.sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.roundId.localeCompare(b.roundId));
const acceptedEarliest=rows[0]?{roundId:rows[0].roundId,timestamp:rows[0].timestamp,winner:rows[0].winner}:null;
const acceptedLatest=rows.at(-1)?{roundId:rows.at(-1).roundId,timestamp:rows.at(-1).timestamp,winner:rows.at(-1).winner}:null;
const continuityBridgeSeconds=previousCorpusLatest&&acceptedEarliest?(Date.parse(acceptedEarliest.timestamp)-Date.parse(previousCorpusLatest.timestamp))/1000:null;
const continuityBridgeSafe=continuityBridgeSeconds==null?accepted===0:Boolean(continuityBridgeSeconds>=0&&continuityBridgeSeconds<=300);
if(rows.length)fs.appendFileSync(outFile,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
const report={generatedAt:new Date().toISOString(),endpoint,status:res.status,received:items.length,accepted,duplicates,rejected,totalStored:existing.size,previousCorpusLatest,acceptedEarliest,acceptedLatest,continuityBridgeSeconds,continuityBridgeSafe,sourceLatest,sourceResponseSha256,cachePolicy:'NO_CACHE_NO_STORE',endpointWindowRows:items.length,trainingEligibleRows:true,authenticationBypassAttempted:false,realMoney:false};
fs.writeFileSync(evidenceFile,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
