import fs from 'node:fs';
const years=[2024,2025,2026];
const out=[];
for(const y of years){
  const url=`https://www.primitivacomprobar.es/historico-primitiva.php?anno=${y}`;
  const r=await fetch(url,{headers:{'user-agent':'LoteriasAI/1.0 research','accept':'text/html'}});
  const text=await r.text();
  const dates=[...text.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)].map(m=>m[1]);
  const euros=[...text.matchAll(/([0-9.]+(?:,[0-9]{1,2})?)\s*€/g)].map(m=>m[1]);
  out.push({year:y,url,status:r.status,bytes:text.length,dateCount:dates.length,uniqueDates:new Set(dates).size,sampleDates:[...new Set(dates)].slice(0,5),euroCount:euros.length,containsFirstCategory:/1ª\s*Cat/i.test(text),containsSecondCategory:/2ª\s*Cat/i.test(text),head:text.slice(0,1200)});
}
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});
fs.writeFileSync('loterias-ai/data/probes/primitiva-year-prizes.json',JSON.stringify({generatedAt:new Date().toISOString(),out},null,2)+'\n');
console.log(JSON.stringify(out,null,2));