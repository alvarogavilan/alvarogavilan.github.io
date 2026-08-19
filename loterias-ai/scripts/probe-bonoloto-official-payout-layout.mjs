#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const RECENT='loterias-ai/data/backtests/bonoloto-recent-financial.json';
const ARCH='loterias-ai/data/archive/bonoloto';
const OUT='loterias-ai/data/archive/_meta/bonoloto-official-payout-layout-probe.json';
const recent=JSON.parse(fs.readFileSync(RECENT,'utf8'));
let records=[];for(const f of fs.readdirSync(ARCH).filter(x=>/^\d{4}\.json$/.test(x))){const d=JSON.parse(fs.readFileSync(`${ARCH}/${f}`,'utf8'));records.push(...(d.records||[]));}
const byDate=new Map(records.map(r=>[r.drawDate,r]));
const dates=(recent.details||[]).map(x=>x.date).slice(-8);
const clean=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const results=[];
for(const date of dates){
 const rec=byDate.get(date);const candidates=[rec?.source?.sourceUrl,`https://www.loteriasyapuestas.es/es/bonoloto/escrutinios/bonoloto-premios-y-ganadores-del-${date.split('-').reverse().join('-')}.formatoRSS`].filter(Boolean);
 let row=null;
 for(const url of [...new Set(candidates)]){try{const r=await fetch(url,{redirect:'follow',headers:{accept:'text/html,application/rss+xml,application/xml,text/xml,*/*','user-agent':'LoteriasAI-official-payout-layout/1.0'}});const body=await r.text();const text=clean(body);const terms=['6 Aciertos','5 Aciertos + C','5 Aciertos','4 Aciertos','3 Aciertos','Premio','premio por apuesta'];const contexts=[];for(const term of terms){let pos=0;while((pos=text.toLowerCase().indexOf(term.toLowerCase(),pos))>=0&&contexts.length<30){contexts.push({term,index:pos,context:text.slice(Math.max(0,pos-180),Math.min(text.length,pos+420))});pos+=term.length;}}
 row={date,url,httpStatus:r.status,finalUrl:r.url,contentType:r.headers.get('content-type'),bodySha256:crypto.createHash('sha256').update(body).digest('hex'),textLength:text.length,contexts};if(r.ok&&contexts.length)break;}catch(e){row={date,url,error:String(e?.message||e),contexts:[]};}}
 results.push(row||{date,error:'NO_SOURCE_URL'});
}
const payload={version:'bonoloto-official-payout-layout-probe-v1',generatedAt:new Date().toISOString(),sourcePolicy:'SELAE_ONLY',summary:{dates:results.length,http200:results.filter(x=>x.httpStatus===200).length,withPrizeContexts:results.filter(x=>x.contexts?.length).length},results,guards:{diagnosticOnly:true,noThirdPartyPayouts:true,noBacktestMutation:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload.summary,null,2));