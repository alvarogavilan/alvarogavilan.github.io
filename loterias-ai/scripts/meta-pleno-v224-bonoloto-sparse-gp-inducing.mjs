import fs from 'node:fs';

const DIR='loterias-ai/data/archive/bonoloto';
const OUT='loterias-ai/data/research/meta-pleno-v224-bonoloto-sparse-gp-inducing.json';
let rows=[];
for(const f of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  rows.push(...(JSON.parse(fs.readFileSync(`${DIR}/${f}`,'utf8')).records||[]));
}
rows=[...new Map(rows.map(r=>[r.drawId||r.drawDate,r])).values()]
  .filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===6)
  .sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const mains=rows.map(r=>r.result.main.map(Number).sort((a,b)=>a-b));
const sets=mains.map(x=>new Set(x));
const L=rows.length;
const firstEval=Math.max(513,rows.findIndex(r=>r.drawDate>='2018-01-01'));

const prefix=Array.from({length:50},()=>new Uint16Array(L+1));
for(let n=1;n<=49;n++) for(let i=0;i<L;i++) prefix[n][i+1]=prefix[n][i]+(sets[i].has(n)?1:0);
const gaps=new Uint16Array((L+1)*50);
const last=new Int32Array(50);last.fill(-1000000);
for(let i=0;i<=L;i++){
  for(let n=1;n<=49;n++) gaps[i*50+n]=Math.min(200,i-last[n]);
  if(i<L) for(const n of mains[i]) last[n]=i;
}
const wins=[8,24,64,160];
function component(i,n,q){
  if(q<4){const w=wins[q],a=Math.max(0,i-w);return (prefix[n][i]-prefix[n][a])/Math.min(w,i)}
  if(q===4)return gaps[i*50+n]/200;
  return n/49;
}
function stateD2(i,j,n,spatial){
  let z=0;
  for(let q=0;q<5;q++){const d=component(i,n,q)-component(j,n,q);z+=d*d}
  const dn=component(i,n,5)-component(j,n,5);return z+spatial*dn*dn;
}
function hit(pool,s){let h=0;for(const n of pool)if(s.has(n))h++;return h}
function bucket(){return{draws:0,h4:0,h5:0,h6:0,sum:0,events:[]}}
const inducingLags=[4,8,16,24,32,48,64,96,128,192,256,384,512];
const cfgs=[];let id=0;
for(const lengthScale of [.08,.16,.32,.64]) for(const temporalScale of [32,96,256]) for(const spatial of [.25,1]) cfgs.push({id:id++,lengthScale,temporalScale,spatial});
function run(c){
  const P={train:bucket(),mid:bucket(),late:bucket()};let hash=2166136261>>>0;
  for(let i=firstEval;i<L;i++){
    const score=new Float64Array(50);
    for(let n=1;n<=49;n++){
      let num=0,den=0;
      for(const lag of inducingLags){
        const j=i-lag;if(j<1)continue;
        const y=sets[j].has(n)?1:0,dt=lag/c.temporalScale;
        const d=stateD2(i,j,n,c.spatial);
        const k=Math.exp(-.5*(d/(c.lengthScale*c.lengthScale)+dt*dt));
        num+=k*y;den+=k;
      }
      score[n]=(num+.25)/(den+2);
    }
    const pool=Array.from({length:49},(_,q)=>q+1).sort((a,b)=>score[b]-score[a]||a-b).slice(0,8).sort((a,b)=>a-b);
    for(const n of pool){hash^=n;hash=Math.imul(hash,16777619)>>>0}
    const dt=rows[i].drawDate;let p=null;
    if(dt>='2018-01-01'&&dt<='2022-12-31')p=P.train;else if(dt>='2023-01-01'&&dt<='2024-12-31')p=P.mid;else if(dt>='2025-01-01'&&dt<='2026-12-31')p=P.late;
    if(p){const h=hit(pool,sets[i]);p.draws++;p.sum+=h;p.h4+=h>=4;p.h5+=h>=5;p.h6+=h===6;if(h>=5)p.events.push({date:dt,hits:h,pool,truth:mains[i]})}
  }
  for(const p of Object.values(P))p.meanHits=p.draws?p.sum/p.draws:0;
  return{...P,poolSequenceHash:hash.toString(16).padStart(8,'0')};
}
const all=cfgs.map(config=>({config,...run(config)}));
const effective=new Set(all.map(x=>x.poolSequenceHash)).size;
all.sort((a,b)=>b.train.h6-a.train.h6||b.train.h5-a.train.h5||b.train.h4-a.train.h4||b.train.meanHits-a.train.meanHits||a.config.id-b.config.id);
const leaders=all.slice(0,8);
const summary={nominalConfigurations:cfgs.length,effectiveConfigurations:effective,frozen:leaders.length,midFullModels:leaders.filter(x=>x.mid.h6>0).length,lateFullModels:leaders.filter(x=>x.late.h6>0).length,repeatFullModels:leaders.filter(x=>x.mid.h6>0&&x.late.h6>0).length,repeat5PlusModels:leaders.filter(x=>x.mid.h5>0&&x.late.h5>0).length,uniquePostFreeze5PlusDates:[...new Set(leaders.flatMap(x=>[...x.mid.events,...x.late.events].map(e=>e.date)))].sort()};
const out={generatedAt:new Date().toISOString(),version:'v224',gameId:'bonoloto',family:'SPARSE_TEMPORAL_GP_INDUCING_POINTS',candidatePool:{nominalConfigurations:cfgs.length,effectiveConfigurations:effective},selectionPeriod:'2018-01-01..2022-12-31',postFreezePeriods:['2023-01-01..2024-12-31','2025-01-01..2026-12-31'],methodology:'Sparse Gaussian-process-style kernel posterior using deterministic predeclared inducing lags 4..512 draws rather than the dense historical grid used by v218. Each inducing observation links its own strictly pre-draw state to its subsequently observed binary outcome. Target state uses only information available before the target draw. Hyperparameters are selected only on 2018-2022 and frozen for 2023+. The sparse inducing scheme is a computationally distinct GP approximation, introduced for tractability rather than selected from outcomes.',multipleTesting:{candidatePool:cfgs.length,effectiveConfigurations:effective,selectionCriterion:'train h6, then h5, h4, meanHits; top 8 frozen',matchedNullRequiredIfSignal:true},budget:{poolSize:8,tickets:28,unitCostEUR:.5,theoreticalCostEUR:14,realStakeEUR:0},summary,leaders,decision:summary.repeatFullModels?'ESCALATE_MATCHED_NULL':summary.repeat5PlusModels?'NEAR_SIGNAL_REQUIRES_NULL':'NEGATIVE',realMoneyPass:false};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(summary));
