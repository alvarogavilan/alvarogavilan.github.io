import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const SRC='loterias-ai/scripts/meta-pleno-v157-pre2023-hybrid-selector.mjs';
if(!fs.existsSync(SRC)) throw new Error('v157 source required');
let s=fs.readFileSync(SRC,'utf8');
s=s.replace("meta-pleno-v157-pre2023-hybrid-selector.json","meta-pleno-v161-route-anatomy.json")
 .replace("version:'v157'","version:'v161'")
 .replace("family:'PRE2023_HYBRID_ROUTE_SELECTOR'","family:'ROUTE_ANATOMY_EXACT_V132_PARITY'")
 .replace("sd=a=>{if(a.length<2)return 1;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))||1}","sd=a=>{if(!a.length)return 1;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1}")
 .replace("Math.sqrt((S.structM2[j]/Math.max(1,S.structN-1))||1)","Math.sqrt((S.structM2[j]/Math.max(1,S.structN))||1)")
 .replace("rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b)})","const sr=structuralRoute(r);rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b),sr})")
 .replace("sr=structuralRoute(day.r),structHits=day.winning.filter(n=>sr.pool.includes(n)).length","sr=day.sr,structHits=day.winning.filter(n=>sr.pool.includes(n)).length")
 .replace("validation:{mid:'2023-2024',late:'2025-latest'},leaders:frozen","validation:{mid:'2023-2024',late:'2025-latest'},diagnostics:days.filter(x=>x.date==='2024-03-05'||x.date==='2025-06-21').map(x=>({date:x.date,winning:x.winning,basePool:x.base,baseHits:x.baseHits,graphAdvantage:x.graphAdv,frontierAdd:x.add9.n,frontierDrop:x.drop.x.n,frontierPool:x.frontierPool,frontierHits:x.frontierHits,structuralPool:x.structPool,structuralHits:x.structHits,structuralGain:x.structGain})),leaders:frozen")
 .replace("decision:'EXPLORATORY_HYBRID_REQUIRES_FRESH_PROSPECTIVE_REPLICATION'","decision:'DESCRIPTIVE_ROUTE_ANATOMY_ONLY'");
const tmp='/tmp/meta-pleno-v161.mjs';
fs.writeFileSync(tmp,s);
await import(pathToFileURL(tmp).href);
