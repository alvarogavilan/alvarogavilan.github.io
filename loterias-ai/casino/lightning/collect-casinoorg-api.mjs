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

const res=await fetch(endpoint,{headers:{accept:'application/json','user-agent':'LoteriasAI-research/1.0'}});
const text=await res.text();
if(!res.ok) throw new Error(`HTTP ${res.status}`);
let payload; try{payload=JSON.parse(text)}catch{throw new Error('invalid JSON')}
const items=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];

const existing=new Set();
if(fs.existsSync(outFile)){
  for(const line of fs.readFileSync(outFile,'utf8').split(/\r?\n/).filter(Boolean)){
    try{const r=JSON.parse(line); if(r.roundId) existing.add(String(r.roundId));}catch{}
  }
}

let accepted=0,duplicates=0,rejected=0; const rows=[];
for(const item of items){
  const d=item?.data||item;
  const roundId=String(item?.id||d?.id||'');
  const timestamp=d?.settledAt||d?.startedAt||null;
  const winner=Number(d?.result?.outcome?.number);
  const lucky=Array.isArray(d?.result?.luckyNumbersList)?d.result.luckyNumbersList:[];
  if(!roundId||!timestamp||!Number.isInteger(winner)||winner<0||winner>36){rejected++;continue}
  if(existing.has(roundId)){duplicates++;continue}
  const luckyNumbers=[]; const luckyMultipliers=[];
  for(const x of lucky){
    const n=Number(x?.number),m=Number(x?.roundedMultiplier??x?.multiplier);
    if(Number.isInteger(n)&&n>=0&&n<=36&&Number.isFinite(m)&&m>0){luckyNumbers.push(n);luckyMultipliers.push(m)}
  }
  const rawHash=crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex');
  rows.push({source:'casinoorg-evolution-public-api',sourceRole:'PRIMARY_STRUCTURED_PUBLIC',endpoint,roundId,timestamp,winner,allLuckyNumbers:luckyNumbers,allLuckyMultipliers:luckyMultipliers,roundIdQuality:'authoritative_source_id',timestampQuality:'authoritative_settled_at',trainingEligible:true,confidenceTier:'A',rawHash,realMoney:false});
  existing.add(roundId);accepted++;
}
if(rows.length) fs.appendFileSync(outFile,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
const report={generatedAt:new Date().toISOString(),endpoint,status:res.status,received:items.length,accepted,duplicates,rejected,totalStored:existing.size,trainingEligibleRows:true,authenticationBypassAttempted:false,realMoney:false};
fs.writeFileSync(evidenceFile,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
