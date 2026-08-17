#!/usr/bin/env node
import fs from 'node:fs';
const base='https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette';
const results=[];
for(let page=51;page<=74;page++){
  let status=null,count=0,error=null,firstId=null,lastId=null;
  try{
    const r=await fetch(`${base}?page=${page}&size=30`,{headers:{'user-agent':'Mozilla/5.0'}});
    status=r.status;
    const text=await r.text();
    let data=[];
    try{data=JSON.parse(text);}catch{}
    if(Array.isArray(data)){
      count=data.length;
      firstId=data[0]?._id??data[0]?.id??null;
      lastId=data.at(-1)?._id??data.at(-1)?.id??null;
    }
  }catch(e){error=String(e)}
  results.push({page,size:30,status,count,firstId,lastId,error});
  if(status===429) await new Promise(r=>setTimeout(r,3000));
  else await new Promise(r=>setTimeout(r,300));
}
const nonEmpty=results.filter(x=>x.status===200&&x.count>0);
const out={version:'lightning-exact-page-boundary-v1',generatedAt:new Date().toISOString(),base,range:[51,74],lastNonEmpty:nonEmpty.at(-1)||null,firstEmpty:results.find(x=>x.status===200&&x.count===0)||null,results,authenticationBypassAttempted:false,publicReadOnlyAcquisition:true,realMoney:false};
fs.writeFileSync('loterias-ai/casino/lightning/evidence/exact-page-boundary-v1.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
// trigger exact boundary workflow
