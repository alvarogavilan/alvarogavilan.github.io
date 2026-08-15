import fs from 'node:fs';

const DIR='loterias-ai/data/archive/bonoloto';
const OUT='loterias-ai/data/research/meta-pleno-v110-bonoloto-survival-hazard-budget8.json';
let rows=[];
for(const f of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  rows.push(...(JSON.parse(fs.readFileSync(`${DIR}/${f}`,'utf8')).records||[]));
}
rows=rows.filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===6&&new Set(r.result.main).size===6)
  .sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const truth=rows.map(r=>new Set(r.result.main));
const sets=rows.map(r=>[...r.result.main].sort((a,b)=>a-b));

function ids(a,b){const z=[];for(let i=1;i<rows.length;i++)if(rows[i].drawDate>=a&&rows[i].drawDate<=b)z.push(i);return z}
const selection=ids('2020-01-01','2022-12-31');
const mid=ids('2023-01-01','2024-12-31');
const late=ids('2025-01-01','9999-12-31');

// Age immediately before each draw: number of draws elapsed since the number last appeared.
const ages=Array.from({length:rows.length},()=>Array(49).fill(0));
const last=Array(49).fill(-1);
for(let i=0;i<rows.length;i++){
  for(let n=1;n<=49;n++)ages[i][n-1]=last[n-1]<0?i+1:i-last[n-1];
  for(const n of truth[i])last[n-1]=i;
}

const caps=[5,10,20,40];
const cache=new Map();
for(const cap of caps){
  const pe=Array.from({length:rows.length+1},()=>new Float64Array(cap+1));
  const py=Array.from({length:rows.length+1},()=>new Float64Array(cap+1));
  for(let t=0;t<rows.length;t++){
    pe[t+1].set(pe[t]);py[t+1].set(py[t]);
    for(let n=1;n<=49;n++){
      const a=Math.min(cap,ages[t][n-1]);
      pe[t+1][a]++;
      if(truth[t].has(n))py[t+1][a]++;
    }
  }
  cache.set(cap,{pe,py});
}

const windows=[100,250,500,1000,999999];
const strengths=[1,5,20,100];
const cfgs=[];
for(const cap of caps)for(const window of windows)for(const strength of strengths)cfgs.push({cap,window,strength});
const base=6/49;

function pred(i,c){
  if(i<50)return null;
  const lo=Math.max(0,i-c.window),{pe,py}=cache.get(c.cap);
  const score=[];
  for(let n=1;n<=49;n++){
    const a=Math.min(c.cap,ages[i][n-1]);
    const exposure=pe[i][a]-pe[lo][a];
    const event=py[i][a]-py[lo][a];
    const hazard=(event+c.strength*base)/(exposure+c.strength);
    score.push([n,hazard]);
  }
  return score.sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,8).map(x=>x[0]).sort((a,b)=>a-b);
}

function ev(c,L,withSignature=false){
  let full=0,h5=0,score=0;const events=[],sig=[];
  for(const i of L){
    const p=pred(i,c);if(!p)continue;
    let h=0;for(const n of p)if(truth[i].has(n))h++;
    score+=h*h*h;
    if(h===6){full++;events.push({date:rows[i].drawDate,pool:p,truth:sets[i]});}
    if(h>=5)h5++;
    if(withSignature)sig.push(`${rows[i].drawDate}:${p.join('-')}`);
  }
  return {full,h5,score,events,...(withSignature?{signature:sig.join('|')}:{})};
}

const nominal=cfgs.map((c,id)=>({id,c,sel:ev(c,selection,true)}))
  .sort((a,b)=>b.sel.full-a.sel.full||b.sel.h5-a.sel.h5||b.sel.score-a.sel.score||a.id-b.id);
const seen=new Set(),effective=[];
for(const x of nominal){if(seen.has(x.sel.signature))continue;seen.add(x.sel.signature);effective.push(x);}
const frozen=effective.slice(0,24).map(x=>({
  id:x.id,c:x.c,
  sel:{full:x.sel.full,h5:x.sel.h5,score:x.sel.score,events:x.sel.events},
  mid:ev(x.c,mid),late:ev(x.c,late)
}));
const summary={
  nominalConfigurations:cfgs.length,
  mathematicallyEffectiveConfigurations:effective.length,
  frozenEffectiveConfigurations:frozen.length,
  midFullModels:frozen.filter(x=>x.mid.full>0).length,
  lateFullModels:frozen.filter(x=>x.late.full>0).length,
  repeatFullModels:frozen.filter(x=>x.mid.full>0&&x.late.full>0).length,
  repeat5PlusModels:frozen.filter(x=>x.mid.h5>0&&x.late.h5>0).length
};
const out={
  generatedAt:new Date().toISOString(),
  engine:'MetaPleno-v110-bonoloto-survival-hazard-budget8',
  family:'discrete-time empirical-Bayes survival hazard by number waiting-time state',
  methodology:'For every prediction, estimate P(appearance next draw | current waiting-time bucket) only from prior draws in a rolling window. Hyperparameters cap/window/prior-strength are ranked only on 2020-2022. Prediction-signature duplicates are removed before freezing the best 24 mathematically effective configurations. 2023-2024 and 2025-latest are untouched later periods.',
  partitions:{TRAIN:'history before each prediction',VALIDATION_SELECTION:'2020-01-01..2022-12-31',POST_FREEZE_MID:'2023-01-01..2024-12-31',POST_FREEZE_LATE:'2025-01-01..latest'},
  searchAccounting:{candidatePool:8,nominalConfigurations:cfgs.length,mathematicallyEffectiveConfigurations:effective.length,criterion:'full desc, 5+ desc, cubic hit score desc; selection period only',selectionPeriod:'2020-2022',laterPeriods:['2023-2024','2025-latest'],familiesInvestigated:['discrete-survival-hazard']},
  budget:{poolSize:8,combinations:28,theoreticalCostEUR:14,maxEURPerGameDraw:15,realStakeEUR:0},
  summary,
  leaders:frozen,
  statisticalDecision:summary.repeatFullModels>0?'REQUIRES_MATCHED_NULL_AND_MULTIPLE_TESTING_AUDIT':'NO_REPEATED_FULL_POST_FREEZE_SIGNAL',
  realMoneyPass:false
};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(summary));
