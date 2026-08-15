import fs from 'node:fs';

const CFG={
  bonoloto:{dir:'bonoloto',max:49,k:6,unit:0.5},
  primitiva:{dir:'primitiva',max:49,k:6,unit:1},
  euromillones:{dir:'euromillones',max:50,k:5,unit:2.5},
  'gordo-primitiva':{dir:'gordo-primitiva',max:54,k:5,unit:1.5}
};
const ROOT='loterias-ai/data/research/meta-pleno-v15-shards';
const OUT='loterias-ai/data/research/meta-pleno-v33-forward-set-capture.json';
const comb=(n,k)=>{let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return Math.round(r)};

function load(c){
  let rows=[];
  for(const f of fs.readdirSync(`loterias-ai/data/archive/${c.dir}`).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    rows.push(...(JSON.parse(fs.readFileSync(`loterias-ai/data/archive/${c.dir}/${f}`,'utf8')).records||[]));
  }
  rows=rows.filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===c.k&&new Set(r.result.main).size===c.k).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
  const sets=rows.map(r=>new Set(r.result.main)),prefix=Array(rows.length+1),gaps=Array(rows.length);prefix[0]=new Uint32Array(c.max+1);
  const last=new Int32Array(c.max+1);last.fill(-1);
  for(let i=0;i<rows.length;i++){
    const p=new Uint32Array(prefix[i]);for(const n of rows[i].result.main)p[n]++;prefix[i+1]=p;
    const g=new Uint16Array(c.max+1);for(let n=1;n<=c.max;n++)g[n]=last[n]<0?65535:Math.min(65534,i-last[n]);gaps[i]=g;for(const n of rows[i].result.main)last[n]=i;
  }
  return{rows,sets,prefix,gaps};
}
function features(i,s,n,c,d){const as=Math.max(0,i-s.sw),al=Math.max(0,i-s.lw),cs=d.prefix[i][n]-d.prefix[as][n],cl=d.prefix[i][n]-d.prefix[al][n],gap=Math.min(s.gapCap,d.gaps[i][n]===65535?s.gapCap:d.gaps[i][n]);return[cs/Math.max(1,i-as),cl/Math.max(1,i-al),gap/s.gapCap,d.sets[i-1]?.has(n)?1:0,d.sets[i-2]?.has(n)?1:0,n/c.max,(n%2?1:-1),(n<=c.max/2?1:-1)]}
function predict(i,s,c,d){const a=[];for(let n=1;n<=c.max;n++){const f=features(i,s,n,c,d),v=s.wS*(s.powerS===2?f[0]*f[0]:f[0])+s.wL*(s.powerL===2?f[1]*f[1]:f[1])+s.wGap*f[2]+s.wLast*f[3]+s.wPrev2*f[4]+s.wNum*f[5]+s.wParity*f[6]+s.wLow*f[7];a.push([v,n])}a.sort((x,y)=>y[0]-x[0]||x[1]-y[1]);return a.slice(0,s.setSize).map(x=>x[1]).sort((a,b)=>a-b)}
function evalRange(s,c,d,from,to){let draws=0,all=0,minus1=0,sum=0;const byYear={},events=[];for(let i=100;i<d.rows.length;i++){const date=d.rows[i].drawDate;if(date<from||date>to)continue;draws++;const y=date.slice(0,4),p=predict(i,s,c,d),h=p.filter(n=>d.sets[i].has(n)).length;byYear[y]??={draws:0,all:0,minus1:0,best:0};byYear[y].draws++;byYear[y].best=Math.max(byYear[y].best,h);if(h===c.k){all++;byYear[y].all++;events.push({date,hits:h,set:p,truth:d.rows[i].result.main})}else if(h===c.k-1){minus1++;byYear[y].minus1++;events.push({date,hits:h,set:p,truth:d.rows[i].result.main})}sum+=h}return{draws,all,minus1,meanHits:sum/Math.max(1,draws),byYear,events}}

const out={generatedAt:new Date().toISOString(),engine:'MetaPleno-v33-forward-set-capture',method:'Candidate pool inherited from v15 shards. Candidate ranking uses only 2023-01-01..2024-12-31. Top candidates are then opened on 2025-01-01..latest archive without re-ranking. Historical forward test only; prospective confirmation remains mandatory.',games:{},realMoneyPass:false};
for(const[game,c]of Object.entries(CFG)){
  let pool=[];
  if(!fs.existsSync(ROOT)){out.games[game]={status:'NO_SHARDS'};continue}
  for(const f of fs.readdirSync(ROOT).filter(x=>x.startsWith(`${game}-`)&&x.endsWith('.json'))){pool.push(...(JSON.parse(fs.readFileSync(`${ROOT}/${f}`,'utf8')).top||[]))}
  const seen=new Set();pool=pool.filter(x=>{const k=JSON.stringify(x.spec);if(seen.has(k))return false;seen.add(k);return true});
  const d=load(c);const ranked=[];
  for(const x of pool){const sel=evalRange(x.spec,c,d,'2023-01-01','2024-12-31');const size=x.spec.setSize,combinations=comb(size,c.k),cost=combinations*c.unit;const rank=sel.all*1e12+sel.minus1*1e9+sel.meanHits*1e6-cost;ranked.push({spec:x.spec,selection:sel,setSize:size,combinations,costPerDrawEUR:cost,rank})}
  ranked.sort((a,b)=>b.rank-a.rank);
  const finalists=ranked.slice(0,25).map(x=>({...x,forward:evalRange(x.spec,c,d,'2025-01-01','9999-12-31')}));
  finalists.sort((a,b)=>b.forward.all-a.forward.all||b.forward.minus1-a.forward.minus1||b.forward.meanHits-a.forward.meanHits||a.costPerDrawEUR-b.costPerDrawEUR);
  const fullForward=finalists.filter(x=>x.forward.all>0);
  out.games[game]={candidatePool:pool.length,selectedTopN:25,fullForwardCount:fullForward.length,best:finalists[0]||null,fullForward:fullForward.slice(0,10),top:finalists.slice(0,10)};
}
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(out.games).map(([g,v])=>[g,{pool:v.candidatePool,fullForwardCount:v.fullForwardCount,best:v.best?{setSize:v.best.setSize,cost:v.best.costPerDrawEUR,selection:v.best.selection,forward:v.best.forward}:null}])),null,2));