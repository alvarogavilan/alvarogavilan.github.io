import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const SRC='loterias-ai/scripts/meta-pleno-v158-clean-hybrid-selector.mjs';
if(!fs.existsSync(SRC)) throw new Error('v158 source required');
let s=fs.readFileSync(SRC,'utf8');
s=s.replace("meta-pleno-v158-clean-hybrid-selector.json","meta-pleno-v159-exact-v132-parity-hybrid.json")
 .replace("version:'v158'","version:'v159'")
 .replace("family:'CLEAN_PREDRAW_PRE2023_HYBRID_SELECTOR'","family:'EXACT_V132_PARITY_PRE2023_HYBRID_SELECTOR'")
 .replace("sd=a=>{if(a.length<2)return 1;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))||1}","sd=a=>{if(!a.length)return 1;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1}")
 .replace("Math.sqrt((S.structM2[j]/Math.max(1,S.structN-1))||1)","Math.sqrt((S.structM2[j]/Math.max(1,S.structN))||1)")
 .replace("Corrected strict pre-draw Budget8 hybrid.","Exact-parity strict pre-draw Budget8 hybrid. c12 z-scores and structural dispersion use the same population-standard-deviation convention as the original v132 implementation.")
 .replace("decision:'CLEAN_PREDRAW_EXPLORATORY_HYBRID_REQUIRES_FRESH_PROSPECTIVE_REPLICATION'","decision:'EXACT_V132_PARITY_EXPLORATORY_HYBRID_REQUIRES_FRESH_PROSPECTIVE_REPLICATION'");
const tmp='/tmp/meta-pleno-v159.mjs';
fs.writeFileSync(tmp,s);
await import(pathToFileURL(tmp).href);
