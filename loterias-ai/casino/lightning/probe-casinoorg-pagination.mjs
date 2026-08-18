#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base='https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette';
const out='loterias-ai/casino/lightning/evidence/casinoorg-pagination-probe.json';
fs.mkdirSync(path.dirname(out),{recursive:true});
const variants=[['base',base],...Array.from({length:10},(_,i)=>[`page${i+1}`,`${base}?page=${i+1}`])];
function summarize(payload){
  const items=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];
  const rows=items.map(item=>{const d=item?.data||item,id=String(item?.id||d?.id||''),raw=d?.settledAt||d?.startedAt||null,t=Date.parse(raw);return id&&Number.isFinite(t)?{roundId:id,timestamp:new Date(t).toISOString()}:null}).filter(Boolean).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)||a.roundId.localeCompare(b.roundId));
  const ids=rows.map(x=>x.roundId);return{count:items.length,parsedCount:rows.length,newest:rows[0]||null,oldest:rows.at(-1)||null,idFingerprint:crypto.createHash('sha256').update(ids.join('|')).digest('hex'),roundIds:ids};
}
const results=[];
for(const [name,url] of variants){
  try{
    const res=await fetch(url,{headers:{accept:'application/json','user-agent':'LoteriasAI-pagination-probe/2.0','cache-control':'no-cache, no-store, max-age=0',pragma:'no-cache'}});
    const text=await res.text();let payload=null,parseError=null;try{payload=JSON.parse(text)}catch(e){parseError=String(e?.message||e)}
    results.push({name,url,status:res.status,contentType:res.headers.get('content-type'),ok:res.ok,parseError,...(payload?summarize(payload):{count:0,parsedCount:0}),bodyHash:crypto.createHash('sha256').update(text).digest('hex')});
  }catch(error){results.push({name,url,error:String(error?.message||error),ok:false,count:0,parsedCount:0});}
}
for(let i=0;i<results.length;i++){
  const r=results[i],prev=i?results[i-1]:null;
  r.distinctFromBase=Boolean(results[0]?.idFingerprint&&r.idFingerprint&&r.idFingerprint!==results[0].idFingerprint);
  r.distinctFromPrevious=Boolean(prev?.idFingerprint&&r.idFingerprint&&r.idFingerprint!==prev.idFingerprint);
  if(prev?.oldest?.timestamp&&r.newest?.timestamp)r.bridgeFromPreviousSeconds=(Date.parse(prev.oldest.timestamp)-Date.parse(r.newest.timestamp))/1000;else r.bridgeFromPreviousSeconds=null;
  if(prev?.roundIds&&r.roundIds)r.overlapWithPrevious=r.roundIds.filter(id=>new Set(prev.roundIds).has(id)).length;else r.overlapWithPrevious=null;
}
const usefulPages=results.filter((r,i)=>i>0&&r.ok&&r.parsedCount>0&&r.distinctFromPrevious).map(r=>r.name);
const report={generatedAt:new Date().toISOString(),version:'casinoorg-pagination-probe-v2',base,authenticationBypassAttempted:false,publicReadOnlyProbe:true,realMoney:false,purpose:'Map consecutive read-only source pages before authoritative gap recovery. No winner or multiplier values are persisted.',variants:results.map(({roundIds,...r})=>r),usefulPages,policy:{mayMutateCorpus:false,mayAdvanceProspectives:false,noWinnerOrMultiplierValuesPersisted:true},next:usefulPages.length?'construct-overlap-verified-gap-recovery':'do-not-backfill-with-unverified-pagination'};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({usefulPages,variants:report.variants.map(x=>({name:x.name,status:x.status,count:x.count,newest:x.newest?.timestamp,oldest:x.oldest?.timestamp,bridge:x.bridgeFromPreviousSeconds,overlap:x.overlapWithPrevious,distinct:x.distinctFromPrevious}))},null,2));
