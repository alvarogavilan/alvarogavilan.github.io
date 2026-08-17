#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base='https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette';
const root='loterias-ai/casino/lightning';
const outFile=path.join(root,'data','casinoorg-lightningroulette.jsonl');
const evidenceFile=path.join(root,'evidence','casinoorg-page-backfill.json');
const maxPages=Math.max(20,Math.min(500,Number(process.env.LIGHTNING_MAX_PAGES||200)));
const pageSize=Math.max(30,Math.min(100,Number(process.env.LIGHTNING_PAGE_SIZE||100)));
const delayMs=Math.max(100,Math.min(2000,Number(process.env.LIGHTNING_DELAY_MS||150)));
fs.mkdirSync(path.dirname(outFile),{recursive:true});
fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});

const existing=new Set();
if(fs.existsSync(outFile)) for(const line of fs.readFileSync(outFile,'utf8').split(/\r?\n/).filter(Boolean)){
  try{const r=JSON.parse(line);if(r.roundId) existing.add(String(r.roundId));}catch{}
}

let accepted=0,duplicates=0,rejected=0,pagesFetched=0;const pageReports=[];const rows=[];let previousFingerprint=null,consecutiveAllDuplicate=0;
for(let page=1;page<=maxPages;page++){
  const endpoint=`${base}?page=${page}&size=${pageSize}`;
  let res=await fetch(endpoint,{headers:{accept:'application/json','user-agent':'LoteriasAI-research/1.0'}});
  if(res.status===429){await new Promise(r=>setTimeout(r,2500));res=await fetch(endpoint,{headers:{accept:'application/json','user-agent':'LoteriasAI-research/1.0'}})}
  const text=await res.text();
  if(!res.ok){pageReports.push({page,status:res.status,count:0});break}
  let payload;try{payload=JSON.parse(text)}catch{pageReports.push({page,status:res.status,count:0,invalidJson:true});break}
  const items=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];
  const ids=items.map(x=>String(x?.id??x?.data?.id??'')).filter(Boolean);
  const fingerprint=crypto.createHash('sha256').update(ids.join('|')).digest('hex');
  let pageNew=0,pageDup=0;
  if(items.length===0||fingerprint===previousFingerprint){pageReports.push({page,status:res.status,count:items.length,stopped:'empty_or_repeated_page'});break}
  previousFingerprint=fingerprint;pagesFetched++;
  for(const item of items){
    const d=item?.data||item;const roundId=String(item?.id||d?.id||'');const timestamp=d?.settledAt||d?.startedAt||null;const winner=Number(d?.result?.outcome?.number);const lucky=Array.isArray(d?.result?.luckyNumbersList)?d.result.luckyNumbersList:[];
    if(!roundId||!timestamp||!Number.isInteger(winner)||winner<0||winner>36){rejected++;continue}
    if(existing.has(roundId)){duplicates++;pageDup++;continue}
    const allLuckyNumbers=[],allLuckyMultipliers=[];
    for(const x of lucky){const n=Number(x?.number),m=Number(x?.roundedMultiplier??x?.multiplier);if(Number.isInteger(n)&&n>=0&&n<=36&&Number.isFinite(m)&&m>0){allLuckyNumbers.push(n);allLuckyMultipliers.push(m)}}
    rows.push({source:'casinoorg-evolution-public-api',sourceRole:'PRIMARY_STRUCTURED_PUBLIC',endpoint,roundId,timestamp,winner,allLuckyNumbers,allLuckyMultipliers,roundIdQuality:'authoritative_source_id',timestampQuality:'authoritative_settled_at',trainingEligible:true,confidenceTier:'A',rawHash:crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex'),realMoney:false});
    existing.add(roundId);accepted++;pageNew++;
  }
  pageReports.push({page,status:res.status,count:items.length,firstId:ids[0]??null,lastId:ids.at(-1)??null,fingerprint,newRows:pageNew,duplicates:pageDup});
  consecutiveAllDuplicate=pageNew===0?consecutiveAllDuplicate+1:0;
  if(consecutiveAllDuplicate>=20 && page>30) break;
  await new Promise(r=>setTimeout(r,delayMs));
}
if(rows.length) fs.appendFileSync(outFile,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
const report={generatedAt:new Date().toISOString(),base,pagesFetched,maxPages,pageSize,delayMs,accepted,duplicates,rejected,totalStored:existing.size,pageReports,authenticationBypassAttempted:false,publicReadOnlyAcquisition:true,aggregateDataAccepted:false,syntheticDataAccepted:false,realMoney:false};
fs.writeFileSync(evidenceFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pagesFetched,maxPages,pageSize,accepted,duplicates,rejected,totalStored:existing.size},null,2));
