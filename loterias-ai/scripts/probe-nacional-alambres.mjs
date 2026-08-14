import fs from 'node:fs';
const dates=['20260808','20260716','20260813'];
const out=[];
for(const date of dates){
  const api=`https://www.loteriasyapuestas.es/servicios/fechav3?game_id=LNAC&fecha_sorteo=${date}`;
  const ar=await fetch(api,{headers:{'user-agent':'Mozilla/5.0 LoteriasAI official probe','accept':'*/*'}});
  const j=await ar.json(),row=Array.isArray(j)?j[0]:j;
  const id=String(row?.id_sorteo||'');
  const drawId=id.length>=5?`${id.slice(0,-4)}9102`:null;
  const url=drawId?`https://www.loteriasyapuestas.es/es/loteria-nacional/tablas-y-alambres?drawId=${drawId}`:null;
  let status=null,html='';
  if(url){const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 LoteriasAI official archive','accept':'text/html,*/*','accept-language':'es-ES,es;q=0.9'}});status=r.status;html=await r.text()}
  const clues=[...html.matchAll(/.{0,180}(?:alambre|drawId|vgnext|render\/component|ajax|servicios).{0,260}/gi)].map(m=>m[0]).slice(0,80);
  const urls=[...new Set((html.match(/https?:[^"'\s<>]+/g)||[]).filter(x=>/loter|vgn|render|service|alambre/i.test(x)))].slice(0,80);
  out.push({date,id_sorteo:id,num_sorteo:row?.num_sorteo,first:String(row?.combinacion?.primer_premio||''),second:String(row?.combinacion?.segundo_premio||''),drawId,url,status,htmlLength:html.length,clues,urls});
}
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/nacional-alambres-mapping.json',JSON.stringify({generatedAt:new Date().toISOString(),samples:out},null,2)+'\n');console.log(JSON.stringify(out,null,2));
