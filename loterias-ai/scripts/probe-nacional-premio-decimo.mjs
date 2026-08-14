import fs from 'node:fs';
const base='https://www.loteriasyapuestas.es';
const samples=[
 {id:'1318809064',numbers:['57521','23381','12353','12091','12022','12341','99999']},
 {id:'1316509057',numbers:['11312','78148','00000','99999']}
];
const names=['numero','decimo','num','numeroDecimo'];
const attempts=[];
for(const s of samples)for(const n of s.numbers)for(const key of names){const q=`idsorteo=${s.id}&${key}=${n}`;const url=`${base}/servicios/premioDecimoWeb?${q}`;try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 LoteriasAI official payout probe','accept':'application/json,text/plain,*/*','referer':`${base}/es/loteria-nacional/comprobar-loteria-nacional`}});const text=await r.text();attempts.push({id:s.id,number:n,key,url,status:r.status,length:text.length,preview:text.slice(0,1000)})}catch(e){attempts.push({id:s.id,number:n,key,error:String(e)})}}
const out={generatedAt:new Date().toISOString(),service:'premioDecimoWeb',attempts};fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/nacional-premio-decimo.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(attempts,null,2));
