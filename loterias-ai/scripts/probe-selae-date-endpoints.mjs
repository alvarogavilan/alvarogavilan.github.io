import fs from 'node:fs';
const tests=[
 ['lototurf-2017','LOTU','20171231'],
 ['lototurf-2010','LOTU','20101226'],
 ['lototurf-2009','LOTU','20091227'],
 ['quintuple-2026','QUPL','20260719'],
 ['quintuple-2020','QUPL','20201227'],
 ['quinigol-2026','QGOL','20260809'],
 ['quiniela-2026','LAQU','20260809']
];
const out=[];for(const [id,game,date] of tests){const wrapper=`https://www.loteriasyapuestas.es/f/loterias/resultados/${game==='QUPL'?'quintuple':game==='LOTU'?'lototurf':game==='QGOL'?'quinigol':'quiniela'}.html?game_id=${game}&fecha_sorteo=${date}`;const service=`https://www.loteriasyapuestas.es/servicios/fechav3?game_id=${game}&fecha_sorteo=${date}`;try{const r=await fetch(service,{redirect:'follow',signal:AbortSignal.timeout(25000),headers:{'user-agent':'LoteriasAI/1.0 research archive','accept':'application/json,text/plain,*/*'}});const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{}out.push({id,game,date,wrapper,service,status:r.status,ok:r.ok,bytes:text.length,json,raw:text.slice(0,12000)});}catch(e){out.push({id,game,date,wrapper,service,error:String(e)})}}
const data={generatedAt:new Date().toISOString(),source:'SELAE /servicios/fechav3',tests:out};fs.mkdirSync('loterias-ai/data/probes',{recursive:true});fs.writeFileSync('loterias-ai/data/probes/selae-date-endpoints.json',JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(out.map(x=>({id:x.id,status:x.status,ok:x.ok,bytes:x.bytes,count:Array.isArray(x.json)?x.json.length:null,error:x.error,firstDate:Array.isArray(x.json)&&x.json[0]?.fecha_sorteo})),null,2));
