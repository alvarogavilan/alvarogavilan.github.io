import fs from 'node:fs';
const base='https://resultados-de-loteria.com/lototurf/resultados';
const months={ene:1,feb:2,mar:3,abr:4,may:5,jun:6,jul:7,ago:8,sep:9,oct:10,nov:11,dic:12};
const clean=s=>String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const all=[],failed=[];
for(let year=2005;year<=2017;year++){
 const url=`${base}/${year}`;
 try{
  const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(20000),headers:{'user-agent':'LoteriasAI/1.0 archive'}});if(!r.ok){failed.push({year,status:r.status});continue}
  const html=await r.text();
  for(const tr of html.match(/<tr[\s\S]*?<\/tr>/gi)||[]){
   const txt=clean(tr).toLowerCase();const dm=txt.match(/(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)?\s*(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?\s*(\d{4})?/i);if(!dm)continue;
   const y=dm[3]?Number(dm[3]):year,month=months[dm[2].slice(0,3)],day=Number(dm[1]);if(y!==year||!month)continue;
   const vals=[];for(const m of tr.matchAll(/<li[^>]*>\s*(\d{1,2})\s*<\/li>/gi))vals.push(Number(m[1]));
   if(vals.length<8){const textNums=(clean(tr).match(/\b\d{1,2}\b/g)||[]).map(Number);if(textNums.length>=8)vals.push(...textNums.slice(-8));}
   if(vals.length<8)continue;const result=vals.slice(0,8),main=result.slice(0,6),horse=result[6],reintegro=result[7];
   if(new Set(main).size!==6||main.some(n=>n<1||n>31)||horse<1||horse>20||reintegro<0||reintegro>9)continue;
   const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
   all.push({drawDate:date,result:{main:[...main].sort((a,b)=>a-b),horse,reintegro},source:{provider:'resultados-de-loteria.com',tier:'secondary-history-supplement',url,validation:'cross-check-against-lotoideas-main-and-horse-when-available'}})
  }
 }catch(e){failed.push({year,error:String(e)})}
 await sleep(250);
}
const dedup=new Map(all.map(r=>[r.drawDate,r]));if(dedup.size<400)throw new Error(`Legacy Lototurf coverage unexpectedly small ${dedup.size}`);
const dir='loterias-ai/data/archive/lototurf';fs.mkdirSync(dir,{recursive:true});let written=0,mismatches=[];
for(let year=2005;year<=2017;year++){
 const recs=[...dedup.values()].filter(r=>r.drawDate.startsWith(`${year}-`));if(!recs.length)continue;
 const path=`${dir}/${year}.json`;let existing=[];if(fs.existsSync(path))existing=JSON.parse(fs.readFileSync(path,'utf8')).records||[];const map=new Map(existing.map(r=>[r.drawDate,r]));
 for(const r of recs){const prev=map.get(r.drawDate);if(prev){const p=(prev.result?.main||[]).map(Number).sort((a,b)=>a-b).join(','),n=r.result.main.join(',');if(p&&p!==n){mismatches.push({date:r.drawDate,field:'main',internal:p,supplement:n});continue}if(prev.result?.horse!=null&&Number(prev.result.horse)!==r.result.horse){mismatches.push({date:r.drawDate,field:'horse',internal:prev.result.horse,supplement:r.result.horse});continue}prev.result={...prev.result,reintegro:r.result.reintegro,horse:r.result.horse,main:r.result.main};prev.source={...r.source,archivePreviousSource:prev.source};}else map.set(r.drawDate,{drawId:`lototurf-${r.drawDate}`,gameId:'lototurf',...r});}
 const records=[...map.values()].sort((a,b)=>a.drawDate.localeCompare(b.drawDate));fs.writeFileSync(path,JSON.stringify({gameId:'lototurf',year,verificationLevel:'SECONDARY_CROSS_SOURCE_PARTIAL',records},null,2)+'\n');written+=records.length;
}
if(mismatches.length>10)throw new Error(`Too many Lototurf cross-source mismatches ${mismatches.length}`);
const dates=[...dedup.keys()].sort();const summary={generatedAt:new Date().toISOString(),gameId:'lototurf',coverageState:'PARTIAL_LEGACY_ACCEPTED',legacyRecords:dedup.size,earliest:dates[0],latest:dates.at(-1),writtenRecordsAcrossLegacyPartitions:written,mismatches,failed,nextAction:'fill remaining historical gaps from additional validated sources'};fs.mkdirSync('loterias-ai/data/archive/_meta',{recursive:true});fs.writeFileSync('loterias-ai/data/archive/_meta/lototurf-legacy-backfill.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({...summary,mismatches:mismatches.length,failed:failed.length},null,2));
