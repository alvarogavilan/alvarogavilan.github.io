import fs from 'node:fs';

const DIR='loterias-ai/data/archive/bonoloto';
const OUT='loterias-ai/data/research/meta-pleno-v225-bonoloto-hypergraph-motifs.json';
let rows=[];
for(const f of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort())rows.push(...(JSON.parse(fs.readFileSync(`${DIR}/${f}`,'utf8')).records||[]));
rows=[...new Map(rows.map(r=>[r.drawId||r.drawDate,r])).values()]
  .filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===6)
  .sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const mains=rows.map(r=>r.result.main.map(Number).sort((a,b)=>a-b));
const sets=mains.map(x=>new Set(x));
const L=rows.length;
const firstEval=Math.max(512,rows.findIndex(r=>r.drawDate>='2018-01-01'));
const windows=[128,256,512],lambdas=[.1,.25,.5,1];
const cfgs=[];let id=0;for(const W of windows)for(const lambda of lambdas)cfgs.push({id:id++,W,lambda});
function key3(a,b,c){return a*2500+b*50+c}
function triples(draw,fn){for(let a=0;a<4;a++)for(let b=a+1;b<5;b++)for(let c=b+1;c<6;c++)fn(draw[a],draw[b],draw[c])}
function bucket(){return{draws:0,h4:0,h5:0,h6:0,sum:0,events:[]}}
function hit(pool,s){let h=0;for(const n of pool)if(s.has(n))h++;return h}
const state=new Map();
for(const c of cfgs)state.set(c.id,{config:c,train:bucket(),mid:bucket(),late:bucket(),hash:2166136261>>>0});

for(const W of windows){
  const singles=new Int32Array(50),tc=new Map();
  const add=(draw,sgn)=>{for(const n of draw)singles[n]+=sgn;triples(draw,(a,b,c)=>{const k=key3(a,b,c),v=(tc.get(k)||0)+sgn;if(v)tc.set(k,v);else tc.delete(k)})};
  for(let j=firstEval-W;j<firstEval;j++)add(mains[j],1);
  const localCfg=cfgs.filter(c=>c.W===W);
  for(let i=firstEval;i<L;i++){
    const pi=new Float64Array(50);for(let n=1;n<=49;n++)pi[n]=(singles[n]+1)/(W+2);
    for(const c of localCfg){
      const selected=[];
      while(selected.length<8){
        let best=-1,bestScore=-Infinity;
        for(let n=1;n<=49;n++){
          if(selected.includes(n))continue;
          const p=Math.min(.999999,Math.max(.000001,pi[n]));
          let score=Math.log(p/(1-p));
          if(selected.length>=2){
            let sy=0,m=0;
            for(let a=0;a<selected.length-1;a++)for(let b=a+1;b<selected.length;b++){
              const x=[selected[a],selected[b],n].sort((u,v)=>u-v);const obs=tc.get(key3(x[0],x[1],x[2]))||0;
              const exp=W*pi[x[0]]*pi[x[1]]*pi[x[2]];
              sy+=Math.log((obs+.5)/(exp+.5));m++;
            }
            if(m)score+=c.lambda*(sy/m);
          }
          if(score>bestScore||(score===bestScore&&n<best)){bestScore=score;best=n}
        }
        selected.push(best);
      }
      const pool=selected.sort((a,b)=>a-b),st=state.get(c.id);
      for(const n of pool){st.hash^=n;st.hash=Math.imul(st.hash,16777619)>>>0}
      const dt=rows[i].drawDate;let p=null;if(dt>='2018-01-01'&&dt<='2022-12-31')p=st.train;else if(dt>='2023-01-01'&&dt<='2024-12-31')p=st.mid;else if(dt>='2025-01-01'&&dt<='2026-12-31')p=st.late;
      if(p){const h=hit(pool,sets[i]);p.draws++;p.sum+=h;p.h4+=h>=4;p.h5+=h>=5;p.h6+=h===6;if(h>=5)p.events.push({date:dt,hits:h,pool,truth:mains[i]})}
    }
    add(mains[i-W],-1);add(mains[i],1);
  }
}
const all=[...state.values()].map(st=>{for(const p of [st.train,st.mid,st.late])p.meanHits=p.draws?p.sum/p.draws:0;return{config:st.config,train:st.train,mid:st.mid,late:st.late,poolSequenceHash:st.hash.toString(16).padStart(8,'0')}});
const effective=new Set(all.map(x=>x.poolSequenceHash)).size;
all.sort((a,b)=>b.train.h6-a.train.h6||b.train.h5-a.train.h5||b.train.h4-a.train.h4||b.train.meanHits-a.train.meanHits||a.config.id-b.config.id);
const leaders=all.slice(0,8);
const summary={nominalConfigurations:cfgs.length,effectiveConfigurations:effective,frozen:leaders.length,midFullModels:leaders.filter(x=>x.mid.h6>0).length,lateFullModels:leaders.filter(x=>x.late.h6>0).length,repeatFullModels:leaders.filter(x=>x.mid.h6>0&&x.late.h6>0).length,repeat5PlusModels:leaders.filter(x=>x.mid.h5>0&&x.late.h5>0).length,uniquePostFreeze5PlusDates:[...new Set(leaders.flatMap(x=>[...x.mid.events,...x.late.events].map(e=>e.date)))].sort()};
const out={generatedAt:new Date().toISOString(),version:'v225',gameId:'bonoloto',family:'THIRD_ORDER_HYPERGRAPH_MOTIFS',candidatePool:{nominalConfigurations:cfgs.length,effectiveConfigurations:effective},selectionPeriod:'2018-01-01..2022-12-31',postFreezePeriods:['2023-01-01..2024-12-31','2025-01-01..2026-12-31'],methodology:'Rolling third-order hypergraph model. Each historical six-number draw contributes exactly 20 unordered triples. Candidate pools are built greedily from marginal pre-draw inclusion odds plus ONLY third-order triple log-lift relative to an independence expectation; no pairwise co-occurrence term is used. Windows and third-order strength are ranked only on 2018-2022, then the top eight configurations are frozen before 2023+. This lane tests higher-order interactions not represented by pairwise co-occurrence/contextual completion.',multipleTesting:{candidatePool:cfgs.length,effectiveConfigurations:effective,selectionCriterion:'train h6, then h5, h4, meanHits; top 8 frozen',matchedNullRequiredIfSignal:true},budget:{poolSize:8,tickets:28,unitCostEUR:.5,theoreticalCostEUR:14,realStakeEUR:0},summary,leaders,decision:summary.repeatFullModels?'ESCALATE_MATCHED_NULL':summary.repeat5PlusModels?'NEAR_SIGNAL_REQUIRES_NULL':'NEGATIVE',realMoneyPass:false};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(summary));
