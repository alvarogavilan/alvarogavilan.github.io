import fs from 'node:fs';

const URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vSQxwVULcm6WNNgABV5yWBAqb-McS26NFgiEbm5qmWoiDYA4Yk4Yxqa5gS1jnRRUiEFPXb_yf7utD8G/pub?output=csv';
const res=await fetch(URL,{redirect:'follow',signal:AbortSignal.timeout(30000),headers:{'user-agent':'LoteriasAI/1.0 archive'}});if(!res.ok)throw new Error(`Lototurf CSV HTTP ${res.status}`);const text=await res.text();
const isoDate=s=>{const m=String(s).match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);if(!m)return null;let y=m[3];if(y.length===2)y=(+y>=70?'19':'20')+y;return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`};
const rows=[],rejected=[];
for(const [idx,line] of text.split(/\r?\n/).entries()){
 const date=isoDate(line);if(!date)continue;
 const dm=line.match(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/);const after=dm?line.slice((dm.index||0)+dm[0].length):line;
 const nums=(after.match(/\b\d{1,2}\b/g)||[]).map(Number);
 if(nums.length<8){rejected.push({idx:idx+1,date,reason:'less-than-8-numbers',raw:line.slice(0,240)});continue}
 const main=nums.slice(0,6),horse=nums[6],reintegro=nums[7];
 if(new Set(main).size!==6||main.some(n=>n<1||n>31)||horse<1||horse>20||reintegro<0||reintegro>9){rejected.push({idx:idx+1,date,reason:'range-or-duplicate',main,horse,reintegro,raw:line.slice(0,240)});continue}
 rows.push({drawDate:date,result:{main:[...main].sort((a,b)=>a-b),horse,reintegro},source:{provider:'Lotoideas CSV',tier:'secondary-history',url:URL,validation:'structural-pending-official-cross-check'}})
}
rows.sort((a,b)=>a.drawDate.localeCompare(b.drawDate));const dedup=[];const seen=new Set();for(const r of rows){if(seen.has(r.drawDate))continue;seen.add(r.drawDate);dedup.push(r)}
if(dedup.length<500)throw new Error(`Lototurf parsed too few records: ${dedup.length}`);
const dir='loterias-ai/data/archive/lototurf';fs.mkdirSync(dir,{recursive:true});const years=[...new Set(dedup.map(r=>r.drawDate.slice(0,4)))];for(const y of years){const records=dedup.filter(r=>r.drawDate.startsWith(y+'-')).map(r=>({drawId:`lototurf-${r.drawDate}`,gameId:'lototurf',...r}));fs.writeFileSync(`${dir}/${y}.json`,JSON.stringify({gameId:'lototurf',year:+y,verificationLevel:'SECONDARY_STRUCTURAL',records},null,2)+'\n')}
const summary={generatedAt:new Date().toISOString(),gameId:'lototurf',source:URL,records:dedup.length,earliest:dedup[0]?.drawDate,latest:dedup.at(-1)?.drawDate,years:years.length,rejected:rejected.length,rejectedSamples:rejected.slice(0,20)};fs.mkdirSync('loterias-ai/data/archive/_meta',{recursive:true});fs.writeFileSync('loterias-ai/data/archive/_meta/lototurf-import.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({...summary,rejectedSamples:summary.rejectedSamples.slice(0,5)},null,2));
