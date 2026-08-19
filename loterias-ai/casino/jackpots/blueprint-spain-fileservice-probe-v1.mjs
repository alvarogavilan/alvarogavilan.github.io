#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/jackpots/evidence/blueprint-spain-fileservice-probe-v1.json';
const base='https://fileservice.blueprintgaming.com/';
const customers=['BOTEMANIA','botemania_es','GamesysSpain','MONOPOLYCASINOES'];
const fileTypes=['help','paytable'];
const probes=[];
for(const customer of customers){
  for(const fileType of fileTypes){
    const u=new URL(base);
    u.searchParams.set('customer',customer);
    u.searchParams.set('fileType',fileType);
    u.searchParams.set('gameEngineID','fishingfrenzyjk');
    u.searchParams.set('language','ES');
    u.searchParams.set('profile','jackpotkingdeluxe3');
    try{
      const r=await fetch(u,{headers:{'user-agent':'loterias-ai-blueprint-spain-fileservice-probe/1.1',accept:'text/html,application/json,text/plain,*/*'}});
      const text=await r.text();
      const low=text.toLowerCase();
      const numberMatches=[...text.matchAll(/(?:€|&euro;|eur|£|&pound;)?\s*(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{3,6})(?:\s*(?:€|eur|£))?/gi)];
      const numeric=[...new Set(numberMatches.map(m=>m[0].trim()).filter(Boolean))].slice(0,100);
      const numericContexts=[];
      for(const m of numberMatches){
        const raw=m[0].trim();
        if(!raw) continue;
        const i=m.index||0;
        const context=text.slice(Math.max(0,i-260),Math.min(text.length,i+raw.length+360)).replace(/\s+/g,' ');
        if(!numericContexts.some(x=>x.raw===raw&&x.context===context)) numericContexts.push({raw,context});
        if(numericContexts.length>=60) break;
      }
      const contexts=[];
      for(const needle of ['must be won by','must-be-won-by','royal','regal','real','majestuoso','3500','35,000','35000','3.500','35.000']){
        const i=low.indexOf(needle.toLowerCase());
        if(i>=0) contexts.push({needle,context:text.slice(Math.max(0,i-220),Math.min(text.length,i+420)).replace(/\s+/g,' ')});
      }
      probes.push({customer,fileType,url:u.toString(),httpStatus:r.status,finalUrl:r.url,contentType:r.headers.get('content-type'),bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),numericMentions:numeric,numericContexts,contexts,contains3500:/3(?:[., ]?500)\b/.test(text),contains35000:/35(?:[., ]?000)\b/.test(text),containsMustBeWonBy:/must\s*[- ]?be\s*[- ]?won\s*[- ]?by/i.test(text)});
    }catch(e){probes.push({customer,fileType,url:u.toString(),httpStatus:null,error:String(e?.message||e)});}
  }
}
const exactCandidates=probes.filter(p=>p.httpStatus===200&&(p.contains3500||p.contains35000)&&p.contexts.some(c=>/royal|regal|real|majestuoso|must/i.test(c.context)));
const out={version:'blueprint-spain-fileservice-probe-v1.1',generatedAt:new Date().toISOString(),provider:'Blueprint Gaming',gameEngineID:'fishingfrenzyjk',profile:'jackpotkingdeluxe3',language:'ES',scope:'BOUNDED_PUBLIC_OFFICIAL_FILESERVICE_PROBE',probes,decision:{officialNumericMbwbCandidateFound:exactCandidates.length>0,candidates:exactCandidates.map(x=>({customer:x.customer,fileType:x.fileType,httpStatus:x.httpStatus,numericMentions:x.numericMentions,numericContexts:x.numericContexts,contexts:x.contexts})),exactSpainMbwbVerified:false,realMoneyAllowed:false},guards:{officialProviderDomainOnly:true,boundedCustomerList:true,boundedFileTypes:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out.decision,null,2));
