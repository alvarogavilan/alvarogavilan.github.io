#!/usr/bin/env node
import fs from 'node:fs';
const base='https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette';
const out='loterias-ai/casino/lightning/evidence/history-param-probe.json';
const tests=[
  '',
  '?page=21','?page=22','?page=25','?page=30',
  '?limit=100','?pageSize=100','?perPage=100','?size=100',
  '?offset=600','?offset=900','?skip=600',
  '?page=21&limit=100','?page=21&pageSize=100','?page=21&size=100',
  '?sort=asc','?order=asc','?direction=asc'
];
const rows=[];
for(const q of tests){
  const url=base+q;let status=0,body='',json=null,error=null;
  try{const r=await fetch(url,{headers:{accept:'application/json','user-agent':'LoteriasAI-research/1.0'}});status=r.status;body=await r.text();try{json=JSON.parse(body)}catch{}}
  catch(e){error=String(e)}
  const items=Array.isArray(json)?json:Array.isArray(json?.data)?json.data:[];
  const ids=items.map(x=>String(x?.id??x?.data?.id??'')).filter(Boolean);
  rows.push({query:q||'(none)',status,count:items.length,firstId:ids[0]??null,lastId:ids.at(-1)??null,rootKeys:json&&typeof json==='object'&&!Array.isArray(json)?Object.keys(json):[],error,bodyBytes:body.length});
  await new Promise(r=>setTimeout(r,250));
}
fs.mkdirSync('loterias-ai/casino/lightning/evidence',{recursive:true});
fs.writeFileSync(out,JSON.stringify({generatedAt:new Date().toISOString(),base,tests:rows,authenticationBypassAttempted:false,publicReadOnlyAcquisition:true,realMoney:false},null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
