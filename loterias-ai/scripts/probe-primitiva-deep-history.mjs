import fs from 'node:fs';
const base='https://www.azarysuerte.es/HistoricoPR.php';
const candidates=['20250102','20240104','20230105','20220106','02/01/2025','2025-01-02'];
const out=[];
for(const v of candidates){
  for(const key of ['sorteo','fecha','buscar']){
    const url=`${base}?${key}=${encodeURIComponent(v)}`;
    const r=await fetch(url,{headers:{'user-agent':'LoteriasAI/1.0 research','accept':'text/html'}});
    const text=await r.text();
    const dates=[...text.matchAll(/Premios_colapse\((\d{8})\)/g)].map(m=>m[1]);
    out.push({url,status:r.status,bytes:text.length,anchors:dates.length,earliest:dates.at(-1)||null,latest:dates[0]||null,contains2025:dates.some(x=>x.startsWith('2025')),contains2024:dates.some(x=>x.startsWith('2024')),sample:dates.slice(0,3)});
  }
}
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});
fs.writeFileSync('loterias-ai/data/probes/primitiva-deep-history.json',JSON.stringify({generatedAt:new Date().toISOString(),out},null,2)+'\n');
console.log(JSON.stringify(out,null,2));