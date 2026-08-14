import fs from 'node:fs';
const urls=[
'https://www.azarysuerte.es/HistoricoGP.php','https://www.azarysuerte.es/HistoricoGO.php','https://www.azarysuerte.es/HistoricoEG.php',
'https://www.azarysuerte.es/HistoricoED.php','https://www.azarysuerte.es/HistoricoEURODREAMS.php','https://www.azarysuerte.es/HistoricoEUD.php'
];
const out=[];
for(const url of urls){
 try{const r=await fetch(url,{headers:{'user-agent':'LoteriasAI/1.0 research','accept':'text/html'}});const t=await r.text();out.push({url,status:r.status,bytes:t.length,anchors:[...t.matchAll(/Premios_colapse\((\d{8})\)/g)].length,hasCategorias:/Categor[ií]as|Aciertos/i.test(t),hasEuro:/€|&euro;/i.test(t),head:t.slice(0,260)});}catch(e){out.push({url,error:String(e)})}
}
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/more-economics-endpoints.json',JSON.stringify({generatedAt:new Date().toISOString(),out},null,2)+'\n');console.log(JSON.stringify(out,null,2));