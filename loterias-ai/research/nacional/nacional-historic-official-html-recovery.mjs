#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const metaPath='loterias-ai/data/archive/_meta/nacional-official-resultados2.json';
const archiveDir='loterias-ai/data/archive/loteria-nacional';
const out='loterias-ai/data/research/nacional-historic-official-html-recovery.json';
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const weekdays=['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
const meta=JSON.parse(fs.readFileSync(metaPath,'utf8'));

function isSeasonal(record){
  const t=String(record?.drawType||'').toUpperCase();
  const d=String(record?.drawDate||'');
  const calendarSeasonal=/-(12-22|01-06)$/.test(d);
  return calendarSeasonal||t.includes('NAVIDAD')||t.includes('NIÑO')||t.includes('NINO');
}
function isSeasonalDate(date){return /-(12-22|01-06)$/.test(String(date||''));}
function isOfficialComplete(record){
  const r=record?.result||{};
  return !!(r.firstPrize&&r.secondPrize&&Array.isArray(r.reintegro)&&r.officialPrizeAmounts&&r.detailedExtractions);
}

const archiveDates=[];
for(const name of fs.readdirSync(archiveDir).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const doc=JSON.parse(fs.readFileSync(path.join(archiveDir,name),'utf8'));
  for(const record of doc.records||[]){
    if(!record?.drawDate||isSeasonal(record)||isOfficialComplete(record)) continue;
    archiveDates.push(record.drawDate);
  }
}
const metaFailures=(meta.failures||[]).map(x=>x.date).filter(Boolean).filter(date=>!isSeasonalDate(date));
const failures=[...new Set([...archiveDates,...metaFailures])].sort((a,b)=>b.localeCompare(a));
const rows=[];
function slug(date){const d=new Date(date+'T12:00:00Z');const dd=String(d.getUTCDate()).padStart(2,'0'),m=months[d.getUTCMonth()],y=d.getUTCFullYear(),w=weekdays[d.getUTCDay()];return `https://www.loteriasyapuestas.es/es/loteria-nacional/resultados/loteria-nacional-premios-mayores-del-sorteo-del-${w}-${dd}-de-${m}-de-${y}`}
for(const date of failures){
  const url=slug(date);let status=0,text='',error=null;
  try{const r=await fetch(url,{headers:{'user-agent':'LoteriasAI-research/1.0',accept:'text/html'}});status=r.status;text=await r.text();}catch(e){error=String(e)}
  const plain=text.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
  const m=plain.match(/premio ha correspondido al n(?:ú|u)mero\s+([0-9]{1,5})/i);
  const firstPrize=m?String(m[1]).padStart(5,'0'):null;
  rows.push({date,url,status,firstPrize,officialPageRecovered:status===200&&!!firstPrize,error});
  await new Promise(r=>setTimeout(r,120));
}
const recovered=rows.filter(x=>x.officialPageRecovered);
const unresolved=rows.filter(x=>!x.officialPageRecovered);
const report={
  generatedAt:new Date().toISOString(),
  source:'SELAE official historical HTML pages',
  attempted:rows.length,
  recoveredMajorPrizePages:recovered.length,
  unresolvedPages:unresolved.length,
  recoveryRate:rows.length?recovered.length/rows.length:0,
  dateRange:rows.length?{newest:rows[0].date,oldest:rows.at(-1).date}:null,
  sourceMeta:{generatedAt:meta.generatedAt,totalNonSeasonal:meta.totalNonSeasonal,officialCompleteSchemaDraws:meta.officialCompleteSchemaDraws,coverage:meta.coverage},
  gapSet:{archiveIncompleteDates:archiveDates.length,metaFailureDates:metaFailures.length,deduplicatedDates:failures.length},
  exclusions:{seasonalCalendarDates:['*-12-22','*-01-06'],reason:'Navidad/Nino isolated from ordinary Nacional research even when drawType metadata is missing or wrong'},
  scope:'fallback evidence only; first-prize recovery from official SELAE HTML; does not claim full extraction schema',
  authenticationBypassAttempted:false,
  rows
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({attempted:report.attempted,recoveredMajorPrizePages:report.recoveredMajorPrizePages,unresolvedPages:report.unresolvedPages,recoveryRate:report.recoveryRate,dateRange:report.dateRange,gapSet:report.gapSet,exclusions:report.exclusions},null,2));
