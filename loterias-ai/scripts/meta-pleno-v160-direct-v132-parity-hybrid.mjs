import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const SRC='loterias-ai/scripts/meta-pleno-v157-pre2023-hybrid-selector.mjs';
if(!fs.existsSync(SRC)) throw new Error('v157 source required');
let s=fs.readFileSync(SRC,'utf8');
s=s.replace("meta-pleno-v157-pre2023-hybrid-selector.json","meta-pleno-v160-direct-v132-parity-hybrid.json")
 .replace("version:'v157'","version:'v160'")
 .replace("family:'PRE2023_HYBRID_ROUTE_SELECTOR'","family:'DIRECT_EXACT_V132_PARITY_HYBRID_SELECTOR'")
 .replace("sd=a=>{if(a.length<2)return 1;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))||1}","sd=a=>{if(!a.length)return 1;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1}")
 .replace("Math.sqrt((S.structM2[j]/Math.max(1,S.structN-1))||1)","Math.sqrt((S.structM2[j]/Math.max(1,S.structN))||1)")
 .replace("rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b)})","const sr=structuralRoute(r);rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b),sr})")
 .replace("sr=structuralRoute(day.r),structHits=day.winning.filter(n=>sr.pool.includes(n)).length","sr=day.sr,structHits=day.winning.filter(n=>sr.pool.includes(n)).length")
 .replace("Single Budget8 hybrid with two frozen rescue routes. Route A is the v132 structural one-swap candidate.","Direct exact-parity pre-draw Budget8 hybrid. Route A reproduces the original v132 population-SD c12 and structural conventions and is computed before each historical draw.")
 .replace("decision:'EXPLORATORY_HYBRID_REQUIRES_FRESH_PROSPECTIVE_REPLICATION'","decision:'DIRECT_EXACT_V132_PARITY_HYBRID_REQUIRES_FRESH_PROSPECTIVE_REPLICATION'");
for(const required of ["version:'v160'","DIRECT_EXACT_V132_PARITY_HYBRID_SELECTOR","const sr=structuralRoute(r)","Math.max(1,S.structN))"]) if(!s.includes(required)) throw new Error(`v160 transform missing: ${required}`);
const tmp='/tmp/meta-pleno-v160.mjs';
fs.writeFileSync(tmp,s);
await import(pathToFileURL(tmp).href);
