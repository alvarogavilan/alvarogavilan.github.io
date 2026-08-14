import fs from 'node:fs';
const tests=[
 ['lototurf-2017','https://www.loteriasyapuestas.es/f/loterias/resultados/lototurf.html?game_id=LOTU&fecha_sorteo=20171231'],
 ['lototurf-2010','https://www.loteriasyapuestas.es/f/loterias/resultados/lototurf.html?game_id=LOTU&fecha_sorteo=20101226'],
 ['quintuple-2026','https://www.loteriasyapuestas.es/f/loterias/resultados/quintuple.html?game_id=QUPL&fecha_sorteo=20260719'],
 ['quinigol-2026','https://www.loteriasyapuestas.es/f/loterias/resultados/quinigol.html?game_id=QGOL&fecha_sorteo=20260809'],
 ['quiniela-2026','https://www.loteriasyapuestas.es/f/loterias/resultados/quiniela.html?game_id=LAQU&fecha_sorteo=20260809']
];
const out=[];for(const [id,url] of tests){try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(25000),headers:{'user-agent':'LoteriasAI/1.0 research archive','accept':'text/html'}});const html=await r.text();const srcs=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1]).filter(x=>/resultado|loter|ajax|json|js|api|servlet|game|fecha/i.test(x));const urls=[...html.matchAll(/https?:\/\/[^"'\s<>]+/gi)].map(m=>m[0]);out.push({id,url,status:r.status,ok:r.ok,bytes:html.length,text:html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim().slice(0,2000),srcs:[...new Set(srcs)],embeddedUrls:[...new Set(urls)],raw:html.replace(/\s+/g,' ').slice(0,9000)});}catch(e){out.push({id,url,error:String(e)})}}
const data={generatedAt:new Date().toISOString(),tests:out};fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/selae-date-endpoints.json',JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(out.map(x=>({id:x.id,status:x.status,ok:x.ok,bytes:x.bytes,srcs:x.srcs?.length,urls:x.embeddedUrls?.length,error:x.error})),null,2));
