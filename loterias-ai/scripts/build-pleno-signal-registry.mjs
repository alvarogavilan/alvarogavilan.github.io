import fs from 'node:fs';
import path from 'node:path';
const roots=['loterias-ai/data/research','loterias-ai/data/backtests'];
const outPath='loterias-ai/data/research/pleno-signal-registry.json';
const keyRe=/(exact.*hit|full.*hit|exactmain|exactfull|pleno|jackpot.*hit)/i;
const phaseRe=/(validation|holdout|test|prospective|shadow)/i;
const signals=[];
function walk(v,trail,file){
  if(Array.isArray(v)){v.forEach((x,i)=>walk(x,[...trail,String(i)],file));return;}
  if(!v||typeof v!=='object')return;
  for(const [k,x] of Object.entries(v)){
    const t=[...trail,k];
    if(typeof x==='number'&&x>0&&keyRe.test(k))signals.push({file,path:t.join('.'),value:x,outOfSample:phaseRe.test(t.join('.'))});
    else if(typeof x==='boolean'&&x&&keyRe.test(k))signals.push({file,path:t.join('.'),value:true,outOfSample:phaseRe.test(t.join('.'))});
    if(x&&typeof x==='object')walk(x,t,file);
  }
}
for(const root of roots){if(!fs.existsSync(root))continue;for(const f of fs.readdirSync(root).filter(x=>x.endsWith('.json')).sort()){const p=path.join(root,f);if(p===outPath)continue;try{walk(JSON.parse(fs.readFileSync(p,'utf8')),[],p)}catch{}}}
const dedup=[];const seen=new Set();for(const s of signals){const k=`${s.file}|${s.path}|${s.value}`;if(!seen.has(k)){seen.add(k);dedup.push(s)}}
const out={generatedAt:new Date().toISOString(),policy:'pleno-first-policy.json',filesScanned:roots.flatMap(r=>fs.existsSync(r)?fs.readdirSync(r).filter(x=>x.endsWith('.json')).map(x=>path.join(r,x)):[]).length,positiveExactHitFields:dedup.length,outOfSampleExactHitFields:dedup.filter(x=>x.outOfSample).length,signals:dedup.sort((a,b)=>Number(b.outOfSample)-Number(a.outOfSample)||String(a.file).localeCompare(String(b.file)))};
fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({filesScanned:out.filesScanned,positiveExactHitFields:out.positiveExactHitFields,outOfSampleExactHitFields:out.outOfSampleExactHitFields,top:out.signals.slice(0,20)},null,2));
