import fs from 'node:fs';

const DIR='loterias-ai/data/archive/bonoloto';
const OUT='loterias-ai/data/research/meta-pleno-v226-v225-correlated-null.json';
let rows=[];
for(const f of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort())rows.push(...(JSON.parse(fs.readFileSync(`${DIR}/${f}`,'utf8')).records||[]));
rows=[...new Map(rows.map(r=>[r.drawId||r.drawDate,r])).values()]
  .filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===6)
  .sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const mains=rows.map(r=>r.result.main.map(Number).sort((a,b)=>a-b));
const sets=mains.map(x=>new Set(x));
const L=rows.length;
const lateStart=rows.findIndex(r=>r.drawDate>='2025-01-01');
if(lateStart<512)throw new Error('insufficient late-history');
const leaderCfgs=[
  {id:0,W:128,lambda:.1},{id:4,W:256,lambda:.1},{id:1,W:128,lambda:.25},{id:6,W:256,lambda:.5},
  {id:2,W:128,lambda:.5},{id:3,W:128,lambda:1},{id:7,W:256,lambda:1},{id:9,W:512,lambda:.25}
];
function key3(a,b,c){return a*2500+b*50+c}
function triples(draw,fn){for(let a=0;a<4;a++)for(let b=a+1;b<5;b++)for(let c=b+1;c<6;c++)fn(draw[a],draw[b],draw[c])}
function hit(pool,s){let h=0;for(const n of pool)if(s.has(n))h++;return h}
const poolsById=new Map(leaderCfgs.map(c=>[c.id,[]]));
for(const W of [...new Set(leaderCfgs.map(c=>c.W))]){
  const singles=new Int32Array(50),tc=new Map();
  const add=(draw,sgn)=>{for(const n of draw)singles[n]+=sgn;triples(draw,(a,b,c)=>{const k=key3(a,b,c),v=(tc.get(k)||0)+sgn;if(v)tc.set(k,v);else tc.delete(k)})};
  for(let j=lateStart-W;j<lateStart;j++)add(mains[j],1);
  const local=leaderCfgs.filter(c=>c.W===W);
  for(let i=lateStart;i<L;i++){
    const pi=new Float64Array(50);for(let n=1;n<=49;n++)pi[n]=(singles[n]+1)/(W+2);
    for(const c of local){
      const selected=[];
      while(selected.length<8){
        let best=-1,bestScore=-Infinity;
        for(let n=1;n<=49;n++){
          if(selected.includes(n))continue;
          const p=Math.min(.999999,Math.max(.000001,pi[n]));let score=Math.log(p/(1-p));
          if(selected.length>=2){let sy=0,m=0;for(let a=0;a<selected.length-1;a++)for(let b=a+1;b<selected.length;b++){
            const x=[selected[a],selected[b],n].sort((u,v)=>u-v),obs=tc.get(key3(x[0],x[1],x[2]))||0,exp=W*pi[x[0]]*pi[x[1]]*pi[x[2]];
            sy+=Math.log((obs+.5)/(exp+.5));m++;
          }if(m)score+=c.lambda*(sy/m)}
          if(score>bestScore||(score===bestScore&&n<best)){bestScore=score;best=n}
        }
        selected.push(best);
      }
      poolsById.get(c.id).push(selected.sort((a,b)=>a-b));
    }
    add(mains[i-W],-1);add(mains[i],1);
  }
}
const N=L-lateStart;
for(const c of leaderCfgs)if(poolsById.get(c.id).length!==N)throw new Error(`pool length mismatch ${c.id}`);
function statForShift(shift){
  let unique5=0,total5=0,full=0;const dates=[];
  for(let t=0;t<N;t++){
    const truth=sets[lateStart+((t+shift)%N)];let any=false;
    for(const c of leaderCfgs){const h=hit(poolsById.get(c.id)[t],truth);if(h>=5){total5++;any=true}if(h===6)full++}
    if(any){unique5++;if(shift===0)dates.push(rows[lateStart+t].drawDate)}
  }
  return{unique5,total5,full,dates};
}
const observed=statForShift(0);
const expectedDates=['2025-08-02','2025-08-09'];
if(JSON.stringify(observed.dates)!==JSON.stringify(expectedDates))throw new Error(`v225 reproduction mismatch: ${JSON.stringify(observed.dates)}`);
const nulls=[];for(let s=1;s<N;s++)nulls.push({shift:s,...statForShift(s)});
const geUnique=nulls.filter(x=>x.unique5>=observed.unique5).length;
const geTotal=nulls.filter(x=>x.total5>=observed.total5).length;
const geFull=nulls.filter(x=>x.full>=Math.max(1,observed.full)).length;
const vals=nulls.map(x=>x.unique5).sort((a,b)=>a-b);const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
const q=p=>vals[Math.min(vals.length-1,Math.floor(p*(vals.length-1)))];
const pUnique=(geUnique+1)/(nulls.length+1),pTotal=(geTotal+1)/(nulls.length+1);
const out={generatedAt:new Date().toISOString(),version:'v226',gameId:'bonoloto',audits:'v225',family:'CORRELATED_CIRCULAR_MATCHED_NULL',methodology:'Reconstruct exactly the eight frozen v225 late-era pool sequences, verify the two persisted >=5 dates, then circularly shift the entire late-era truth sequence through every non-zero offset. For each shift, all eight model pool sequences remain fixed and correlated, preserving model dependence, draw count and Budget8 cost. Statistic is the number of unique dates with any >=5 hit; total model-events is secondary. This is a deterministic exhaustive circular null over the 2025+ era.',candidatePool:{frozenModels:leaderCfgs.length,lateDraws:N,nullShifts:nulls.length},budget:{poolSize:8,ticketsPerModel:28,unitCostEUR:.5,theoreticalCostPerModelEUR:14,realStakeEUR:0},observed,null:{meanUnique5:mean,q90:q(.9),q95:q(.95),q99:q(.99),maxUnique5:vals.at(-1),geObservedUnique:geUnique,pUnique,geObservedTotal:geTotal,pTotal,geAtLeastOneFull:geFull,pAtLeastOneFull:(geFull+1)/(nulls.length+1)},decision:pUnique<.01?'STRONG_ANOMALY_REQUIRES_INDEPENDENT_REPLICATION':pUnique<.05?'ANOMALY_REQUIRES_INDEPENDENT_REPLICATION':'NOT_SIGNIFICANT_UNDER_CORRELATED_NULL',realMoneyPass:false};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({observed:out.observed,null:out.null,decision:out.decision}));
