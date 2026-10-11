import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const SRC='loterias-ai/scripts/meta-pleno-v157-pre2023-hybrid-selector.mjs';
if(!fs.existsSync(SRC)) throw new Error('v157 source required');
let s=fs.readFileSync(SRC,'utf8');
s=s.replace("meta-pleno-v157-pre2023-hybrid-selector.json","meta-pleno-v158-clean-hybrid-selector.json")
 .replace("version:'v157'","version:'v158'")
 .replace("family:'PRE2023_HYBRID_ROUTE_SELECTOR'","family:'CLEAN_PREDRAW_PRE2023_HYBRID_SELECTOR'")
 .replace("rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b)})","const sr=structuralRoute(r);rawDays.push({date:d.date,winning:d.n,r,gr,base:r.slice(0,8).map(x=>x.n).sort((a,b)=>a-b),sr})")
 .replace("sr=structuralRoute(day.r),structHits=day.winning.filter(n=>sr.pool.includes(n)).length","sr=day.sr,structHits=day.winning.filter(n=>sr.pool.includes(n)).length")
 .replace("Single Budget8 hybrid with two frozen rescue routes. Route A is the v132 structural one-swap candidate.","Corrected strict pre-draw Budget8 hybrid. Route A is the v132 structural one-swap candidate computed and frozen before each historical draw, with no future structural distribution leakage.")
 .replace("decision:'EXPLORATORY_HYBRID_REQUIRES_FRESH_PROSPECTIVE_REPLICATION'","decision:'CLEAN_PREDRAW_EXPLORATORY_HYBRID_REQUIRES_FRESH_PROSPECTIVE_REPLICATION'");
const tmp='/tmp/meta-pleno-v158.mjs';
fs.writeFileSync(tmp,s);
await import(pathToFileURL(tmp).href);
