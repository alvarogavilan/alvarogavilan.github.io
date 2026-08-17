#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base='https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette';
const out='loterias-ai/casino/lightning/evidence/casinoorg-pagination-probe.json';
fs.mkdirSync(path.dirname(out),{recursive:true});

const variants=[
  ['base',base],
  ['limit100',`${base}?limit=100`],
  ['page2',`${base}?page=2`],
  ['offset30',`${base}?offset=30`],
  ['skip30',`${base}?skip=30`],
  ['take100',`${base}?take=100`]
];

const summarize=(payload)=>{
  const items=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];
  const ids=items.map(x=>String(x?.id??x?.data?.id??'')).filter(Boolean);
  const times=items.map(x=>x?.data?.settledAt??x?.settledAt??null).filter(Boolean);
  return {count:items.length,firstId:ids[0]??null,lastId:ids.at(-1)??null,firstTime:times[0]??null,lastTime:times.at(-1)??null,idFingerprint:crypto.createHash('sha256').update(ids.join('|')).digest('hex')};
};

const results=[];
for(const [name,url] of variants){
  try{
    const res=await fetch(url,{headers:{accept:'application/json','user-agent':'LoteriasAI-research/1.0'}});
    const text=await res.text();
    let payload=null;try{payload=JSON.parse(text)}catch{}
    results.push({name,url,status:res.status,contentType:res.headers.get('content-type'),ok:res.ok,...(payload?summarize(payload):{count:0}),bodyHash:crypto.createHash('sha256').update(text).digest('hex')});
  }catch(error){results.push({name,url,error:String(error?.message||error),ok:false});}
}
const baseResult=results.find(x=>x.name==='base');
for(const r of results){
  r.distinctFromBase=Boolean(baseResult&&r.idFingerprint&&r.idFingerprint!==baseResult.idFingerprint);
}
const viable=results.filter(r=>r.ok&&r.distinctFromBase&&r.count>0).map(r=>r.name);
const report={generatedAt:new Date().toISOString(),base,authenticationBypassAttempted:false,publicReadOnlyProbe:true,realMoney:false,variants:results,viablePaginationVariants:viable,next:viable.length?'validate-and-use-only-documented-behavior':'continue-time-based-authoritative-acquisition'};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({viablePaginationVariants:viable,variants:results.map(x=>({name:x.name,status:x.status,count:x.count,distinctFromBase:x.distinctFromBase}))},null,2));
