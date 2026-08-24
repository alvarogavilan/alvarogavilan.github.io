import fs from 'node:fs';

const DIR='loterias-ai/data/archive/bonoloto';
const OUT='loterias-ai/data/research/meta-pleno-v223-bonoloto-spectral-phase.json';
let rows=[];
for(const f of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const j=JSON.parse(fs.readFileSync(`${DIR}/${f}`,'utf8'));
  rows.push(...(j.records||[]));
}
rows=[...new Map(rows.map(r=>[r.drawId||r.drawDate,r])).values()]
  .filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===6)
  .sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const mains=rows.map(r=>r.result.main.map(Number).sort((a,b)=>a-b));
const sets=mains.map(x=>new Set(x));
const L=rows.length;
const firstEval=Math.max(256,rows.findIndex(r=>r.drawDate>='2018-01-01'));

const periods=[7,14,28,56,91,182];
const windows=[128,256];
const topKs=[1,2,3];
const shrinks=[0.5,1.0];
const cfgs=[];
let cid=0;
for(const W of windows) for(const topK of topKs) for(const shrink of shrinks) cfgs.push({id:cid++,W,topK,shrink});

const trig={};
for(const W of windows){
  trig[W]={};
  for(const p of periods){
    const c=new Float64Array(W),s=new Float64Array(W);
    for(let t=0;t<W;t++){const a=2*Math.PI*t/p;c[t]=Math.cos(a);s[t]=Math.sin(a)}
    trig[W][p]={c,s,nextC:Math.cos(2*Math.PI*W/p),nextS:Math.sin(2*Math.PI*W/p)};
  }
}

function bucket(){return{draws:0,h4:0,h5:0,h6:0,sum:0,events:[]}}
function hit(pool,set){let h=0;for(const n of pool)if(set.has(n))h++;return h}
function periodBucket(dt,P){if(dt>='2018-01-01'&&dt<='2022-12-31')return P.train;if(dt>='2023-01-01'&&dt<='2024-12-31')return P.mid;if(dt>='2025-01-01'&&dt<='2026-12-31')return P.late;return null}

// Cache pre-draw spectral components by window and draw. Each cache entry holds, for every number,
// the local mean plus six period-specific amplitude/prediction pairs. No target outcome is used.
const cache=new Map();
function spectralFrame(i,W){
  const key=`${i}:${W}`; if(cache.has(key)) return cache.get(key);
  const frame=Array.from({length:50},()=>null);
  for(let n=1;n<=49;n++){
    let cnt=0;
    for(let j=i-W;j<i;j++) if(sets[j].has(n)) cnt++;
    const mean=cnt/W;
    const comps=[];
    for(const p of periods){
      const tr=trig[W][p]; let re=0,im=0;
      for(let t=0;t<W;t++){
        const x=(sets[i-W+t].has(n)?1:0)-mean;
        re+=x*tr.c[t]; im+=x*tr.s[t];
      }
      const amp=Math.hypot(re,im);
      const pred=(2/W)*(re*tr.nextC+im*tr.nextS);
      comps.push({p,amp,pred});
    }
    comps.sort((a,b)=>b.amp-a.amp||a.p-b.p);
    frame[n]={mean,comps};
  }
  cache.set(key,frame); return frame;
}

function run(c){
  const P={train:bucket(),mid:bucket(),late:bucket()};
  let hash=2166136261>>>0;
  for(let i=firstEval;i<L;i++){
    const f=spectralFrame(i,c.W);
    const ranked=[];
    for(let n=1;n<=49;n++){
      let z=f[n].mean;
      for(const q of f[n].comps.slice(0,c.topK)) z+=c.shrink*q.pred;
      ranked.push([z,n]);
    }
    ranked.sort((a,b)=>b[0]-a[0]||a[1]-b[1]);
    const pool=ranked.slice(0,8).map(x=>x[1]).sort((a,b)=>a-b);
    for(const n of pool){hash^=n;hash=Math.imul(hash,16777619)>>>0}
    const p=periodBucket(rows[i].drawDate,P); if(!p) continue;
    const h=hit(pool,sets[i]);p.draws++;p.sum+=h;p.h4+=h>=4;p.h5+=h>=5;p.h6+=h===6;
    if(h>=5)p.events.push({date:rows[i].drawDate,hits:h,pool,truth:mains[i]});
  }
  for(const p of Object.values(P))p.meanHits=p.draws?p.sum/p.draws:0;
  return{...P,poolSequenceHash:hash.toString(16).padStart(8,'0')};
}

const all=cfgs.map(config=>({config,...run(config)}));
const effective=new Set(all.map(x=>x.poolSequenceHash)).size;
const ranked=[...all].sort((a,b)=>b.train.h6-a.train.h6||b.train.h5-a.train.h5||b.train.h4-a.train.h4||b.train.meanHits-a.train.meanHits||a.config.id-b.config.id);
const leaders=ranked.slice(0,8);
const summary={
  nominalConfigurations:cfgs.length,
  effectiveConfigurations:effective,
  frozen:leaders.length,
  midFullModels:leaders.filter(x=>x.mid.h6>0).length,
  lateFullModels:leaders.filter(x=>x.late.h6>0).length,
  repeatFullModels:leaders.filter(x=>x.mid.h6>0&&x.late.h6>0).length,
  repeat5PlusModels:leaders.filter(x=>x.mid.h5>0&&x.late.h5>0).length,
  uniquePostFreeze5PlusDates:[...new Set(leaders.flatMap(x=>[...x.mid.events,...x.late.events].map(e=>e.date)))].sort()
};
const out={
  generatedAt:new Date().toISOString(),version:'v223',gameId:'bonoloto',family:'SPECTRAL_PHASE_EXTRAPOLATION',
  candidatePool:{nominalConfigurations:cfgs.length,effectiveConfigurations:effective},
  selectionPeriod:'2018-01-01..2022-12-31',postFreezePeriods:['2023-01-01..2024-12-31','2025-01-01..2026-12-31'],
  methodology:'For each number, reconstruct only its pre-draw binary occurrence history over 128/256 draws. Remove the local mean, project the residual onto fixed draw-period harmonics (7,14,28,56,91,182), rank harmonics by amplitude using only history available before the target draw, extrapolate their phase one draw ahead, and rank all 49 numbers by the resulting score. Hyperparameters are selected exclusively on 2018-2022; the top eight configurations are frozen before opening 2023+. This is a spectral representation distinct from Haar multiscale coefficients because it explicitly models phase at fixed non-dyadic periods.',
  multipleTesting:{candidatePool:cfgs.length,effectiveConfigurations:effective,selectionCriterion:'train h6, then h5, h4, meanHits; top 8 frozen',matchedNullRequiredIfSignal:true},
  budget:{poolSize:8,tickets:28,unitCostEUR:.5,theoreticalCostEUR:14,realStakeEUR:0},summary,leaders,
  decision:summary.repeatFullModels?'ESCALATE_MATCHED_NULL':summary.repeat5PlusModels?'NEAR_SIGNAL_REQUIRES_NULL':'NEGATIVE',realMoneyPass:false
};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(summary));
