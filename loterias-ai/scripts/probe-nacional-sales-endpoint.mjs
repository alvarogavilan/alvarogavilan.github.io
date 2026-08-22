import fs from 'node:fs';

const archive=JSON.parse(fs.readFileSync('loterias-ai/data/archive/loteria-nacional/2026.json','utf8'));
const candidates=[...(archive.records||[])].filter(r=>r?.drawDate&&r?.result?.officialPrizeSchema?.drawId).sort((a,b)=>String(b.drawDate).localeCompare(String(a.drawDate)));
const rec=candidates[0]||null;
if(!rec)throw new Error('No official Nacional draw with drawId found');
const drawId=String(rec.result.officialPrizeSchema.drawId);
const drawDate=String(rec.drawDate);
const headers={'user-agent':'Mozilla/5.0 LoteriasAI exact-draw geography probe','accept':'*/*'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function requestText(url){
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const r=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(20000)});
      const text=await r.text();
      if(r.ok)return{url:r.url,status:r.status,contentType:r.headers.get('content-type'),text};
      last=new Error(`HTTP ${r.status}`);
    }catch(e){last=e}
    await sleep(attempt*700);
  }
  throw last;
}

function variable(html,name){
  const patterns=[
    new RegExp(`(?:var\\s+)?${name}\\s*=\\s*["']([^"']+)["']`,'i'),
    new RegExp(`${name}[^\\n]{0,160}?(["'])([^"']+)\\1`,'i')
  ];
  for(const re of patterns){const m=html.match(re);if(m)return m[2]||m[1]}
  return null;
}

function parseEsNumber(value){
  const s=String(value??'').trim().replace(/\s/g,'').replace(/\./g,'').replace(',','.');
  if(!s)return null;
  const n=Number(s);
  return Number.isFinite(n)?n:null;
}

function normalizeRows(rows){
  if(!Array.isArray(rows))return[];
  return rows.map(x=>({
    name:String(x?.name??'').trim(),
    seriesRaw:x?.serie??null,
    amountRaw:x?.total??null,
    series:parseEsNumber(x?.serie),
    amountEUR:parseEsNumber(x?.total)
  })).filter(x=>x.name&&x.series!==null&&x.amountEUR!==null);
}

function summarizeJson(json){
  const provincias=normalizeRows(json?.provincias);
  const comunidades=normalizeRows(json?.comunidades);
  return{
    provincias,
    comunidades,
    provinceCount:provincias.length,
    communityCount:comunidades.length,
    provinceSeriesTotal:provincias.reduce((a,x)=>a+x.series,0),
    provinceAmountEUR:provincias.reduce((a,x)=>a+x.amountEUR,0),
    communitySeriesTotal:comunidades.reduce((a,x)=>a+x.series,0),
    communityAmountEUR:comunidades.reduce((a,x)=>a+x.amountEUR,0)
  };
}

async function probeSurface(kind,variableName){
  const pageUrl=`https://www.loteriasyapuestas.es/es/loteria-nacional/${kind}?drawId=${drawId}`;
  try{
    const page=await requestText(pageUrl);
    const raw=variable(page.text,variableName);
    if(!raw)return{kind,pageUrl:page.url,pageHttpStatus:page.status,pageBytes:page.text.length,error:`${variableName}-not-found`,dataAvailable:false};
    const endpoint=new URL(raw,page.url).href;
    const payload=await requestText(endpoint);
    let json=null;
    try{json=JSON.parse(payload.text)}catch(e){return{kind,pageUrl:page.url,pageHttpStatus:page.status,endpoint,httpStatus:payload.status,error:`invalid-json:${e.message}`,dataAvailable:false}}
    const structured=summarizeJson(json);
    const valid=structured.provinceCount>0&&structured.communityCount>0;
    return{
      kind,
      pageUrl:page.url,
      pageHttpStatus:page.status,
      pageBytes:page.text.length,
      endpoint,
      endpointRaw:raw,
      httpStatus:payload.status,
      contentType:payload.contentType,
      bytes:payload.text.length,
      dataAvailable:valid,
      structured,
      officialOnly:true,
      noInference:true
    };
  }catch(e){return{kind,pageUrl,error:String(e),dataAvailable:false,officialOnly:true,noInference:true}}
}

const ventas=await probeSurface('ventas','urlSalesLNAC');
await sleep(300);
const consignacion=await probeSurface('consignacion','urlConsignationLNAC');

const out={
  generatedAt:new Date().toISOString(),
  drawDate,
  drawId,
  exactDrawIdSource:'archive.result.officialPrizeSchema.drawId',
  exactOfficialDrawDateRequired:true,
  officialOnly:true,
  noInference:true,
  surfacesKeptSeparate:true,
  prizeDistributionIsNotSales:true,
  salesAndConsignationNotInterchangeable:true,
  ventas,
  consignacion,
  geographyReady:ventas.dataAvailable===true||consignacion.dataAvailable===true,
  bothSurfacesReady:ventas.dataAvailable===true&&consignacion.dataAvailable===true
};

fs.mkdirSync('loterias-ai/data/probes',{recursive:true});
fs.writeFileSync('loterias-ai/data/probes/nacional-sales-endpoint.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({drawDate,drawId,ventas:{available:ventas.dataAvailable,endpoint:ventas.endpoint,provinces:ventas.structured?.provinceCount,communities:ventas.structured?.communityCount},consignacion:{available:consignacion.dataAvailable,endpoint:consignacion.endpoint,provinces:consignacion.structured?.provinceCount,communities:consignacion.structured?.communityCount},bothSurfacesReady:out.bothSurfacesReady},null,2));
