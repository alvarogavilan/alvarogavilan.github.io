#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/xxxtreme/public-source-probe.json';
const BASE='https://api-cs.casino.org/svc-evolution-game-events/api';
const candidates=[
  'xxxtremelightningroulette',
  'xxxlightningroulette',
  'xxxtremelightning',
  'xxxtreme-lightning-roulette',
  'xxxtremeroulette'
];
const rows=[];
for(const slug of candidates){
  const url=`${BASE}/${slug}`;
  try{
    const res=await fetch(url,{headers:{accept:'application/json','user-agent':'LoteriasAI-public-source-probe/1.0','cache-control':'no-cache'}});
    const text=await res.text();
    let json=null;try{json=JSON.parse(text)}catch{}
    const items=Array.isArray(json)?json:Array.isArray(json?.data)?json.data:[];
    const sample=items.slice(0,3).map(x=>{const d=x?.data||x;return{id:x?.id||d?.id||null,startedAt:d?.startedAt||null,settledAt:d?.settledAt||null,winner:d?.result?.outcome?.number??null,luckyCount:Array.isArray(d?.result?.luckyNumbersList)?d.result.luckyNumbersList.length:null}});
    const structured=res.ok&&items.length>0&&sample.some(x=>x.id&&Number.isInteger(Number(x.winner))&&(x.settledAt||x.startedAt));
    rows.push({slug,url,httpStatus:res.status,ok:res.ok,contentType:res.headers.get('content-type'),itemCount:items.length,structuredRoundShape:structured,sample,responseSha256:crypto.createHash('sha256').update(text).digest('hex')});
  }catch(error){rows.push({slug,url,error:String(error?.message||error),structuredRoundShape:false});}
}
const matches=rows.filter(x=>x.structuredRoundShape===true);
const out={version:'xxxtreme-public-source-probe-v1',generatedAt:new Date().toISOString(),mode:'DISCOVERY_ONLY_PUBLIC_ENDPOINT_PROBE',purpose:'Find a public structured XXXtreme Lightning Roulette round source without authentication or access-control bypass.',candidates:rows,structuredMatches:matches.map(x=>x.url),status:matches.length?'PUBLIC_STRUCTURED_CANDIDATE_FOUND_REQUIRES_SEPARATE_CONTRACT_VALIDATION':'NO_PUBLIC_STRUCTURED_CANDIDATE_FOUND',guards:{noCredentials:true,noAuthBypass:true,noTrainingFromProbe:true,noProspectiveMerge:true,noBetting:true,realMoneyAllowed:false,realStakeEUR:0}};
fs.mkdirSync('loterias-ai/casino/xxxtreme',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
