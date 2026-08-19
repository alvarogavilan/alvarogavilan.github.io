#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const URL='https://www.pokerstars.es/casino/slots/jackpot/';
const OUT='loterias-ai/casino/jackpots/evidence/age-of-gods-listing-diagnostic-v1.json';
const parse=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
const r=await fetch(URL,{headers:{accept:'text/html','user-agent':'loterias-ai-aotg-layout-diagnostic/1.0','cache-control':'no-cache, no-store, max-age=0'}});
const html=await r.text();
const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,'\n').replace(/&euro;|&#8364;/gi,'€').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const amountRx=/(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/g;
const ageRx=/(?:Age of the Gods|AOTG)/gi;
const hits=[];
for(const m of text.matchAll(ageRx)){
  const start=Math.max(0,m.index-220),end=Math.min(text.length,m.index+320);
  const context=text.slice(start,end);
  const amounts=[...context.matchAll(amountRx)].map(a=>({raw:a[0],valueEUR:parse(a[1]),relativeIndex:a.index}));
  hits.push({absoluteIndex:m.index,context,amounts});
}
const payload={version:'age-of-gods-listing-diagnostic-v1',generatedAt:new Date().toISOString(),source:{url:URL,httpStatus:r.status,finalUrl:r.url,responseSha256:crypto.createHash('sha256').update(html).digest('hex')},summary:{ageMentions:hits.length,hitsWithNearbyAmounts:hits.filter(x=>x.amounts.length).length},hits:hits.slice(0,50),guards:{diagnosticOnly:true,noBetting:true,noEconomicPromotion:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload.summary,null,2));
