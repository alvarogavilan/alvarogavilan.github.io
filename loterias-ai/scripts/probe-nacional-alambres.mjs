import fs from 'node:fs';
const date='20260808';
const api=`https://www.loteriasyapuestas.es/servicios/fechav3?game_id=LNAC&fecha_sorteo=${date}`;
const ar=await fetch(api,{headers:{'user-agent':'Mozilla/5.0 LoteriasAI official probe','accept':'*/*'}});const j=await ar.json(),row=Array.isArray(j)?j[0]:j;
const id=String(row?.id_sorteo||''),drawId=id.length>=5?`${id.slice(0,-4)}9102`:null,url=`https://www.loteriasyapuestas.es/es/loteria-nacional/tablas-y-alambres?drawId=${drawId}`;
const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 LoteriasAI official archive','accept':'text/html,*/*'}}),html=await r.text();
const srcs=[...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>new URL(m[1],url).href))];
const scriptHits=[];for(const src of srcs){try{const sr=await fetch(src,{headers:{'user-agent':'Mozilla/5.0 LoteriasAI probe'}});if(!sr.ok)continue;const text=await sr.text();if(/alambre|tablas-y-alambres|drawId|draw_id/i.test(text)){const hits=[...text.matchAll(/.{0,250}(?:alambre|tablas-y-alambres|drawId|draw_id).{0,500}/gi)].map(m=>m[0]).slice(0,30);scriptHits.push({src,status:sr.status,length:text.length,hits})}}catch{}}
const inlineHits=[...html.matchAll(/.{0,250}(?:alambre|tablas-y-alambres|drawId|draw_id|ajax).{0,500}/gi)].map(m=>m[0]).slice(0,120);
const out={generatedAt:new Date().toISOString(),date,id_sorteo:id,num_sorteo:row?.num_sorteo,first:row?.combinacion?.primer_premio,second:row?.combinacion?.segundo_premio,drawId,url,status:r.status,htmlLength:html.length,scriptCount:srcs.length,scriptHits,inlineHits};
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/nacional-alambres-mapping.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({drawId,scriptCount:srcs.length,scriptHits:scriptHits.map(x=>({src:x.src,hits:x.hits.length})),inlineHits:inlineHits.length},null,2));
