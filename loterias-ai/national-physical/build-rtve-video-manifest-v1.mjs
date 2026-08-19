#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const pages=[
  {id:'all',url:'https://www.rtve.es/play/videos/loterias/'},
  {id:'lotteries',url:'https://www.rtve.es/loterias/'}
];
const out=[];
for(const src of pages){
  const r=await fetch(src.url,{headers:{accept:'text/html','user-agent':'loterias-ai-national-physical/1.0'}});
  const html=await r.text();
  if(!r.ok)throw new Error(`RTVE ${src.id} HTTP ${r.status}`);
  const seen=new Set();
  const rx=/<a[^>]+href=["']([^"']*(?:\/play\/videos\/|\/loterias\/)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for(const m of html.matchAll(rx)){
    let url=m[1]; if(url.startsWith('/'))url='https://www.rtve.es'+url; if(!url.startsWith('https://www.rtve.es/'))continue;
    const text=m[2].replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
    if(!text||seen.has(url))continue; seen.add(url);
    if(!/sorteo|bonoloto|primitiva|euromillones|loter[ií]a nacional|gordo|eurodreams|lototurf|quinigol|quiniela/i.test(text))continue;
    const date=(text.match(/\b(\d{2}[\/.-]\d{2}[\/.-]20\d{2})\b/)||[])[1]||null;
    const duration=(text.match(/\b(\d{2}[:.]\d{2})(?:\s*min)?\b/i)||[])[1]||null;
    out.push({sourcePage:src.url,url,title:text,dateText:date,durationText:duration,officialHost:'rtve.es',videoEvidenceSha256:null,measurementState:'UNMEASURED'});
  }
}
const dedup=[...new Map(out.map(x=>[x.url,x])).values()];
const classify=t=>/euromillones/i.test(t)?'euromillones':/bono/i.test(t)?'bonoloto':/loter[ií]a nacional/i.test(t)?'loteria-nacional':/gordo/i.test(t)?'gordo-primitiva':/primitiva/i.test(t)?'primitiva':/eurodream/i.test(t)?'eurodreams':/lototurf/i.test(t)?'lototurf':/quinigol/i.test(t)?'quinigol':/quiniela/i.test(t)?'quiniela':'multi';
for(const x of dedup)x.gameHint=classify(x.title);
const payload={version:'rtve-official-video-manifest-v1',generatedAt:new Date().toISOString(),sources:pages,sourceDigest:crypto.createHash('sha256').update(JSON.stringify(dedup)).digest('hex'),summary:{videos:dedup.length,byGame:Object.fromEntries([...new Set(dedup.map(x=>x.gameHint))].map(g=>[g,dedup.filter(x=>x.gameHint===g).length]))},videos:dedup,guards:{officialRTVEOnly:true,futureOutcomeLeakageForbidden:true,videoMeasurementsNotYetPerformed:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/national-physical/evidence',{recursive:true});
fs.writeFileSync('loterias-ai/national-physical/evidence/rtve-video-manifest-v1.json',JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload.summary,null,2));
