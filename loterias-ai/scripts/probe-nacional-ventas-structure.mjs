import fs from 'node:fs';
const root='loterias-ai/data/archive/loteria-nacional';const rows=[];
for(const f of fs.readdirSync(root).filter(x=>/^\d{4}\.json$/.test(x)).sort().reverse()){
  const doc=JSON.parse(fs.readFileSync(`${root}/${f}`,'utf8'));
  for(const rec of [...(doc.records||[])].sort((a,b)=>(b.drawDate||'').localeCompare(a.drawDate||''))){if(rec.drawType==='NAVIDAD'||rec.drawType==='EL_NINO'||!rec.drawDate)continue;rows.push(rec);if(rows.length>=6)break}if(rows.length>=6)break;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url,accept='text/html,application/xhtml+xml,*/*'){
  let err;for(let a=1;a<=3;a++){
    try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(20000),headers:{'user-agent':'Mozilla/5.0 LoteriasAI research archive','accept':accept}});const text=await r.text();if(r.ok)return{url:r.url,status:r.status,text};err=new Error(`HTTP ${r.status}`)}catch(e){err=e}
    await sleep(a*800)
  }throw err
}
const clean=s=>String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&aacute;/gi,'á').replace(/&eacute;/gi,'é').replace(/&iacute;/gi,'í').replace(/&oacute;/gi,'ó').replace(/&uacute;/gi,'ú').replace(/&ntilde;/gi,'ñ').replace(/\s+/g,' ').trim();
const normalizeOfficialDate=v=>{const s=String(v||'').trim();if(!s)return null;const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(iso)return `${iso[1]}-${iso[2]}-${iso[3]}`;const dmy=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);if(dmy)return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;return null};
const jsUrl='https://www.loteriasyapuestas.es/f/loterias/estaticos/js/ventas_y_consignacion.js';let jsProbe=null;
try{const j=await get(jsUrl,'text/javascript,*/*');const urls=[...j.text.matchAll(/["']([^"']*(?:servicios|ventas|consignacion|provincias|comunidades|ccaa)[^"']*)["']/gi)].map(m=>m[1]);const calls=[...j.text.matchAll(/(?:ajax|jsonp|fetch|url)[^\n]{0,240}/gi)].map(m=>m[0]);jsProbe={url:jsUrl,status:j.status,bytes:j.text.length,candidateUrls:[...new Set(urls)].slice(0,120),candidateCalls:[...new Set(calls)].slice(0,120),sample:j.text.slice(0,40000)};}catch(e){jsProbe={url:jsUrl,error:String(e)}}

const unavailableRe=/la informaci[oó]n no se encuentra disponible/i;
function classifySurface(kind,drawId,x){
  const text=clean(x.text);
  const expectedLabel=kind==='ventas'?/ventas por c\.?c\.?a\.?a\.?|ventas por provincias/i:/consignaci[oó]n por c\.?c\.?a\.?a\.?|consignaci[oó]n por provincias/i;
  const seriesLabel=kind==='ventas'?/series vendidas/i:/series consignadas/i;
  const amountLabel=/importe/i;
  const explicitUnavailable=unavailableRe.test(text);
  const hasExpectedStructure=expectedLabel.test(text)&&seriesLabel.test(text)&&amountLabel.test(text);
  const candidateRows=[...x.text.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>clean(m[1])).filter(v=>v&& !/comunidad aut[oó]noma|provincia|series vendidas|series consignadas|importe/i.test(v));
  const numericRows=candidateRows.filter(v=>/\d/.test(v));
  return {
    kind,drawId,url:x.url,status:x.status,bytes:x.text.length,
    explicitUnavailable,hasExpectedStructure,
    dataAvailable:hasExpectedStructure&&!explicitUnavailable&&numericRows.length>0,
    candidateNumericRows:numericRows.slice(0,120),
    text:text.slice(0,12000),
    raw:x.text.replace(/\s+/g,' ').slice(0,24000),
    officialOnly:true,noInference:true
  };
}
async function probeSurface(kind,drawId){
  const url=`https://www.loteriasyapuestas.es/es/loteria-nacional/${kind}?drawId=${drawId}`;
  try{return classifySurface(kind,drawId,await get(url))}
  catch(e){return{kind,drawId,url,error:String(e),dataAvailable:false,officialOnly:true,noInference:true}}
}

const out=[];
for(const rec of rows){
  const date=rec.drawDate,ds=date.replaceAll('-',''),api=`https://www.loteriasyapuestas.es/servicios/fechav3?game_id=LNAC&fecha_sorteo=${ds}`;
  let id=null,returnedDates=[];
  try{const a=await get(api,'*/*'),j=JSON.parse(a.text),arr=Array.isArray(j)?j:[j].filter(Boolean);returnedDates=arr.map(x=>normalizeOfficialDate(x?.fecha_sorteo)).filter(Boolean);const row=arr.find(x=>normalizeOfficialDate(x?.fecha_sorteo)===date)||null;id=row?.id_sorteo||null}catch{}
  if(!id){out.push({date,error:'exact-official-date-not-returned',returnedDates:[...new Set(returnedDates)],exactOfficialDrawDateRequired:true,noDateShiftPromotion:true,officialOnly:true,noInference:true});continue}
  const ventas=await probeSurface('ventas',id);await sleep(250);const consignacion=await probeSurface('consignacion',id);
  out.push({date,drawId:id,exactOfficialDrawDateValidated:true,noDateShiftPromotion:true,officialOnly:true,noInference:true,ventas,consignacion,geographyReady:ventas.dataAvailable||consignacion.dataAvailable});
  await sleep(400)
}
const data={generatedAt:new Date().toISOString(),purpose:'inspect official SELAE Nacional sales and consignation geography without conflating prize distribution with sales volume',officialOnly:true,noInference:true,exactOfficialDrawDateRequired:true,surfacesKeptSeparate:true,prizeDistributionIsNotSales:true,jsProbe,draws:out};
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/nacional-ventas-structure.json',JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({js:{status:jsProbe?.status,bytes:jsProbe?.bytes,urls:jsProbe?.candidateUrls?.length,calls:jsProbe?.candidateCalls?.length,error:jsProbe?.error},draws:out.map(x=>({date:x.date,drawId:x.drawId,error:x.error,returnedDates:x.returnedDates,ventas:x.ventas&&{status:x.ventas.status,available:x.ventas.dataAvailable,explicitUnavailable:x.ventas.explicitUnavailable,rows:x.ventas.candidateNumericRows?.length,error:x.ventas.error},consignacion:x.consignacion&&{status:x.consignacion.status,available:x.consignacion.dataAvailable,explicitUnavailable:x.consignacion.explicitUnavailable,rows:x.consignacion.candidateNumericRows?.length,error:x.consignacion.error},geographyReady:x.geographyReady===true,exactOfficialDrawDateValidated:x.exactOfficialDrawDateValidated===true}))},null,2));
