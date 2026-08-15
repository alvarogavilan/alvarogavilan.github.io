import fs from 'node:fs';
const IDS=new Set([175757,35104]);const DIR='loterias-ai/data/research/meta-pleno-v5-shards';let found=[];
for(const f of fs.readdirSync(DIR).filter(x=>x.startsWith('bonoloto-')&&x.endsWith('.json'))){const j=JSON.parse(fs.readFileSync(`${DIR}/${f}`,'utf8'));for(const c of j.top||[])if(IDS.has(c.spec?.id))found.push({specId:c.spec.id,rank:c.rank,spec:c.spec,sourceShard:f})}
const uniq=[];const seen=new Set();for(const x of found)if(!seen.has(x.specId)){seen.add(x.specId);uniq.push(x)}
if(uniq.length!==2)throw new Error(`Expected 2 compact specs, found ${uniq.length}`);
uniq.sort((a,b)=>[175757,35104].indexOf(a.specId)-[175757,35104].indexOf(b.specId));
const out={generatedAt:new Date().toISOString(),game:'bonoloto',engine:'MetaPleno-v10 compact frozen specs',selectionPeriod:'2023-2025',selectionRule:'Diversified event coverage; target-period 2026 excluded from formula selection.',specs:uniq,immutableForProspectiveSeries:true,realMoneyPass:false};
fs.mkdirSync('loterias-ai/data/shadow',{recursive:true});fs.writeFileSync('loterias-ai/data/shadow/bonoloto-metapleno-v10-compact-specs.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));