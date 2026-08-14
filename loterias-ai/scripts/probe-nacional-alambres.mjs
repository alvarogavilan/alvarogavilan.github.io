import fs from 'node:fs';
const samples=[
 {date:'20260808',id:'1318809064',first:'57521',second:'23381'},
 {date:'20260716',id:'1316509057',first:'11312',second:'78148'},
 {date:'20260813',id:'1319309065',first:'38221',second:'71161'}
];
const endpoints=['/servicios/resultados1','/servicios/resultados2','/servicios/escrutinio1'];
const attempts=[];
for(const s of samples)for(const ep of endpoints){const url=`https://www.loteriasyapuestas.es${ep}?idsorteo=${s.id}`;try{const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 LoteriasAI official archive','accept':'application/json,text/plain,*/*','referer':'https://www.loteriasyapuestas.es/es/loteria-nacional/tablas-y-alambres'}});const text=await r.text();attempts.push({...s,ep,url,status:r.status,contentType:r.headers.get('content-type'),length:text.length,containsFirst:text.includes(s.first),containsSecond:text.includes(s.second),preview:text.slice(0,1500)})}catch(e){attempts.push({...s,ep,url,error:String(e)})}}
const hits=attempts.filter(x=>x.containsFirst||x.containsSecond||x.length>1000&&x.status===200);
const out={generatedAt:new Date().toISOString(),parameter:'idsorteo',attempts,hits};fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/nacional-alambres-mapping.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({attempts:attempts.length,hits:hits.map(x=>({date:x.date,ep:x.ep,status:x.status,length:x.length,containsFirst:x.containsFirst,containsSecond:x.containsSecond,preview:x.preview?.slice(0,300)}))},null,2));if(!samples.every(s=>attempts.some(x=>x.date===s.date&&x.ep==='/servicios/resultados2'&&x.containsFirst&&x.containsSecond)))process.exit(2);
