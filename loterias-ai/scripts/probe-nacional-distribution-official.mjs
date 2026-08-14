import fs from 'node:fs';
const root='loterias-ai/data/archive/loteria-nacional';
const recent=[];
for(const f of fs.readdirSync(root).filter(x=>/^\d{4}\.json$/.test(x)).sort().reverse()){
  const doc=JSON.parse(fs.readFileSync(`${root}/${f}`,'utf8'));
  for(const r of [...(doc.records||[])].sort((a,b)=>(b.drawDate||'').localeCompare(a.drawDate||''))){
    if(r.drawType==='NAVIDAD'||r.drawType==='EL_NINO') continue;
    if(r.drawDate) recent.push(r);
    if(recent.length>=8) break;
  }
  if(recent.length>=8) break;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){let err;for(let a=1;a<=3;a++){try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(20000),headers:{'user-agent':'Mozilla/5.0 LoteriasAI research archive','accept':'text/html,application/xhtml+xml,*/*'}});const text=await r.text();if(r.ok)return {status:r.status,url:r.url,text};err=new Error(`HTTP ${r.status}`)}catch(e){err=e}await sleep(a*900)}throw err}
const out=[];
for(const rec of recent){
  const d=rec.drawDate;
  const q=d.replaceAll('-','');
  const candidates=[
    `https://www.loteriasyapuestas.es/servicios/fechav3?game_id=LONA&fecha_sorteo=${q}`,
    `https://www.loteriasyapuestas.es/servicios/fechav3?game_id=LNAC&fecha_sorteo=${q}`,
    `https://www.loteriasyapuestas.es/es/resultados/loteria-nacional?fecha_sorteo=${q}`
  ];
  const row={drawDate:d,firstPrize:rec.result?.firstPrize||null,tests:[]};
  for(const url of candidates){try{const x=await get(url);let json=null;try{json=JSON.parse(x.text)}catch{}const hrefs=[...x.text.matchAll(/href=["']([^"']+)["']/gi)].map(m=>m[1]).filter(h=>/repart|admin|premio|venta|localidad|provincia|mapa|distrib/i.test(h));const urls=[...x.text.matchAll(/https?:\/\/[^"'\s<>]+/gi)].map(m=>m[0]).filter(h=>/repart|admin|premio|venta|localidad|provincia|mapa|distrib/i.test(h));row.tests.push({url,status:x.status,finalUrl:x.url,bytes:x.text.length,json:Array.isArray(json)?json.slice(0,1):json,interestingHrefs:[...new Set(hrefs)].slice(0,50),interestingUrls:[...new Set(urls)].slice(0,50),sample:x.text.replace(/\s+/g,' ').slice(0,5000)});}catch(e){row.tests.push({url,error:String(e)})}}
  out.push(row);await sleep(500);
}
const data={generatedAt:new Date().toISOString(),gameId:'loteria-nacional',purpose:'discover official prize distribution geography endpoint/markup; no predictive claims',testedDraws:out};
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/nacional-distribution-official.json',JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(out.map(x=>({drawDate:x.drawDate,tests:x.tests.map(t=>({status:t.status,bytes:t.bytes,hrefs:t.interestingHrefs?.length,error:t.error}))})),null,2));
