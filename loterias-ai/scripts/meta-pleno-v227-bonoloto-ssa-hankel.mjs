import fs from 'node:fs';

const DIR='loterias-ai/data/archive/bonoloto';
const OUT='loterias-ai/data/research/meta-pleno-v227-bonoloto-ssa-hankel.json';
let rows=[];
for(const f of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort()) rows.push(...(JSON.parse(fs.readFileSync(`${DIR}/${f}`,'utf8')).records||[]));
rows=[...new Map(rows.map(r=>[r.drawId||r.drawDate,r])).values()].filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===6).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const mains=rows.map(r=>r.result.main.map(Number).sort((a,b)=>a-b));
const sets=mains.map(x=>new Set(x));
const L=rows.length, firstEval=Math.max(300,rows.findIndex(r=>r.drawDate>='2018-01-01'));
const cfgs=[{id:0,W:128,lag:8,rank:1},{id:1,W:128,lag:8,rank:2},{id:2,W:256,lag:8,rank:1},{id:3,W:256,lag:8,rank:2}];
function bucket(){return{draws:0,h4:0,h5:0,h6:0,sum:0,events:[]}}
function hit(pool,s){let h=0;for(const n of pool)if(s.has(n))h++;return h}
function vecAt(n,end,lag){const v=new Float64Array(lag);for(let q=0;q<lag;q++)v[q]=sets[end-lag+1+q].has(n)?1:0;return v}
function outerAdd(C,v,sgn){const m=v.length;for(let a=0;a<m;a++)for(let b=0;b<m;b++)C[a*m+b]+=sgn*v[a]*v[b]}
function eig2(C,m){const A=new Float64Array(C),us=[];for(let r=0;r<2;r++){let v=new Float64Array(m);for(let q=0;q<m;q++)v[q]=1+(q+1)*(r+1)/m;for(let it=0;it<12;it++){const w=new Float64Array(m);for(let a=0;a<m;a++){let z=0;for(let b=0;b<m;b++)z+=A[a*m+b]*v[b];w[a]=z}let norm=Math.hypot(...w)||1;for(let q=0;q<m;q++)v[q]=w[q]/norm}let lam=0;for(let a=0;a<m;a++)for(let b=0;b<m;b++)lam+=v[a]*A[a*m+b]*v[b];us.push(v);for(let a=0;a<m;a++)for(let b=0;b<m;b++)A[a*m+b]-=lam*v[a]*v[b]}return us}
function forecastFrom(us,rank,last){const m=last.length, use=us.slice(0,rank);let nu=0;for(const u of use)nu+=u[m-1]*u[m-1];if(nu>=.999999)return last[m-1];const R=new Float64Array(m-1);for(const u of use)for(let q=0;q<m-1;q++)R[q]+=u[m-1]*u[q]/(1-nu);let z=0;for(let q=0;q<m-1;q++)z+=R[q]*last[q+1];return z}
const states=new Map();
for(const W of [128,256]){
  const lag=8, mats=Array.from({length:50},()=>new Float64Array(lag*lag));
  const startEnd=firstEval-W;
  for(let n=1;n<=49;n++)for(let e=startEnd;e<firstEval;e++)outerAdd(mats[n],vecAt(n,e,lag),1);
  states.set(W,{mats});
}
const stats=Object.fromEntries(cfgs.map(c=>[c.id,{config:c,train:bucket(),mid:bucket(),late:bucket(),hash:2166136261>>>0}]));
for(let i=firstEval;i<L;i++){
  for(const W of [128,256]){
    const lag=8, {mats}=states.get(W), local=cfgs.filter(c=>c.W===W), scoresByRank={1:new Float64Array(50),2:new Float64Array(50)};
    for(let n=1;n<=49;n++){
      const us=eig2(mats[n],lag), last=vecAt(n,i-1,lag);
      scoresByRank[1][n]=forecastFrom(us,1,last);
      scoresByRank[2][n]=forecastFrom(us,2,last);
    }
    for(const c of local){
      const score=scoresByRank[c.rank],pool=Array.from({length:49},(_,q)=>q+1).sort((a,b)=>score[b]-score[a]||a-b).slice(0,8).sort((a,b)=>a-b),st=stats[c.id];
      for(const n of pool){st.hash^=n;st.hash=Math.imul(st.hash,16777619)>>>0}
      const dt=rows[i].drawDate;let p=null;if(dt>='2018-01-01'&&dt<='2022-12-31')p=st.train;else if(dt>='2023-01-01'&&dt<='2024-12-31')p=st.mid;else if(dt>='2025-01-01'&&dt<='2026-12-31')p=st.late;
      if(p){const h=hit(pool,sets[i]);p.draws++;p.sum+=h;p.h4+=h>=4;p.h5+=h>=5;p.h6+=h===6;if(h>=5)p.events.push({date:dt,hits:h,pool,truth:mains[i]})}
    }
    if(i<L-1){for(let n=1;n<=49;n++){outerAdd(mats[n],vecAt(n,i-W,lag),-1);outerAdd(mats[n],vecAt(n,i,lag),1)}}
  }
}
const all=Object.values(stats).map(st=>{for(const p of [st.train,st.mid,st.late])p.meanHits=p.draws?p.sum/p.draws:0;return{config:st.config,train:st.train,mid:st.mid,late:st.late,poolSequenceHash:st.hash.toString(16).padStart(8,'0')}});
const effective=new Set(all.map(x=>x.poolSequenceHash)).size;
all.sort((a,b)=>b.train.h6-a.train.h6||b.train.h5-a.train.h5||b.train.h4-a.train.h4||b.train.meanHits-a.train.meanHits||a.config.id-b.config.id);const leaders=all.slice(0,Math.min(4,all.length));
const summary={nominalConfigurations:cfgs.length,effectiveConfigurations:effective,frozen:leaders.length,midFullModels:leaders.filter(x=>x.mid.h6>0).length,lateFullModels:leaders.filter(x=>x.late.h6>0).length,repeatFullModels:leaders.filter(x=>x.mid.h6>0&&x.late.h6>0).length,repeat5PlusModels:leaders.filter(x=>x.mid.h5>0&&x.late.h5>0).length,uniquePostFreeze5PlusDates:[...new Set(leaders.flatMap(x=>[...x.mid.events,...x.late.events].map(e=>e.date)))].sort()};
const out={generatedAt:new Date().toISOString(),version:'v227',gameId:'bonoloto',family:'SINGULAR_SPECTRUM_HANKEL_RECURRENCE',candidatePool:{nominalConfigurations:cfgs.length,effectiveConfigurations:effective},selectionPeriod:'2018-01-01..2022-12-31',postFreezePeriods:['2023-01-01..2024-12-31','2025-01-01..2026-12-31'],methodology:'Compact rolling Singular Spectrum Analysis. For each number, build the lag-8 Hankel trajectory covariance from only the previous 128/256 binary appearances, estimate the first two empirical orthogonal functions by deterministic power iteration, derive the standard SSA recurrent coefficients from rank-1/rank-2 signal subspaces, and forecast the next binary inclusion score. No target outcome enters its own covariance or forecast. Window/rank variants are ranked only on 2018-2022 and then frozen before opening 2023+.',multipleTesting:{candidatePool:cfgs.length,effectiveConfigurations:effective,selectionCriterion:'train h6, then h5, h4, meanHits; all four compact variants frozen',matchedNullRequiredIfSignal:true},budget:{poolSize:8,tickets:28,unitCostEUR:.5,theoreticalCostEUR:14,realStakeEUR:0},summary,leaders,decision:summary.repeatFullModels?'ESCALATE_MATCHED_NULL':summary.repeat5PlusModels?'NEAR_SIGNAL_REQUIRES_NULL':'NEGATIVE',realMoneyPass:false};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(summary));
