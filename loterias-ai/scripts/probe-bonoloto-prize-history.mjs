import fs from 'node:fs';
const urls=[
'https://www.azarysuerte.es/downloads/Azar_y_Suerte_Hist_Bonoloto.csv',
'https://www.azarysuerte.es/HistoricoBO.php/downloads/Azar_y_Suerte_Hist_Bonoloto.csv',
'https://www.azarysuerte.es/HistoricoBO.php/'
];
const out=[];for(const url of urls){try{const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'LoteriasAI/1.0 research archive','accept':'text/csv,text/html,*/*'}}),text=await r.text();out.push({url,finalUrl:r.url,status:r.status,type:r.headers.get('content-type'),length:text.length,preview:text.slice(0,2500)});console.log('\n###',url,'=>',r.url,r.status,r.headers.get('content-type'),text.length,'\n',text.slice(0,1200));}catch(e){out.push({url,error:String(e)})}}
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/bonoloto-prize-history.json',JSON.stringify({generatedAt:new Date().toISOString(),sources:out},null,2)+'\n');