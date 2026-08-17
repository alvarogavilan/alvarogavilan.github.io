#!/usr/bin/env node
import fs from 'node:fs';
const base='https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette';
const dst='loterias-ai/casino/lightning/evidence/deep-page-boundary-probe-v1.json';
const tests=[];
for(const page of [30,40,50,75,100,150,200,300,500,750,1000,1500,2000]){
  for(const size of [30,100]){
    const url=`${base}?page=${page}&size=${size}`;
    let status=null,count=null,firstId=null,lastId=null,firstTs=null,lastTs=null,error=null;
    try{
      const r=await fetch(url,{headers:{'user-agent':'loterias-ai-research/1.0','accept':'application/json'}});status=r.status;
      const text=await r.text();
      if(r.ok){const j=JSON.parse(text);const a=Array.isArray(j)?j:(Array.isArray(j?.data)?j.data:[]);count=a.length;firstId=a[0]?._id??a[0]?.id??null;lastId=a.at(-1)?._id??a.at(-1)?.id??null;firstTs=a[0]?.settledAt??a[0]?.timestamp??a[0]?.createdAt??null;lastTs=a.at(-1)?.settledAt??a.at(-1)?.timestamp??a.at(-1)?.createdAt??null;} else error=text.slice(0,180);
    }catch(e){error=String(e?.message||e)}
    tests.push({page,size,status,count,firstId,lastId,firstTs,lastTs,error});
    if(status===429) await new Promise(r=>setTimeout(r,3000)); else await new Promise(r=>setTimeout(r,250));
  }
}
const nonEmpty=tests.filter(x=>x.status===200&&x.count>0);
const out={version:'lightning-deep-page-boundary-probe-v1',generatedAt:new Date().toISOString(),base,tests,deepestNonEmpty:nonEmpty.sort((a,b)=>b.page-a.page||b.size-a.size)[0]||null,authenticationBypassAttempted:false,publicReadOnlyAcquisition:true,realMoney:false,next:'construct-range-backfill-from-deepest-confirmed-page'};
fs.writeFileSync(dst,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({deepestNonEmpty:out.deepestNonEmpty,nonEmptyCount:nonEmpty.length},null,2));