#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const MAP='loterias-ai/casino/jackpots/evidence/botemania-jackpot-client-map-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-blueprint-ui-cap-scan-v1.json';
const m=JSON.parse(fs.readFileSync(MAP,'utf8'));
const urls=[...(m.resolvedChunks||[]).map(x=>x.url),...(m.scriptUrls||[]).filter(x=>/BlueprintJackpots|HeadlessJackpots/i.test(x))].filter(Boolean);
const unique=[...new Set(urls)];
const needles=['3500','35e3','35000','5000','5e3','500','3.5e3','3.5E3','35E3','mustBeWonBy','must-be-won','ROYAL','REGAL','JACKPOTKING_ROYAL','JACKPOTKING_REGAL','flame','heat','maximum','maxValue','threshold'];
const hits=[];const files=[];
for(const url of unique){
 try{
  const r=await fetch(url,{headers:{'user-agent':'loterias-ai-botemania-blueprint-ui-cap-scan/1.0','cache-control':'no-cache'}});
  const text=await r.text();
  files.push({url,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex')});
  for(const needle of needles){
   let from=0,count=0;
   while(true){const i=text.toLowerCase().indexOf(needle.toLowerCase(),from);if(i<0)break;const ctx=text.slice(Math.max(0,i-500),Math.min(text.length,i+needle.length+500)).replace(/\s+/g,' ');hits.push({url,needle,index:i,context:ctx.slice(0,1200)});from=i+needle.length;if(++count>=20)break;}
  }
 }catch(e){files.push({url,error:String(e?.message||e)});}
}
const numericCapEvidence=hits.filter(h=>['3500','35e3','35000','3.5e3','3.5E3','35E3'].includes(h.needle));
const out={version:'botemania-blueprint-ui-cap-scan-v1',generatedAt:new Date().toISOString(),sourceMap:MAP,files,hits,numericCapEvidence,decision:{botemaniaPublicUiContains3500or35000:numericCapEvidence.length>0,exactSpainMbwbRecovered:false,realMoneyAllowed:false},guards:{publicBotemaniaAssetsOnly:true,noAuthentication:true,noPrivateCredentials:true,noMutation:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({files:files.map(f=>({url:f.url,httpStatus:f.httpStatus,bytes:f.bytes})),numericCapEvidence,hitCounts:Object.fromEntries(needles.map(n=>[n,hits.filter(h=>h.needle===n).length])),decision:out.decision},null,2));