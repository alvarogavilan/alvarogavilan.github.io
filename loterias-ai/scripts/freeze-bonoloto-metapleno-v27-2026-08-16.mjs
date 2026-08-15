import fs from 'node:fs';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const TARGET='2026-08-16';
const EXPECTED_CUTOFF='2026-08-13';
const unknownDates=['2026-08-14','2026-08-15'];
const v26=JSON.parse(fs.readFileSync(`${ROOT}/data/research/meta-pleno-v26-bonoloto-local-robustness.json`,'utf8'));
const eligible=(v26.leaders||[]).filter(x=>Math.min(Number(x.spec?.lag1||0),Number(x.spec?.lag2||0))>=3).slice(0,3);
if(eligible.length<2) throw new Error(`Need >=2 v26 leaders independent of missing 14/15 Aug draws; got ${eligible.length}`);

let rows=[];
for(const f of fs.readdirSync(`${ROOT}/data/archive/bonoloto`).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  rows.push(...(JSON.parse(fs.readFileSync(`${ROOT}/data/archive/bonoloto/${f}`,'utf8')).records||[]));
}
rows=rows.filter(r=>r.drawDate&&r.drawDate<=EXPECTED_CUTOFF&&Array.isArray(r.result?.main)&&r.result.main.length===6&&new Set(r.result.main).size===6).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const latest=rows.at(-1)?.drawDate;
if(latest!==EXPECTED_CUTOFF) throw new Error(`Expected immutable information cutoff ${EXPECTED_CUTOFF}, got ${latest}`);
const seq=[...rows,...unknownDates.map(drawDate=>({drawDate,result:{main:[]}})),{drawDate:TARGET,result:{main:[]}}];
const i=seq.length-1,max=49,k=6;
const mod=x=>((x-1)%max+max)%max+1;
function addUnique(o,v,step){let e=((step%max)+max)%max;if(e===0)e=1;let g=0;while(o.includes(v)&&g++<max)v=mod(v+e);g=0;while(o.includes(v)&&g++<max)v=mod(v+1);if(o.includes(v))throw new Error('cannot unique');o.push(v)}
function predict(s){const A=seq[i-s.lag1]?.result?.main||[],B=seq[i-s.lag2]?.result?.main||[];if(A.length!==k||B.length!==k)throw new Error(`Spec ${s.id} depends on unavailable future result`);const dt=new Date(`${TARGET}T12:00:00Z`),day=dt.getUTCDate(),mon=dt.getUTCMonth()+1,dow=dt.getUTCDay(),o=[];for(let q=0;q<k;q++){const x=A[(s.p1+q+s.rot)%k],y=B[(s.p2+(s.mirror?k-1-q:q))%k];let z;if(s.mode===0)z=s.a*x+s.b*y+s.d*day+s.e*mon+s.f+s.step*q;else if(s.mode===1)z=s.a*(x-y)+s.b*(x+y)+s.d*dow+s.e*q+s.f;else if(s.mode===2)z=s.a*x+s.b*y+s.d*(x%10)+s.e*(y%10)+s.f+s.step*(day+q);else if(s.mode===3)z=s.a*(x+q)+s.b*(y-q)+s.d*(day+mon)+s.e*dow+s.f;else if(s.mode===4)z=s.a*(x*y%max)+s.b*(x-y)+s.d*day+s.e*(mon+q)+s.f;else z=s.a*(x+day)+s.b*(y+mon)+s.d*(q+1)*(dow+1)+s.e*(x%7-y%7)+s.f;addUnique(o,mod(z),s.step)}return o.sort((a,b)=>a-b)}
const tickets=eligible.map((x,rank)=>({rank:rank+1,label:String(x.spec.id),specId:x.spec.id,numbers:predict(x.spec),selectionEvidence:{validation:x.validation,test:x.test,rank:x.rank},spec:x.spec}));
const sealPayload=JSON.stringify({targetDrawDate:TARGET,informationCutoff:latest,unknownDates,tickets:tickets.map(({rank,label,specId,numbers})=>({rank,label,specId,numbers}))});
const out={generatedAt:new Date().toISOString(),targetDrawDate:TARGET,game:'bonoloto',status:'PROSPECTIVE_SHADOW_FROZEN',engine:'MetaPleno-v27 v26-derived missing-data-safe panel',policy:'Frozen before the 2026-08-14, 2026-08-15 and 2026-08-16 outcomes are available locally. Candidates are selected from already-produced v26 leaders, but only when both lags are >=3, guaranteeing their 2026-08-16 ticket uses information dated 2026-08-13 or earlier.',informationCutoff:latest,unknownInterveningDraws:unknownDates,panelSize:tickets.length,unitCostEUR:0.5,theoreticalCostEUR:tickets.length*0.5,realStakeEUR:0,tickets,sealSHA256:crypto.createHash('sha256').update(sealPayload).digest('hex'),evaluationRule:'Never modify these tickets. After official 2026-08-16 result, score 6/6, 5/6 and 5+C where applicable; compare with same-size random panels and preserve negative outcomes.',realMoneyPass:false};
fs.mkdirSync(`${ROOT}/data/shadow`,{recursive:true});
fs.writeFileSync(`${ROOT}/data/shadow/bonoloto-2026-08-16-metapleno-v27.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({target:TARGET,cutoff:latest,unknownDates,tickets:tickets.map(x=>({label:x.label,numbers:x.numbers,lags:[x.spec.lag1,x.spec.lag2]})),seal:out.sealSHA256},null,2));