import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const SRC='loterias-ai/scripts/meta-pleno-v157-pre2023-hybrid-selector.mjs';
if(!fs.existsSync(SRC)) throw new Error('v157 source required');
let s=fs.readFileSync(SRC,'utf8');
s=s.replace("meta-pleno-v157-pre2023-hybrid-selector.json","meta-pleno-v162-inverted-route-gate.json")
 .replace("version:'v157'","version:'v162'")
 .replace("family:'PRE2023_HYBRID_ROUTE_SELECTOR'","family:'INVERTED_GRAPH_ADVANTAGE_ROUTE_GATE'")
 .replace("sd=a=>{if(a.length<2)return 1;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))||1}","sd=a=>{if(!a.length)return 1;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1}")
 .replace("Math.sqrt((S.structM2[j]/Math.max(1,S.structN-1))||1)","Math.sqrt((S.structM2[j]/Math.max(1,S.structN))||1)")
 .replace("rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b)})","const sr=structuralRoute(r);rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b),sr})")
 .replace("sr=structuralRoute(day.r),structHits=day.winning.filter(n=>sr.pool.includes(n)).length","sr=day.sr,structHits=day.winning.filter(n=>sr.pool.includes(n)).length")
 .replace("const thresholds=[-999,0,4,8,12,16,20,24,28,32,36,40,999]","const thresholds=[-999,0,4,8,12,16,20,24,28,32,36,40,44,48,56,64,999]")
 .replace("const useFrontier=day.graphAdv>=s.threshold","const useFrontier=day.graphAdv<=s.threshold")
 .replace("Single Budget8 hybrid with two frozen rescue routes. Route A is the v132 structural one-swap candidate.","Strict pre-draw single-Budget8 hybrid with an inverted route gate. Route A is the exact v132 structural one-swap candidate.")
 .replace("A single graph-advantage threshold deciding A versus B is selected only on 2021-2022, then frozen before 2023.","A single upper graph-advantage threshold deciding A versus B is selected only on 2021-2022, then frozen before 2023: frontier is used when graph advantage is at or below the threshold; extreme graph advantage routes to structure.")
 .replace("decision:'EXPLORATORY_HYBRID_REQUIRES_FRESH_PROSPECTIVE_REPLICATION'","decision:'INVERTED_GATE_EXPLORATORY_REQUIRES_FRESH_PROSPECTIVE_REPLICATION'");
const tmp='/tmp/meta-pleno-v162.mjs';
fs.writeFileSync(tmp,s);
await import(pathToFileURL(tmp).href);
