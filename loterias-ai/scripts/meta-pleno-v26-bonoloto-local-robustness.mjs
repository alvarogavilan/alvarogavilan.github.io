import fs from 'node:fs';

const ROOT='loterias-ai';
const GAME='bonoloto';
const C={dir:'bonoloto',max:49,k:6};
const BASE={id:175757,lag1:2,lag2:10,p1:0,p2:3,a:-2,b:-7,d:-2,e:-1,f:0,step:42,rot:4,mirror:false,mode:2};
const N=Math.max(1000,Number(process.env.N||12000));
const JACKPOT_DATE='2023-07-31';

let rows=[];
for(const f of fs.readdirSync(`${ROOT}/data/archive/${C.dir}`).filter(x=>/^\d{4}\.json$/.test(x)).sort())rows.push(...(JSON.parse(fs.readFileSync(`${ROOT}/data/archive/${C.dir}/${f}`,'utf8')).records||[]));
rows=rows.filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===C.k&&new Set(r.result.main).size===C.k).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));

const mod=(x,m)=>((x-1)%m+m)%m+1;
function addUnique(o,v,step,max){let e=((step%max)+max)%max;if(e===0)e=1;let g=0;while(o.includes(v)&&g++<max)v=mod(v+e,max);g=0;while(o.includes(v)&&g++<max)v=mod(v+1,max);if(o.includes(v))throw new Error('cannot unique');o.push(v)}
function predict(i,s){const A=rows[i-s.lag1]?.result?.main||[],B=rows[i-s.lag2]?.result?.main||[],dt=new Date(`${rows[i].drawDate}T12:00:00Z`),day=dt.getUTCDate(),mon=dt.getUTCMonth()+1,dow=dt.getUTCDay(),o=[];for(let q=0;q<C.k;q++){const x=A[(s.p1+q+s.rot)%C.k]||q+1,y=B[(s.p2+(s.mirror?C.k-1-q:q))%C.k]||q+1;let z;if(s.mode===0)z=s.a*x+s.b*y+s.d*day+s.e*mon+s.f+s.step*q;else if(s.mode===1)z=s.a*(x-y)+s.b*(x+y)+s.d*dow+s.e*q+s.f;else if(s.mode===2)z=s.a*x+s.b*y+s.d*(x%10)+s.e*(y%10)+s.f+s.step*(day+q);else if(s.mode===3)z=s.a*(x+q)+s.b*(y-q)+s.d*(day+mon)+s.e*dow+s.f;else if(s.mode===4)z=s.a*(x*y%C.max)+s.b*(x-y)+s.d*day+s.e*(mon+q)+s.f;else z=s.a*(x+day)+s.b*(y+mon)+s.d*(q+1)*(dow+1)+s.e*(x%7-y%7)+s.f;addUnique(o,mod(z,C.max),s.step,C.max)}return o.sort((a,b)=>a-b)}
function hits(p,t){let h=0;for(const x of p)if(t.includes(x))h++;return h}
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
const R=rng(0x26b0a10);
function pickDelta(radius=1){return Math.floor(R()*(radius*2+1))-radius}
function mutate(id){if(id===0)return {...BASE,id:'baseline'};const s={...BASE,id:`local-${id}`};s.lag1=Math.max(1,BASE.lag1+pickDelta(1));s.lag2=Math.max(1,BASE.lag2+pickDelta(2));s.p1=mod(BASE.p1+1+pickDelta(1),C.k)-1;s.p2=mod(BASE.p2+1+pickDelta(1),C.k)-1;s.a=BASE.a+pickDelta(2);s.b=BASE.b+pickDelta(2);s.d=BASE.d+pickDelta(2);s.e=BASE.e+pickDelta(2);s.f=BASE.f+pickDelta(4);s.step=Math.max(1,BASE.step+pickDelta(3));s.rot=mod(BASE.rot+1+pickDelta(1),C.k)-1;if(R()<0.08)s.mirror=!BASE.mirror;if(R()<0.12)s.mode=Math.max(0,Math.min(5,BASE.mode+pickDelta(1)));return s}

const idxVal=rows.map((r,i)=>({r,i})).filter(x=>x.r.drawDate>='2020-01-01'&&x.r.drawDate<'2023-01-01').map(x=>x.i);
const idxTest=rows.map((r,i)=>({r,i})).filter(x=>x.r.drawDate>='2023-01-01').map(x=>x.i);
const jackpotIndex=rows.findIndex(r=>r.drawDate===JACKPOT_DATE);
if(jackpotIndex<0)throw new Error('jackpot date missing');
const truthJackpot=rows[jackpotIndex].result.main;

function evalSpec(s){let valNear=0,valFull=0,testNear=0,testFull=0;const years={};for(const i of idxVal){const h=hits(predict(i,s),rows[i].result.main);if(h===6)valFull++;else if(h===5)valNear++}for(const i of idxTest){const h=hits(predict(i,s),rows[i].result.main),y=rows[i].drawDate.slice(0,4);if(!years[y])years[y]={best:0,near:0,full:0};years[y].best=Math.max(years[y].best,h);if(h===6){testFull++;years[y].full++}else if(h===5){testNear++;years[y].near++}}const jp=predict(jackpotIndex,s),jh=hits(jp,truthJackpot);const activeYears=Object.entries(years).filter(([,z])=>z.near+z.full>0).map(([y])=>y);return{spec:s,validation:{full:valFull,near:valNear},test:{full:testFull,near:testNear,activeYears,years},jackpotDate:{hits:jh,prediction:jp}}}

const summaries={tested:N+1,jackpot6:0,jackpot5plus:0,testAny6:0,testAny5plus:0,testRepeatYears2plus:0,valAndTest5plus:0};
const leaders=[];
function keep(x){leaders.push(x);leaders.sort((u,v)=>v.rank-u.rank);if(leaders.length>80)leaders.length=80}
for(let id=0;id<=N;id++){
  const e=evalSpec(mutate(id));
  if(e.jackpotDate.hits===6)summaries.jackpot6++;
  if(e.jackpotDate.hits>=5)summaries.jackpot5plus++;
  if(e.test.full>0)summaries.testAny6++;
  if(e.test.full+e.test.near>0)summaries.testAny5plus++;
  if(e.test.activeYears.length>=2)summaries.testRepeatYears2plus++;
  if(e.validation.full+e.validation.near>0&&e.test.full+e.test.near>0)summaries.valAndTest5plus++;
  const rank=e.test.activeYears.length*1e9+e.test.full*1e8+e.test.near*1e6+e.validation.full*1e5+e.validation.near*1e3+e.jackpotDate.hits;
  if(leaders.length<80||rank>leaders.at(-1).rank)keep({...e,rank});
}

const out={generatedAt:new Date().toISOString(),engine:'MetaPleno-v26-bonoloto-local-robustness',game:GAME,baseSpec:BASE,policy:'Research-only local perturbation audit around frozen spec 175757. 2023-2026 is already-researched evaluation, not virgin holdout. No candidate produced here may be called predictive without a new prospective seal.',windows:{validation:'2020-01-01..2022-12-31',researchEvaluation:'2023-01-01..latest local archive',jackpotDate:JACKPOT_DATE},neighborhood:{samples:N,seed:'0x26b0a10',lag1Radius:1,lag2Radius:2,coefficientRadius:2,fRadius:4,stepRadius:3,smallMirrorAndModeMutation:true},summary:{...summaries,jackpot6Rate:summaries.jackpot6/(N+1),jackpot5plusRate:summaries.jackpot5plus/(N+1),testRepeatYears2plusRate:summaries.testRepeatYears2plus/(N+1)},leaders,interpretation:summaries.jackpot6<=Math.max(2,(N+1)*0.0005)?'JACKPOT_IS_LOCALLY_ISOLATED_OR_VERY_THIN':'JACKPOT_HAS_NONTRIVIAL_LOCAL_BASIN_REQUIRES_FURTHER_NULL_COMPARISON',realMoneyPass:false};
fs.mkdirSync(`${ROOT}/data/research`,{recursive:true});
fs.writeFileSync(`${ROOT}/data/research/meta-pleno-v26-bonoloto-local-robustness.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({summary:out.summary,interpretation:out.interpretation,leader:leaders[0]},null,2));
