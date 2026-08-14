import fs from 'node:fs';
const date='20260808',first='57521',second='23381',id='1318809064',drawId='1318809102',num='64',year='2026';
const base='https://www.loteriasyapuestas.es';
const queries=[
  `drawId=${drawId}`,`id_sorteo=${id}`,`game_id=LNAC&fecha_sorteo=${date}`,
  `game_id=LNAC&drawId=${drawId}`,`game_id=LNAC&id_sorteo=${id}`,
  `sorteo=${num}&anyo=${year}`,`num_sorteo=${num}&anyo=${year}`,
  `game_id=LNAC&num_sorteo=${num}&anyo=${year}`
];
const endpoints=['/servicios/resultados1','/servicios/resultados2','/servicios/escrutinio1'];
const attempts=[];
for(const ep of endpoints)for(const q of queries){const url=`${base}${ep}?${q}`;try{const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 LoteriasAI official probe','accept':'application/json,text/plain,*/*','referer':`${base}/es/loteria-nacional/tablas-y-alambres?drawId=${drawId}`}});const text=await r.text();attempts.push({ep,q,status:r.status,contentType:r.headers.get('content-type'),length:text.length,containsFirst:text.includes(first),containsSecond:text.includes(second),preview:text.slice(0,900)})}catch(e){attempts.push({ep,q,error:String(e)})}}
const hits=attempts.filter(x=>x.containsFirst||x.containsSecond||x.length>1000&&x.status===200);
const out={generatedAt:new Date().toISOString(),date,first,second,id_sorteo:id,drawId,attempts,hits};fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/nacional-alambres-mapping.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({attempts:attempts.length,hits:hits.map(x=>({ep:x.ep,q:x.q,status:x.status,length:x.length,containsFirst:x.containsFirst,containsSecond:x.containsSecond,preview:x.preview?.slice(0,180)}))},null,2));
