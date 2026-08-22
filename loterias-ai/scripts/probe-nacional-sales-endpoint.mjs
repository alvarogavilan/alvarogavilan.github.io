import fs from 'node:fs';

const archive=JSON.parse(fs.readFileSync('loterias-ai/data/archive/loteria-nacional/2026.json','utf8'));
const candidates=[...(archive.records||[])].filter(r=>r?.drawDate&&r?.result?.officialPrizeSchema?.drawId).sort((a,b)=>String(b.drawDate).localeCompare(String(a.drawDate)));
const rec=candidates[0]||null;
if(!rec)throw new Error('No official Nacional draw with drawId found');
const drawId=String(rec.result.officialPrizeSchema.drawId);
const drawDate=String(rec.drawDate);
const headers={'user-agent':'Mozilla/5.0 LoteriasAI exact-draw geography probe','accept':'*/*'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const EPS_SERIES=1e-6;
const EPS_EUR=0.02;

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

function duplicateNames(rows){
  const seen=new Set(), dup=new Set();
  for(const row of rows){
    const key=row.name.toLocaleLowerCase('es-ES');
    if(seen.has(key))dup.add(row.name); else seen.add(key);
  }
  return [...dup].sort((a,b)=>a.localeCompare(b,'es-ES'));
}

function summarizeJson(json){
  const provincias=normalizeRows(json?.provincias);
  const comunidades=normalizeRows(json?.comunidades);
  const provinceSeriesTotal=provincias.reduce((a,x)=>a+x.series,0);
  const provinceAmountEUR=provincias.reduce((a,x)=>a+x.amountEUR,0);
  const communitySeriesTotal=comunidades.reduce((a,x)=>a+x.series,0);
  const communityAmountEUR=comunidades.reduce((a,x)=>a+x.amountEUR,0);
  const negativeRows=[...provincias.map(x=>({level:'province',...x})),...comunidades.map(x=>({level:'community',...x}))]
    .filter(x=>x.series<0||x.amountEUR<0)
    .map(x=>({level:x.level,name:x.name,series:x.series,amountEUR:x.amountEUR}));
  const provinceDuplicateNames=duplicateNames(provincias);
  const communityDuplicateNames=duplicateNames(comunidades);
  const seriesDelta=provinceSeriesTotal-communitySeriesTotal;
  const amountDeltaEUR=provinceAmountEUR-communityAmountEUR;
  const totalsReconciled=Math.abs(seriesDelta)<=EPS_SERIES&&Math.abs(amountDeltaEUR)<=EPS_EUR;
  const qualityPass=provincias.length>0&&comunidades.length>0&&negativeRows.length===0&&provinceDuplicateNames.length===0&&communityDuplicateNames.length===0&&totalsReconciled;
  return{
    provincias,
    comunidades,
    provinceCount:provincias.length,
    communityCount:comunidades.length,
    provinceSeriesTotal,
    provinceAmountEUR,
    communitySeriesTotal,
    communityAmountEUR,
    reconciliation:{
      seriesDelta,
      amountDeltaEUR,
      seriesTolerance:EPS_SERIES,
      amountToleranceEUR:EPS_EUR,
      totalsReconciled
    },
    duplicateNames:{provinces:provinceDuplicateNames,communities:communityDuplicateNames},
    negativeRows,
    qualityPass
  };
}

async function probeSurface(kind,variableName){
  const pageUrl=`https://www.loteriasyapuestas.es/es/loteria-nacional/${kind}?drawId=${drawId}`;
  try{
    const page=await requestText(pageUrl);
    const raw=variable(page.text,variableName);
    if(!raw)return{kind,pageUrl:page.url,pageHttpStatus:page.status,pageBytes:page.text.length,error:`${variableName}-not-found`,dataAvailable:false,qualityPass:false};
    const endpoint=new URL(raw,page.url).href;
    const payload=await requestText(endpoint);
    let json=null;
    try{json=JSON.parse(payload.text)}catch(e){return{kind,pageUrl:page.url,pageHttpStatus:page.status,endpoint,httpStatus:payload.status,error:`invalid-json:${e.message}`,dataAvailable:false,qualityPass:false}}
    const structured=summarizeJson(json);
    const valid=structured.qualityPass===true;
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
      qualityPass:valid,
      structured,
      officialOnly:true,
      noInference:true,
      exactDrawRequired:true,
      provinceCommunityTotalsMustReconcile:true
    };
  }catch(e){return{kind,pageUrl,error:String(e),dataAvailable:false,qualityPass:false,officialOnly:true,noInference:true}}
}

const ventas=await probeSurface('ventas','urlSalesLNAC');
await sleep(300);
const consignacion=await probeSurface('consignacion','urlConsignationLNAC');
const geographyReady=ventas.dataAvailable===true||consignacion.dataAvailable===true;
const bothSurfacesReady=ventas.dataAvailable===true&&consignacion.dataAvailable===true;
const availableSurfaceQualityPass=(ventas.dataAvailable!==true||ventas.qualityPass===true)&&(consignacion.dataAvailable!==true||consignacion.qualityPass===true);
const probeIntegrityPass=availableSurfaceQualityPass;
const qualityPass=bothSurfacesReady&&availableSurfaceQualityPass;

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
  provinceCommunityTotalsMustReconcile:true,
  ventas,
  consignacion,
  geographyReady,
  bothSurfacesReady,
  probeIntegrityPass,
  qualityPass,
  analysisReady:qualityPass,
  failClosedWhenSurfaceUnavailable:true,
  readinessReason:qualityPass?'BOTH_OFFICIAL_SURFACES_RECONCILED':(!geographyReady?'NO_OFFICIAL_GEOGRAPHY_SURFACE_AVAILABLE':!bothSurfacesReady?'ONLY_ONE_OFFICIAL_SURFACE_READY':'OFFICIAL_SURFACE_QUALITY_FAILED')
};

fs.mkdirSync('loterias-ai/data/probes',{recursive:true});
fs.writeFileSync('loterias-ai/data/probes/nacional-sales-endpoint.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({
  drawDate,
  drawId,
  ventas:{available:ventas.dataAvailable,qualityPass:ventas.qualityPass,endpoint:ventas.endpoint,provinces:ventas.structured?.provinceCount,communities:ventas.structured?.communityCount,reconciliation:ventas.structured?.reconciliation},
  consignacion:{available:consignacion.dataAvailable,qualityPass:consignacion.qualityPass,endpoint:consignacion.endpoint,provinces:consignacion.structured?.provinceCount,communities:consignacion.structured?.communityCount,reconciliation:consignacion.structured?.reconciliation},
  geographyReady:out.geographyReady,
  bothSurfacesReady:out.bothSurfacesReady,
  probeIntegrityPass:out.probeIntegrityPass,
  analysisReady:out.analysisReady,
  readinessReason:out.readinessReason,
  qualityPass:out.qualityPass
},null,2));
