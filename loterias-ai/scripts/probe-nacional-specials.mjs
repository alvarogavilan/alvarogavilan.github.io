import fs from 'node:fs';
const urls=[
 'https://www.azarysuerte.es/HistoricoNA.php/',
 'https://www.azarysuerte.es/downloads/Azar_y_Suerte_Hist_Nacional.csv',
 'https://www.azarysuerte.es/downloads/Azar_y_Suerte_Hist_Loteria_Nacional.csv'
];
const out={generatedAt:new Date().toISOString(),sources:[]};
for(const url of urls){
 try{
  const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'LoteriasAI/1.0 research archive','accept':'text/html,text/csv,*/*'}});const text=await r.text();
  const dates=[...text.matchAll(/(?:Sorteo[^\n<]{0,100}?|Fecha:?\s*)(\d{2}\/\d{2}\/\d{4})/gi)].map(m=>m[1]);
  const links=[...text.matchAll(/href=["']([^"']+)["']/gi)].map(m=>m[1]).filter(x=>/csv|nacional|navidad|ni[nñ]o/i.test(x));
  out.sources.push({url,status:r.status,contentType:r.headers.get('content-type'),bytes:text.length,dateCount:dates.length,earliest:dates.at(-1)||null,latest:dates[0]||null,links:[...new Set(links)].slice(0,80),hasNavidad:/Navidad/i.test(text),hasNino:/Ni(?:ñ|&ntilde;|n)o/i.test(text),head:text.slice(0,500)});
 }catch(e){out.sources.push({url,error:String(e)})}
}
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});
fs.writeFileSync('loterias-ai/data/probes/nacional-specials-source.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
