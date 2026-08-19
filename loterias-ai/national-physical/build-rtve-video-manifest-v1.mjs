#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const pages=[
  {id:'all',url:'https://www.rtve.es/play/videos/loterias/'},
  {id:'lotteries',url:'https://www.rtve.es/loterias/'}
];
const clean=s=>String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const urlDate=url=>{const m=String(url).match(/-(\d{2})-(\d{2})-(20\d{2})(?:\/|$)/);return m?`${m[1]}/${m[2]}/${m[3]}`:null;};
const normalizeDuration=s=>{if(!s)return null;const x=String(s).replace(/\./g,':');const m=x.match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);if(m){const h=Number(m[1]||0),mm=Number(m[2]),ss=Number(m[3]);return{clock:`${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`,seconds:h*3600+mm*60+ss};}const m2=x.match(/(\d{1,2}):(\d{2})/);if(m2){const mm=Number(m2[1]),ss=Number(m2[2]);return{clock:`00:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`,seconds:mm*60+ss};}return null;};
const out=[];
for(const src of pages){
  const r=await fetch(src.url,{headers:{accept:'text/html','user-agent':'loterias-ai-national-physical/3.0'}});
  const html=await r.text();
  if(!r.ok)throw new Error(`RTVE ${src.id} HTTP ${r.status}`);
  const rx=/href=["']([^"']*\/play\/videos\/loterias\/[^"'#?]+\/?)["']/gi;
  for(const m of html.matchAll(rx)){
    let url=m[1]; if(url.startsWith('/'))url='https://www.rtve.es'+url; if(!url.startsWith('https://www.rtve.es/play/videos/loterias/'))continue;
    if(url.replace(/\/$/,'')==='https://www.rtve.es/play/videos/loterias')continue;
    const lo=Math.max(0,(m.index||0)-900),hi=Math.min(html.length,(m.index||0)+1400),ctx=clean(html.slice(lo,hi));
    const titleMatches=[...ctx.matchAll(/Sorteo[^|]{5,180}?(?=\d{2}\.\d{2}\.20\d{2}|\d{2}\/\d{2}\/20\d{2}|Guardar|Ir a|$)/gi)].map(x=>clean(x[0]));
    const title=(titleMatches.sort((a,b)=>a.length-b.length)[0]||ctx.match(/(?:Bonoloto|Primitiva|Euromillones|Loter[ií]a Nacional|Gordo de la Primitiva|EuroDreams|Lototurf|Quinigol|Quiniela)[^|]{0,160}/i)?.[0]||'Sorteo RTVE').trim();
    if(!/sorteo|bonoloto|primitiva|euromillones|loter[ií]a nacional|gordo|eurodreams|lototurf|quinigol|quiniela/i.test(title))continue;
    out.push({sourcePage:src.url,url,title,dateText:urlDate(url)||(ctx.match(/\b(\d{2}[\/.]\d{2}[\/.]20\d{2})\b/)||[])[1]||null,durationText:null,durationSeconds:null,officialHost:'rtve.es',metadataEvidenceSha256:null,measurementState:'UNMEASURED'});
  }
}
const dedup=[...new Map(out.map(x=>[x.url,x])).values()];
const classify=t=>/euromillones/i.test(t)?'euromillones':/bono/i.test(t)?'bonoloto':/loter[ií]a nacional/i.test(t)?'loteria-nacional':/gordo/i.test(t)?'gordo-primitiva':/primitiva/i.test(t)?'primitiva':/eurodream/i.test(t)?'eurodreams':/lototurf/i.test(t)?'lototurf':/quinigol/i.test(t)?'quinigol':/quiniela/i.test(t)?'quiniela':'multi';

// Enrich each individual RTVE page. This is metadata only; no OCR and no outcome inference.
for(const x of dedup){
  x.gameHint=classify(x.title);
  try{
    const r=await fetch(x.url,{headers:{accept:'text/html','user-agent':'loterias-ai-national-physical-metadata/1.0'}});
    const html=await r.text();if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const txt=clean(html);x.metadataHttpStatus=r.status;x.metadataEvidenceSha256=crypto.createHash('sha256').update(html).digest('hex');
    const canonicalTitle=(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)||html.match(/<title>([^<]+)<\/title>/i)||[])[1];
    if(canonicalTitle&&/sorteo|bonoloto|primitiva|euromillones|loter[ií]a nacional|gordo|eurodreams|lototurf|quinigol|quiniela/i.test(canonicalTitle))x.title=clean(canonicalTitle);
    x.dateText=urlDate(x.url)||x.dateText||(txt.match(/\b(\d{2}[\/.]\d{2}[\/.]20\d{2})\b/)||[])[1]||null;
    const iso=(html.match(/"duration"\s*:\s*"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/i)||[]);
    let dur=null;if(iso.length){const h=Number(iso[1]||0),m=Number(iso[2]||0),s=Number(iso[3]||0);dur={clock:`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`,seconds:h*3600+m*60+s};}
    if(!dur){const candidates=[...(txt.matchAll(/(?:duraci[oó]n|duration)\s*[:\-]?\s*(\d{1,2}:\d{2}:\d{2}|\d{1,2}[.:]\d{2})/gi))];dur=normalizeDuration(candidates[0]?.[1]||null);}
    if(!dur){const short=[...(txt.matchAll(/\b(\d{1,2}[.:]\d{2})\s*min\b/gi))];dur=normalizeDuration(short[0]?.[1]||null);}
    x.durationText=dur?.clock??null;x.durationSeconds=dur?.seconds??null;
  }catch(e){x.metadataError=String(e?.message||e);}
}
const payload={version:'rtve-official-video-manifest-v3',generatedAt:new Date().toISOString(),sources:pages,sourceDigest:crypto.createHash('sha256').update(JSON.stringify(dedup)).digest('hex'),summary:{videos:dedup.length,dated:dedup.filter(x=>x.dateText).length,withDuration:dedup.filter(x=>Number.isFinite(x.durationSeconds)).length,metadataPagesRead:dedup.filter(x=>x.metadataHttpStatus===200).length,byGame:Object.fromEntries([...new Set(dedup.map(x=>x.gameHint))].map(g=>[g,dedup.filter(x=>x.gameHint===g).length]))},videos:dedup,guards:{individualRTVEVideoUrlsRequired:true,officialRTVEOnly:true,urlDatePreferredOverNearbyContext:true,metadataOnlyNoOCR:true,futureOutcomeLeakageForbidden:true,videoMeasurementsNotYetPerformed:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/national-physical/evidence',{recursive:true});
fs.writeFileSync('loterias-ai/national-physical/evidence/rtve-video-manifest-v1.json',JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload.summary,null,2));
