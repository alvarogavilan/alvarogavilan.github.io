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

function normalizeRows(rows,level){
  if(!Array.isArray(rows))return{valid:[],rejected:[{level,index:null,reason:'not-an-array',raw:null}],rawCount:0};
  const valid=[];
  const rejected=[];
  rows.forEach((x,index)=>{
    const name=String(x?.name??'').trim();
    const series=parseEsNumber(x?.serie);
    const amountEUR=parseEsNumber(x?.total);
    const reasons=[];
    if(!name)reasons.push('missing-name');
    if(series===null)reasons.push('invalid-series');
    if(amountEUR===null)reasons.push('invalid-amount');
    if(reasons.length){
      rejected.push({level,index,reason:reasons.join(','),raw:{name:x?.name??null,serie:x?.serie??null,total:x?.total??null}});
      return;
    }
    valid.push({name,seriesRaw:x?.serie??null,amountRaw:x?.total??null,series,amountEUR});
  });
  return{valid,rejected,rawCount:rows.length};
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
  const provinceParsed=normalizeRows(json?.provincias,'province');
  const communityParsed=normalizeRows(json?.comunidades,'community');
  const provincias=provinceParsed.valid;
  const comunidades=communityParsed.valid;
  const rejectedRows=[...provinceParsed.rejected,...communityParsed.rejected];
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
  const allRowsParsed=rejectedRows.length===0&&provinceParsed.rawCount===provincias.length&&communityParsed.rawCount===comunidades.length;
  const qualityPass=provincias.length>0&&comunidades.length>0&&allRowsParsed&&negativeRows.length===0&&provinceDuplicateNames.length===0&&communityDuplicateNames.length===0&&totalsReconciled;
  return{
    provincias,
    comunidades,
    provinceCount:provincias.length,
    communityCount:comunidades.length,
    rawProvinceCount:provinceParsed.rawCount,
    rawCommunityCount:communityParsed.rawCount,
    allRowsParsed,
    rejectedRows,
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

function territoryKey(name){return String(name??'').trim().toLocaleLowerCase('es-ES')}

function compareTerritoryLevel(salesRows,consignationRows,level){
  const sales=new Map((salesRows||[]).map(x=>[territoryKey(x.name),x]));
  const consignation=new Map((consignationRows||[]).map(x=>[territoryKey(x.name),x]));
  const missingInSales=[...consignation.entries()].filter(([key])=>!sales.has(key)).map(([,x])=>x.name).sort((a,b)=>a.localeCompare(b,'es-ES'));
  const missingInConsignation=[...sales.entries()].filter(([key])=>!consignation.has(key)).map(([,x])=>x.name).sort((a,b)=>a.localeCompare(b,'es-ES'));
  const violations=[];
  for(const [key,s] of sales){
    const c=consignation.get(key);
    if(!c)continue;
    const seriesExcess=s.series-c.series;
    const amountExcessEUR=s.amountEUR-c.amountEUR;
    if(seriesExcess>EPS_SERIES||amountExcessEUR>EPS_EUR){
      violations.push({
        level,
        name:s.name,
        sales:{series:s.series,amountEUR:s.amountEUR},
        consignation:{series:c.series,amountEUR:c.amountEUR},
        seriesExcess,
        amountExcessEUR
      });
    }
  }
  const exactTerritoryCoverage=missingInSales.length===0&&missingInConsignation.length===0;
  return{level,exactTerritoryCoverage,missingInSales,missingInConsignation,violations,qualityPass:exactTerritoryCoverage&&violations.length===0};
}

function compareSalesAndConsignation(ventas,consignacion){
  if(ventas?.dataAvailable!==true||consignacion?.dataAvailable!==true){
    return{ready:false,qualityPass:false,reason:'BOTH_SURFACES_REQUIRED',salesMustNotExceedConsignation:true,exactTerritoryCoverageRequired:true};
  }
  const provinces=compareTerritoryLevel(ventas.structured?.provincias,consignacion.structured?.provincias,'province');
  const communities=compareTerritoryLevel(ventas.structured?.comunidades,consignacion.structured?.comunidades,'community');
  const salesSeriesTotal=ventas.structured?.provinceSeriesTotal??0;
  const consignationSeriesTotal=consignacion.structured?.provinceSeriesTotal??0;
  const salesAmountEUR=ventas.structured?.provinceAmountEUR??0;
  const consignationAmountEUR=consignacion.structured?.provinceAmountEUR??0;
  const globalSeriesExcess=salesSeriesTotal-consignationSeriesTotal;
  const globalAmountExcessEUR=salesAmountEUR-consignationAmountEUR;
  const globalSalesWithinConsignation=globalSeriesExcess<=EPS_SERIES&&globalAmountExcessEUR<=EPS_EUR;
  const qualityPass=provinces.qualityPass&&communities.qualityPass&&globalSalesWithinConsignation;
  return{
    ready:true,
    salesMustNotExceedConsignation:true,
    exactTerritoryCoverageRequired:true,
    global:{
      salesSeriesTotal,
      consignationSeriesTotal,
      salesAmountEUR,
      consignationAmountEUR,
      globalSeriesExcess,
      globalAmountExcessEUR,
      globalSalesWithinConsignation,
      seriesTolerance:EPS_SERIES,
      amountToleranceEUR:EPS_EUR
    },
    provinces,
    communities,
    qualityPass,
    reason:qualityPass?'SALES_WITHIN_CONSIGNATION':'SALES_CONSIGNATION_CROSS_SURFACE_FAILED'
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
      provinceCommunityTotalsMustReconcile:true,
      malformedRowsMustFailClosed:true
    };
  }catch(e){return{kind,pageUrl,error:String(e),dataAvailable:false,qualityPass:false,officialOnly:true,noInference:true}}
}

const ventas=await probeSurface('ventas','urlSalesLNAC');
await sleep(300);
const consignacion=await probeSurface('consignacion','urlConsignationLNAC');
const geographyReady=ventas.dataAvailable===true||consignacion.dataAvailable===true;
const bothSurfacesReady=ventas.dataAvailable===true&&consignacion.dataAvailable===true;
const availableSurfaceQualityPass=(ventas.dataAvailable!==true||ventas.qualityPass===true)&&(consignacion.dataAvailable!==true||consignacion.qualityPass===true);
const crossSurface=compareSalesAndConsignation(ventas,consignacion);
const probeIntegrityPass=availableSurfaceQualityPass&&(!bothSurfacesReady||crossSurface.qualityPass===true);
const qualityPass=bothSurfacesReady&&availableSurfaceQualityPass&&crossSurface.qualityPass===true;

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
  malformedRowsMustFailClosed:true,
  salesMustNotExceedConsignation:true,
  exactTerritoryCoverageRequired:true,
  ventas,
  consignacion,
  crossSurface,
  geographyReady,
  bothSurfacesReady,
  probeIntegrityPass,
  qualityPass,
  analysisReady:qualityPass,
  failClosedWhenSurfaceUnavailable:true,
  readinessReason:qualityPass?'BOTH_OFFICIAL_SURFACES_RECONCILED_AND_SALES_WITHIN_CONSIGNATION':(!geographyReady?'NO_OFFICIAL_GEOGRAPHY_SURFACE_AVAILABLE':!bothSurfacesReady?'ONLY_ONE_OFFICIAL_SURFACE_READY':!availableSurfaceQualityPass?'OFFICIAL_SURFACE_QUALITY_FAILED':'SALES_CONSIGNATION_CROSS_SURFACE_FAILED')
};

fs.mkdirSync('loterias-ai/data/probes',{recursive:true});
fs.writeFileSync('loterias-ai/data/probes/nacional-sales-endpoint.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({
  drawDate,
  drawId,
  ventas:{available:ventas.dataAvailable,qualityPass:ventas.qualityPass,endpoint:ventas.endpoint,provinces:ventas.structured?.provinceCount,communities:ventas.structured?.communityCount,rejectedRows:ventas.structured?.rejectedRows?.length,reconciliation:ventas.structured?.reconciliation},
  consignacion:{available:consignacion.dataAvailable,qualityPass:consignacion.qualityPass,endpoint:consignacion.endpoint,provinces:consignacion.structured?.provinceCount,communities:consignacion.structured?.communityCount,rejectedRows:consignacion.structured?.rejectedRows?.length,reconciliation:consignacion.structured?.reconciliation},
  crossSurface:{qualityPass:crossSurface.qualityPass,reason:crossSurface.reason,global:crossSurface.global,provinceViolations:crossSurface.provinces?.violations?.length,communityViolations:crossSurface.communities?.violations?.length,missingProvinceSales:crossSurface.provinces?.missingInSales?.length,missingProvinceConsignation:crossSurface.provinces?.missingInConsignation?.length},
  geographyReady:out.geographyReady,
  bothSurfacesReady:out.bothSurfacesReady,
  probeIntegrityPass:out.probeIntegrityPass,
  analysisReady:out.analysisReady,
  readinessReason:out.readinessReason,
  qualityPass:out.qualityPass
},null,2));
