#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const API='https://api.trackersino.com';
const SLUG='lightningroulette';
const LIMIT=1000;
const OUT='loterias-ai/casino/lightning/data/trackersino-lightningroulette.jsonl';
const CKPT='loterias-ai/casino/lightning/evidence/trackersino-backfill-checkpoint-v1.json';
const REPORT='loterias-ai/casino/lightning/evidence/trackersino-backfill-report-v1.json';
const key=process.env.TRACKERSINO_API_KEY||'';
const maxPages=Math.max(1,Number(process.env.TRACKERSINO_MAX_PAGES||20));

if(!key){
  const out={version:'trackersino-lightning-backfill-v1',generatedAt:new Date().toISOString(),status:'BLOCKED_MISSING_API_KEY',source:'TrackerSino documented API',endpoint:`${API}/v1-beta/games/${SLUG}/rounds`,limit:LIMIT,maxPages,authenticationBypassAttempted:false,realMoney:false};
  fs.mkdirSync(path.dirname(REPORT),{recursive:true});
  fs.writeFileSync(REPORT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify(out,null,2));
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.mkdirSync(path.dirname(CKPT),{recursive:true});
const existing=fs.existsSync(OUT)?fs.readFileSync(OUT,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const byId=new Map(existing.map(r=>[String(r.round_id??r.round_index),r]));
let until=null;
if(fs.existsSync(CKPT)){
  try{until=JSON.parse(fs.readFileSync(CKPT,'utf8')).until||null;}catch{}
}
let pages=0,received=0,accepted=0,oldest=until,status='OK',lastHttp=200;
while(pages<maxPages){
  const u=new URL(`${API}/v1-beta/games/${SLUG}/rounds`);
  u.searchParams.set('limit',String(LIMIT));
  u.searchParams.set('only_finalized','true');
  if(until) u.searchParams.set('until',until);
  const r=await fetch(u,{headers:{authorization:`Bearer ${key}`,accept:'application/json','user-agent':'LoteriasAI-research/1.0'}});
  lastHttp=r.status;
  if(r.status===429){
    status='RATE_LIMITED';
    break;
  }
  if(!r.ok){status=`HTTP_${r.status}`;break;}
  const rows=await r.json();
  if(!Array.isArray(rows)||rows.length===0){status='EXHAUSTED';break;}
  pages++; received+=rows.length;
  for(const row of rows){
    const winner=Number(row.random_number??row?.raw?.result);
    if(!Number.isInteger(winner)||winner<0||winner>36||!row.finalized_at) continue;
    const id=String(row.round_id??row.round_index);
    if(byId.has(id)) continue;
    const luckies=Array.isArray(row?.raw?.luckies)?row.raw.luckies.map(x=>({number:Number(x.num),multiplier:Number(x.multi)})).filter(x=>Number.isInteger(x.number)&&Number.isFinite(x.multiplier)):[];
    byId.set(id,{source:'trackersino-api',roundId:id,roundIndex:row.round_index??null,timestamp:row.finalized_at,winner,lightningNumbers:luckies,rawMultiplier:row.multiplier??null,state:row.state??null,sourceRaw:row});
    accepted++;
  }
  oldest=rows.at(-1)?.finalized_at||until;
  if(!oldest||oldest===until){status='CURSOR_STALLED';break;}
  until=oldest;
  fs.writeFileSync(CKPT,JSON.stringify({version:1,updatedAt:new Date().toISOString(),until,pages,received,accepted},null,2)+'\n');
  await new Promise(r=>setTimeout(r,600));
}
const all=[...byId.values()].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
fs.writeFileSync(OUT,all.map(x=>JSON.stringify(x)).join('\n')+(all.length?'\n':''));
const report={version:'trackersino-lightning-backfill-v1',generatedAt:new Date().toISOString(),status,lastHttp,pages,received,accepted,totalStored:all.length,oldestTimestamp:all[0]?.timestamp??null,newestTimestamp:all.at(-1)?.timestamp??null,nextUntil:until,limit:LIMIT,maxPages,source:'TrackerSino documented API',authenticationBypassAttempted:false,aggregateDataAccepted:false,syntheticDataAccepted:false,realMoney:false};
fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
