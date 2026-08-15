import fs from 'node:fs';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const TARGET='2026-08-16';
const UNKNOWN_PREVIOUS='2026-08-15';
const specs=[
  {label:'baseline-175757',selection:'Original v5 6/6 research anomaly; frozen candidate',spec:{id:175757,lag1:2,lag2:10,p1:0,p2:3,a:-2,b:-7,d:-2,e:-1,f:0,step:42,rot:4,mirror:false,mode:2}},
  {label:'local-9274',selection:'v26 local neighbor with 5/6 in two research-evaluation years; lag1>=2 permits pre-2026-08-15-result freeze',spec:{id:'local-9274',lag1:2,lag2:8,p1:0,p2:2,a:-3,b:-9,d:-3,e:-2,f:0,step:42,rot:4,mirror:false,mode:2}},
  {label:'local-1371',selection:'v26 local neighbor with a research-evaluation 6/6 in 2024; lag1>=2 permits pre-2026-08-15-result freeze',spec:{id:'local-1371',lag1:2,lag2:12,p1:1,p2:3,a:-2,b:-7,d:-3,e:0,f:0,step:45,rot:3,mirror:false,mode:2}}
];

let rows=[];
for(const f of fs.readdirSync(`${ROOT}/data/archive/bonoloto`).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  rows.push(...(JSON.parse(fs.readFileSync(`${ROOT}/data/archive/bonoloto/${f}`,'utf8')).records||[]));
}
rows=rows.filter(r=>r.drawDate&&r.drawDate<UNKNOWN_PREVIOUS&&Array.isArray(r.result?.main)&&r.result.main.length===6&&new Set(r.result.main).size===6).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const latest=rows.at(-1)?.drawDate;
if(latest!=='2026-08-14') throw new Error(`Expected immutable information cutoff 2026-08-14, got ${latest}`);
// Preserve the unknown 2026-08-15 slot so lag arithmetic for 2026-08-16 is exact.
const seq=[...rows,{drawDate:UNKNOWN_PREVIOUS,result:{main:[]}}, {drawDate:TARGET,result:{main:[]}}];
const i=seq.length-1,max=49,k=6;
const mod=x=>((x-1)%max+max)%max+1;
function addUnique(o,v,step){let e=((step%max)+max)%max;if(e===0)e=1;let g=0;while(o.includes(v)&&g++<max)v=mod(v+e);g=0;while(o.includes(v)&&g++<max)v=mod(v+1);if(o.includes(v))throw new Error('cannot unique');o.push(v)}
function predict(s){const A=seq[i-s.lag1]?.result?.main||[],B=seq[i-s.lag2]?.result?.main||[];if(A.length!==k||B.length!==k)throw new Error(`Spec ${s.id} depends on unavailable future result`);const dt=new Date(`${TARGET}T12:00:00Z`),day=dt.getUTCDate(),mon=dt.getUTCMonth()+1,dow=dt.getUTCDay(),o=[];for(let q=0;q<k;q++){const x=A[(s.p1+q+s.rot)%k],y=B[(s.p2+(s.mirror?k-1-q:q))%k];let z;if(s.mode===0)z=s.a*x+s.b*y+s.d*day+s.e*mon+s.f+s.step*q;else if(s.mode===1)z=s.a*(x-y)+s.b*(x+y)+s.d*dow+s.e*q+s.f;else if(s.mode===2)z=s.a*x+s.b*y+s.d*(x%10)+s.e*(y%10)+s.f+s.step*(day+q);else if(s.mode===3)z=s.a*(x+q)+s.b*(y-q)+s.d*(day+mon)+s.e*dow+s.f;else if(s.mode===4)z=s.a*(x*y%max)+s.b*(x-y)+s.d*day+s.e*(mon+q)+s.f;else z=s.a*(x+day)+s.b*(y+mon)+s.d*(q+1)*(dow+1)+s.e*(x%7-y%7)+s.f;addUnique(o,mod(z),s.step)}return o.sort((a,b)=>a-b)}
const tickets=specs.map((x,rank)=>({rank:rank+1,label:x.label,specId:x.spec.id,numbers:predict(x.spec),selection:x.selection,spec:x.spec}));
const sealPayload=JSON.stringify({targetDrawDate:TARGET,informationCutoff:latest,tickets:tickets.map(({rank,label,specId,numbers})=>({rank,label,specId,numbers}))});
const out={generatedAt:new Date().toISOString(),targetDrawDate:TARGET,game:'bonoloto',status:'PROSPECTIVE_SHADOW_FROZEN',engine:'MetaPleno-v27 v26-derived prospective panel',policy:'Frozen before both the 2026-08-15 result and the 2026-08-16 draw. Only specs with lag1>=2 are used, so the unknown 2026-08-15 result cannot influence any ticket.',informationCutoff:latest,unknownInterveningDraw:UNKNOWN_PREVIOUS,panelSize:tickets.length,unitCostEUR:0.5,theoreticalCostEUR:tickets.length*0.5,realStakeEUR:0,tickets,sealSHA256:crypto.createHash('sha256').update(sealPayload).digest('hex'),evaluationRule:'Never modify these tickets. After official 2026-08-16 result, score 6/6, 5/6, 5+C where applicable and compare with same-size random panels. Preserve negative outcomes.',realMoneyPass:false};
fs.mkdirSync(`${ROOT}/data/shadow`,{recursive:true});
fs.writeFileSync(`${ROOT}/data/shadow/bonoloto-2026-08-16-metapleno-v27.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({target:TARGET,cutoff:latest,tickets:tickets.map(x=>({label:x.label,numbers:x.numbers})),seal:out.sealSHA256},null,2));