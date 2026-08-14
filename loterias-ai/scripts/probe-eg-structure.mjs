import fs from 'node:fs';
const url='https://www.azarysuerte.es/HistoricoEG.php';
const html=await fetch(url,{headers:{'user-agent':'LoteriasAI/1.0 research','accept':'text/html'}}).then(r=>r.text());
const a=[...html.matchAll(/Premios_colapse\((\d{8})\)/g)][0];
if(!a)throw new Error('No anchor');
const block=html.slice(Math.max(0,a.index-2500),Math.min(html.length,a.index+6500));
const classes=[...new Set([...block.matchAll(/class="([^"]+)"/g)].map(m=>m[1]))];
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/eg-structure.json',JSON.stringify({generatedAt:new Date().toISOString(),anchor:a[1],classes,block},null,2)+'\n');console.log({anchor:a[1],classes});