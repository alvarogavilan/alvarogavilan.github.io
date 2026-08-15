import fs from 'node:fs';
const SHADOW='loterias-ai/data/shadow/bonoloto-2026-08-15-metapleno-v10-compact.json';
const OUT='loterias-ai/data/shadow/bonoloto-2026-08-15-metapleno-v10-evaluation.json';
const ARCH='loterias-ai/data/archive/bonoloto';
if(!fs.existsSync(SHADOW)) throw new Error('prospective shadow file missing');
const frozen=JSON.parse(fs.readFileSync(SHADOW,'utf8'));
if(frozen.status!=='PROSPECTIVE_SHADOW_FROZEN'||frozen.targetDrawDate!=='2026-08-15') throw new Error('unexpected frozen state');
let rows=[];for(const f of fs.readdirSync(ARCH).filter(x=>/^\d{4}\.json$/.test(x)).sort()){const j=JSON.parse(fs.readFileSync(`${ARCH}/${f}`,'utf8'));rows.push(...(j.records||[]));}
const draw=rows.find(r=>r.drawDate==='2026-08-15'&&Array.isArray(r.result?.main)&&r.result.main.length===6);
if(!draw){console.log(JSON.stringify({status:'AWAITING_OFFICIAL_RESULT',targetDrawDate:'2026-08-15'}));process.exit(0)}
const truth=[...draw.result.main].map(Number).sort((a,b)=>a-b),comp=Number(draw.result.complementary??NaN),T=new Set(truth);
const scored=frozen.tickets.map(t=>{const nums=[...t.numbers].map(Number).sort((a,b)=>a-b);const mainHits=nums.filter(n=>T.has(n)).length;const complementaryHit=Number.isFinite(comp)&&nums.includes(comp);let classLabel=`${mainHits}/6`;if(mainHits===5&&complementaryHit)classLabel='5+C';if(mainHits===6)classLabel='6/6';return{rank:t.rank,specId:t.specId,numbers:nums,mainHits,complementaryHit,classLabel};});
const best=[...scored].sort((a,b)=>b.mainHits-a.mainHits||Number(b.complementaryHit)-Number(a.complementaryHit))[0];
const out={generatedAt:new Date().toISOString(),engine:'MetaPleno-v10-prospective-evaluator',targetDrawDate:'2026-08-15',status:'PROSPECTIVE_SHADOW_EVALUATED',frozenSealSHA256:frozen.sealSHA256,officialResult:{main:truth,complementary:Number.isFinite(comp)?comp:null,reintegro:draw.result.reintegro??null,verification:draw.verification?.status??null,official:draw.source?.official===true||draw.economics?.validation?.officialSELAE===true},tickets:scored,bestResult:best,successFlags:{full6:scored.some(x=>x.mainHits===6),near5:scored.some(x=>x.mainHits===5),fivePlusComplementary:scored.some(x=>x.mainHits===5&&x.complementaryHit)},theoreticalCostEUR:frozen.theoreticalCostEUR,realStakeEUR:frozen.realStakeEUR,realMoneyPass:false,immutableSource:true};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
