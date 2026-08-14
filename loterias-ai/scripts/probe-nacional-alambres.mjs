import fs from 'node:fs';
const samples=[
 {date:'20260808',id:'1318809064',first:'57521',second:'23381'},
 {date:'20260716',id:'1316509057',first:'11312',second:'78148'},
 {date:'20260813',id:'1319309065',first:'38221',second:'71161'}
];
const outSamples=[];
for(const s of samples){const url=`https://www.loteriasyapuestas.es/servicios/resultados2?idsorteo=${s.id}`;const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 LoteriasAI official schema probe','accept':'application/json,*/*','referer':'https://www.loteriasyapuestas.es/es/loteria-nacional/tablas-y-alambres'}});const j=await r.json();const shape={};for(const [k,v] of Object.entries(j||{})){if(Array.isArray(v))shape[k]={type:'array',length:v.length,sample:v.slice(0,5)};else if(v&&typeof v==='object')shape[k]={type:'object',value:v};else shape[k]={type:typeof v,value:v}}outSamples.push({...s,url,status:r.status,keys:Object.keys(j||{}),shape,validated:String(j?.primerPremio?.decimo||'')===s.first&&String(j?.segundoPremio?.decimo||'')===s.second})}
const out={generatedAt:new Date().toISOString(),provider:'SELAE',service:'resultados2',samples:outSamples};fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/nacional-alambres-mapping.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(outSamples.map(x=>({date:x.date,status:x.status,validated:x.validated,keys:x.keys,arrays:Object.fromEntries(Object.entries(x.shape).filter(([,v])=>v.type==='array').map(([k,v])=>[k,v.length]))})),null,2));if(!outSamples.every(x=>x.status===200&&x.validated))process.exit(2);
