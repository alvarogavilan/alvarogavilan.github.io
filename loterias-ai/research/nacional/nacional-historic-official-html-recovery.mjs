#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const metaPath='loterias-ai/data/archive/_meta/nacional-official-resultados2.json';
const out='loterias-ai/data/research/nacional-historic-official-html-recovery.json';
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const weekdays=['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
const meta=JSON.parse(fs.readFileSync(metaPath,'utf8'));
const failures=(meta.failures||[]).map(x=>x.date).filter(Boolean).slice(0,120);
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
const report={generatedAt:new Date().toISOString(),source:'SELAE official historical HTML pages',attempted:rows.length,recoveredMajorPrizePages:recovered.length,recoveryRate:rows.length?recovered.length/rows.length:0,scope:'fallback evidence only; does not claim full extraction schema',authenticationBypassAttempted:false,rows};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({attempted:report.attempted,recoveredMajorPrizePages:report.recoveredMajorPrizePages,recoveryRate:report.recoveryRate},null,2));
