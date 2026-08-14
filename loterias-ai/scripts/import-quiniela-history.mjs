import fs from 'node:fs';

const base='https://www.quinielafutbol.info/historico';
const clean=s=>String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&aacute;/gi,'á').replace(/&eacute;/gi,'é').replace(/&iacute;/gi,'í').replace(/&oacute;/gi,'ó').replace(/&uacute;/gi,'ú').replace(/&ntilde;/gi,'ñ').replace(/\s+/g,' ').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const parseDate=s=>{const m=String(s).match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);if(!m)return null;const y=m[3].length===2?`20${m[3]}`:m[3];return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`};
const validSign=x=>/^(1|X|2|[0-9M]{2})$/i.test(x);
const all=[],failed=[];
for(let y=1972;y<=2025;y++){
  const y2=y+1,url=`${base}/resultados-la-quiniela-${y}-${y2}.html`;
  try{
    const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(20000),headers:{'user-agent':'LoteriasAI/1.0 archive'}});if(!r.ok){failed.push({season:`${y}-${y2}`,status:r.status});continue}
    const html=await r.text();
    for(const tr of html.match(/<tr[\s\S]*?<\/tr>/gi)||[]){
      const cells=[...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1])).filter(Boolean);if(cells.length<3)continue;
      let outcomes=[];
      const combo=cells.find(c=>/^(?:\s*(?:1|X|2|[0-9M]{2})\s*,){10,}/i.test(c));
      if(combo) outcomes=combo.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
      else {const signCells=cells.filter(c=>validSign(c.toUpperCase())).map(c=>c.toUpperCase());if(signCells.length>=15)outcomes=signCells.slice(-15)}
      if(outcomes.length!==15)continue;
      const dateCell=cells.find(c=>parseDate(c));const date=dateCell?parseDate(dateCell):null;
      const jornadaCell=cells.find(c=>/^\d{1,3}$/.test(c));const jornada=jornadaCell?Number(jornadaCell):null;
      all.push({season:`${y}-${String(y2).slice(-2)}`,seasonStart:y,jornada,drawDate:date,outcomes,source:{provider:'QuinielaFutbol.info',tier:'secondary-history',url,validation:'structural-pending-official-cross-check'}})
    }
  }catch(e){failed.push({season:`${y}-${y2}`,error:String(e)})}
  await sleep(120);
}
const dedup=[];const seen=new Set();for(const r of all){const key=`${r.season}|${r.jornada}|${r.drawDate||''}|${r.outcomes.join(',')}`;if(seen.has(key))continue;seen.add(key);dedup.push(r)}
if(dedup.length<1000)throw new Error(`Quiniela parsed too few rows: ${dedup.length}`);
const dir='loterias-ai/data/archive/quiniela';fs.mkdirSync(dir,{recursive:true});
for(const y of [...new Set(dedup.map(r=>r.seasonStart))]){const records=dedup.filter(r=>r.seasonStart===y).map((r,i)=>({drawId:`quiniela-${r.season}-${r.jornada??i+1}`,gameId:'quiniela',drawDate:r.drawDate,season:r.season,jornada:r.jornada,result:{outcomes:r.outcomes},source:r.source}));fs.writeFileSync(`${dir}/${y}.json`,JSON.stringify({gameId:'quiniela',seasonStart:y,verificationLevel:'SECONDARY_STRUCTURAL',records},null,2)+'\n')}
const summary={generatedAt:new Date().toISOString(),gameId:'quiniela',records:dedup.length,seasons:new Set(dedup.map(r=>r.season)).size,earliestSeason:dedup[0]?.season,latestSeason:dedup.at(-1)?.season,failed};fs.mkdirSync('loterias-ai/data/archive/_meta',{recursive:true});fs.writeFileSync('loterias-ai/data/archive/_meta/quiniela-import.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({...summary,failed:failed.length},null,2));
