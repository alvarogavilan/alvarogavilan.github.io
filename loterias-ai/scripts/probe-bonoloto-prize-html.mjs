import fs from 'node:fs';
const url='https://www.azarysuerte.es/HistoricoBO.php/';
const r=await fetch(url,{headers:{'user-agent':'LoteriasAI/1.0 research','accept':'text/html'}});
const html=await r.text();
const needles=['Reparto de premios','1ª (6 Aciertos)','5ª (3 Aciertos)','Fecha:'];
const snippets={};
for(const n of needles){const i=html.indexOf(n);snippets[n]=i>=0?html.slice(Math.max(0,i-1200),i+4500):null;}
const dates=[...html.matchAll(/(?:Fecha:|Fecha[^>]*>)[^0-9]{0,100}(\d{1,2}\/\d{1,2}\/\d{4})/gi)].slice(0,20).map(x=>x[1]);
const out={generatedAt:new Date().toISOString(),status:r.status,bytes:html.length,dates,snippets};
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});
fs.writeFileSync('loterias-ai/data/probes/bonoloto-prize-html.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:r.status,bytes:html.length,dates,snippetKeys:Object.fromEntries(Object.entries(snippets).map(([k,v])=>[k,!!v]))},null,2));