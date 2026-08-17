import fs from 'node:fs';
const DIR='loterias-ai/data/archive/bonoloto';
const FREEZE='loterias-ai/data/shadow/bonoloto-2026-08-16-metapleno-v54-budget8.json';
const OUT='loterias-ai/data/shadow/bonoloto-2026-08-16-metapleno-v54-budget8-evaluation.json';
if(!fs.existsSync(FREEZE)) throw new Error('Missing immutable prospective freeze');
const f=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(f.status!=='PROSPECTIVE_SHADOW_FROZEN'||!f.immutableAfterFreeze||f.realMoneyPass!==false) throw new Error('Freeze does not satisfy immutable PAPER gate');
if(!(f.dataCutoff<f.targetDrawDate)) throw new Error('Freeze cutoff is not strictly before target');
let target=null;
for(const file of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
 const j=JSON.parse(fs.readFileSync(`${DIR}/${file}`,'utf8'));
 const hit=(j.records||[]).find(r=>r.drawDate===f.targetDrawDate);
 if(hit){target=hit;break;}
}
if(!target){console.log(JSON.stringify({status:'AWAITING_TARGET_ARCHIVE',targetDrawDate:f.targetDrawDate},null,2));process.exit(0)}
const main=target.result?.main;
if(!Array.isArray(main)||main.length!==6) throw new Error('Invalid target result');
const pool=new Set(f.pool);const matched=main.filter(n=>pool.has(n)).sort((a,b)=>a-b);const mainHits=matched.length;
const full6=mainHits===6;
const result={engine:'MetaPleno-v54-bonoloto-budget8-prospective-evaluation',status:'PROSPECTIVE_EVALUATED',evaluatedAt:new Date().toISOString(),targetDrawDate:f.targetDrawDate,freeze:{frozenAt:f.frozenAt,dataCutoff:f.dataCutoff,sealSHA256:f.sealSHA256,pool:f.pool,poolSize:f.poolSize},target:{main:[...main].sort((a,b)=>a-b)},outcome:{mainHits,matched,full6of6:full6,coveredSimpleTicketFull6of6:full6},interpretation:full6?'Prospective pool contained all six main numbers; one of its 28 covered simple combinations is 6/6.':'Prospective pool did not contain all six main numbers; no covered simple combination can be 6/6.',scientific:{retuningPerformed:false,selectionUsedTargetResult:false,prospectiveIntegrity:true},budget:{...f.budget,realStakeEUR:0},realMoneyPass:false};
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,mainHits,full6of6:full6,target:result.target.main,pool:f.pool,realMoney:false},null,2));
