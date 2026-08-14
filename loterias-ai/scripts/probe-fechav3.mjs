import fs from 'node:fs';
const base='https://www.loteriasyapuestas.es/servicios/fechav3';
const samples=[['BONO','20260720'],['LAPR','20260720'],['EMIL','20260717'],['EDMS','20260720'],['ELGR','20260719'],['LNAC','20260716']];
const out=[];
for(const [gameId,date] of samples){
  const url=`${base}?game_id=${gameId}&fecha_sorteo=${date}`;
  try{
    const r=await fetch(url,{headers:{'user-agent':'LoteriasAI/1.0 research archive','accept':'application/json,text/plain,*/*'}});
    const text=await r.text();
    out.push({gameId,date,status:r.status,contentType:r.headers.get('content-type'),length:text.length,preview:text.slice(0,1200)});
    console.log('\n###',gameId,date,'HTTP',r.status,'type',r.headers.get('content-type'),'len',text.length,'\n',text.slice(0,800));
  }catch(e){out.push({gameId,date,error:String(e)});console.error(gameId,date,e);}
}
fs.mkdirSync('loterias-ai/data/probes',{recursive:true});
fs.writeFileSync('loterias-ai/data/probes/fechav3-latest.json',JSON.stringify({generatedAt:new Date().toISOString(),samples:out},null,2)+'\n');