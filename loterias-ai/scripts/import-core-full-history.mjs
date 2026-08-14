import fs from 'node:fs';
const S={
 primitiva:{urls:['https://docs.google.com/spreadsheets/d/e/2PACX-1vTov1BuA0nkVGTS48arpPFkc9cG7B40Xi3BfY6iqcWTrMwCBg5b50-WwvnvaR6mxvFHbDBtYFKg5IsJ/pub?gid=0&output=csv&single=true','https://docs.google.com/spreadsheets/d/e/2PACX-1vTov1BuA0nkVGTS48arpPFkc9cG7B40Xi3BfY6iqcWTrMwCBg5b50-WwvnvaR6mxvFHbDBtYFKg5IsJ/pub?gid=1&output=csv&single=true'],pick:6,max:49,secondary:{name:'complementary',idx:7},reintegro:8,joker:9},
 euromillones:{urls:['https://docs.google.com/spreadsheets/d/e/2PACX-1vRy91wfK2JteoMi1ZOhGm0D1RKJfDTbEOj6rfnrB6-X7n2Q1nfFwBZBpcivHRdg3pSwxSQgLA3KpW7v/pub?output=csv'],pick:5,max:50,stars:[7,8]},
 'gordo-primitiva':{urls:['https://docs.google.com/spreadsheets/d/e/2PACX-1vRR678qNlN_3p2dAxRG0LULS6EYmBbEmpfVhCEmsYky6eiuEH3o_mCRc4c2_EevPru_3BJfSV0QwpG8/pub?output=csv'],pick:5,max:54,key:6},
 eurodreams:{urls:['https://docs.google.com/spreadsheets/d/e/2PACX-1vTZzm-CTUj3li4EdfW1ImthPdc0AGIymq8tbuwPiqjW0OL4F1MWO5G6PfPEtNvLJcY8MpJo4apayTip/pub?output=csv'],pick:6,max:40,dream:7}
};
const date=s=>{const m=String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!m)return null;return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`};
const split=line=>line.split(',').map(x=>x.trim().replace(/^"|"$/g,''));
const allSummary={generatedAt:new Date().toISOString(),source:'Lotoideas CSV',validation:'range-uniqueness-date-shape',games:{}};
for(const [gameId,cfg] of Object.entries(S)){
 let lines=[];for(const url of cfg.urls){const r=await fetch(url,{redirect:'follow'});if(!r.ok)throw new Error(`${gameId} source ${r.status}`);const t=await r.text();lines.push(...t.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean).slice(1));}
 const seen=new Set(),records=[];let rejected=0;
 for(const line of lines){const c=split(line),drawDate=date(c[0]);const main=c.slice(1,1+cfg.pick).map(Number);if(!drawDate||main.length!==cfg.pick||main.some(n=>!Number.isInteger(n)||n<1||n>cfg.max)||new Set(main).size!==cfg.pick){rejected++;continue;}const id=`${gameId}-${drawDate}`;if(seen.has(id))continue;seen.add(id);const result={main};
  if(cfg.secondary){const v=Number(c[cfg.secondary.idx]);if(Number.isInteger(v))result[cfg.secondary.name]=v;}
  if(cfg.reintegro!=null){const v=Number(c[cfg.reintegro]);if(Number.isInteger(v))result.reintegro=v;}
  if(cfg.joker!=null&&c[cfg.joker])result.joker=String(c[cfg.joker]).padStart(7,'0');
  if(cfg.stars){const a=cfg.stars.map(i=>Number(c[i])).filter(Number.isInteger);if(a.length===2)result.stars=a;}
  if(cfg.key!=null){const v=Number(c[cfg.key]);if(Number.isInteger(v))result.key=v;}
  if(cfg.dream!=null){const v=Number(c[cfg.dream]);if(Number.isInteger(v))result.dream=v;}
  records.push({drawId:id,gameId,drawDate,result,source:{provider:'Lotoideas CSV',tier:'secondary-history',validation:'pending-official-cross-check'}});
 }
 records.sort((a,b)=>a.drawDate.localeCompare(b.drawDate));const years={};for(const r of records)(years[r.drawDate.slice(0,4)]??=[]).push(r);
 const dir=`loterias-ai/data/archive/${gameId}`;fs.mkdirSync(dir,{recursive:true});for(const [y,rs] of Object.entries(years))fs.writeFileSync(`${dir}/${y}.json`,JSON.stringify({gameId,year:+y,records:rs},null,2)+'\n');
 const summary={totalRecords:records.length,rejected,earliest:records[0]?.drawDate||null,latest:records.at(-1)?.drawDate||null,years:Object.keys(years).map(Number),yearCounts:Object.fromEntries(Object.entries(years).map(([y,rs])=>[y,rs.length])),validation:{rangeAndUniqueness:'PASS',officialCrossCheck:'PENDING'}};fs.writeFileSync(`${dir}/full-history-summary.json`,JSON.stringify(summary,null,2)+'\n');allSummary.games[gameId]=summary;console.log(gameId,summary.totalRecords,summary.earliest,summary.latest);
}
fs.writeFileSync('loterias-ai/data/archive/core-full-history-summary.json',JSON.stringify(allSummary,null,2)+'\n');