import fs from 'node:fs';

const GAME='bonoloto', MAX=49, PICK=6, MIN_HISTORY=250;
const OUT='loterias-ai/data/research/meta-pleno-v228-pool9-cover.json';
const windows=[20,50,100];
const families=[
  {id:'balanced',w:{long:.24,short:.20,gap:.18,stable:.18,meanrev:.20}},
  {id:'momentum',w:{long:.18,short:.42,gap:.08,stable:.18,meanrev:.14}},
  {id:'gap',w:{long:.14,short:.12,gap:.44,stable:.14,meanrev:.16}},
  {id:'stability',w:{long:.18,short:.14,gap:.10,stable:.44,meanrev:.14}},
  {id:'meanrev',w:{long:.14,short:.12,gap:.14,stable:.18,meanrev:.42}}
];
const lambdas=[0,0.03,0.08,0.15];
const configs=families.flatMap(f=>lambdas.map(lambda=>({id:`${f.id}-L${String(lambda).replace('.','p')}`,family:f,lambda})));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const sd=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));};
const clamp=x=>Math.max(0,Math.min(1,x));
const unitZ=z=>0.5+0.5*Math.tanh(z/2);
const comb=(arr,k,start=0,p=[],out=[])=>{if(p.length===k){out.push([...p]);return out;}for(let i=start;i<=arr.length-(k-p.length);i++){p.push(arr[i]);comb(arr,k,i+1,p,out);p.pop();}return out;};
const hit=(a,b)=>{const s=new Set(b);return a.filter(x=>s.has(x)).length};

function loadDraws(){
  const dir=`loterias-ai/data/archive/${GAME}`;
  const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)).sort();
  let raw=[]; for(const f of files) raw.push(...(JSON.parse(fs.readFileSync(`${dir}/${f}`,'utf8')).records||[]));
  return [...new Map(raw.map(r=>[r.drawId,r])).values()]
    .sort((a,b)=>a.drawDate.localeCompare(b.drawDate))
    .map(r=>({drawId:r.drawId,date:r.drawDate,nums:(r.result?.main||[]).map(Number).sort((a,b)=>a-b)}))
    .filter(d=>d.nums.length===6&&d.nums.every(n=>Number.isFinite(n)&&n>=1&&n<=49));
}
function init(){return{all:Array(MAX+1).fill(0),c20:Array(MAX+1).fill(0),c50:Array(MAX+1).fill(0),c100:Array(MAX+1).fill(0),last:Array(MAX+1).fill(-1),q20:[],q50:[],q100:[]}}
function z(c,n){const vals=c.slice(1),m=mean(vals),s=sd(vals);return s?(c[n]-m)/s:0}
function rank(st,i,f){
  let maxGap=1; const gaps=Array(MAX+1).fill(0); for(let n=1;n<=MAX;n++){gaps[n]=st.last[n]<0?i:i-1-st.last[n];maxGap=Math.max(maxGap,gaps[n]);}
  const rows=[];
  for(let n=1;n<=MAX;n++){
    const za=z(st.all,n),z20=z(st.c20,n),z50=z(st.c50,n),z100=z(st.c100,n);
    const sig={long:unitZ(za),short:clamp(.65*unitZ(z20)+.35*unitZ(z50)),gap:clamp(gaps[n]/maxGap),stable:clamp(1-(Math.abs(z20-z50)+Math.abs(z50-z100)+Math.abs(z100-za))/8),meanrev:clamp(1-Math.abs(unitZ(za)-.5)*2)};
    const score=Object.entries(f.w).reduce((s,[k,w])=>s+w*sig[k],0);
    rows.push({n,score});
  }
  return rows.sort((a,b)=>b.score-a.score||a.n-b.n);
}
function update(st,nums,i){
  st.q20.push(nums);st.q50.push(nums);st.q100.push(nums);
  for(const n of nums){st.all[n]++;st.c20[n]++;st.c50[n]++;st.c100[n]++;st.last[n]=i;}
  for(const [q,c,lim] of [[st.q20,st.c20,20],[st.q50,st.c50,50],[st.q100,st.c100,100]])if(q.length>lim)for(const n of q.shift())c[n]--;
}
function budget8(ranked){const pool=ranked.slice(0,8).map(x=>x.n).sort((a,b)=>a-b);return{pool,lines:comb(pool,6)}}
function pool9(ranked,lambda){
  const top=ranked.slice(0,9),pool=top.map(x=>x.n).sort((a,b)=>a-b),quality=new Map(top.map((x,i)=>[x.n,(9-i)/9]));
  const candidates=comb(pool,6).map(line=>({line,q:line.reduce((s,n)=>s+(quality.get(n)||0),0)}));
  const usage=new Map(pool.map(n=>[n,0])),selected=[];
  while(selected.length<30){
    let best=null;
    for(let i=0;i<candidates.length;i++){
      const c=candidates[i]; if(c.used)continue;
      const concentration=c.line.reduce((s,n)=>s+(usage.get(n)||0),0);
      const novelty=c.line.reduce((s,n)=>s+(usage.get(n)===0?1:0),0);
      const score=c.q-lambda*concentration+lambda*.35*novelty;
      const key=c.line.join('-'); if(!best||score>best.score||(score===best.score&&key<best.key))best={i,score,key};
    }
    const c=candidates[best.i];c.used=true;selected.push(c.line);for(const n of c.line)usage.set(n,(usage.get(n)||0)+1);
  }
  return{pool,lines:selected};
}
const makeAgg=()=>({draws:0,full:0,ge5:0,sumBest:0,fullDates:[],ge5Dates:[]});
function add(a,best,date){a.draws++;a.sumBest+=best;if(best===6){a.full++;a.fullDates.push(date)}if(best>=5){a.ge5++;a.ge5Dates.push(date)}}
function summarize(a){return{draws:a.draws,full:a.full,ge5:a.ge5,averageBestHits:a.draws?a.sumBest/a.draws:0,fullDates:a.fullDates,ge5Dates:a.ge5Dates}}
const draws=loadDraws(),st=init();
const byCfg=Object.fromEntries(configs.map(c=>[c.id,{config:{family:c.family.id,lambda:c.lambda,nominalLines:30,theoreticalCostEUR:15},train:{new:makeAgg(),base:makeAgg()},mid:{new:makeAgg(),base:makeAgg()},late:{new:makeAgg(),base:makeAgg()}}]));
for(let i=0;i<draws.length;i++){
  const d=draws[i];
  if(i>=MIN_HISTORY){
    const era=d.date<'2023-01-01'?'train':d.date<'2025-01-01'?'mid':'late';
    const rankCache=new Map();
    for(const cfg of configs){
      let ranked=rankCache.get(cfg.family.id);if(!ranked){ranked=rank(st,i,cfg.family);rankCache.set(cfg.family.id,ranked)}
      const b8=budget8(ranked),p9=pool9(ranked,cfg.lambda);
      const best8=Math.max(...b8.lines.map(x=>hit(x,d.nums))),best9=Math.max(...p9.lines.map(x=>hit(x,d.nums)));
      add(byCfg[cfg.id][era].base,best8,d.date);add(byCfg[cfg.id][era].new,best9,d.date);
    }
  }
  update(st,d.nums,i);
}
const table=configs.map(c=>{const r=byCfg[c.id],t=summarize(r.train.new),b=summarize(r.train.base);return{id:c.id,config:r.config,train:{pool9:t,budget8:b,deltaFull:t.full-b.full,delta5Plus:t.ge5-b.ge5,deltaAvg:t.averageBestHits-b.averageBestHits}}}).sort((a,b)=>b.train.deltaFull-a.train.deltaFull||b.train.delta5Plus-a.train.delta5Plus||b.train.deltaAvg-a.train.deltaAvg||a.id.localeCompare(b.id));
const frozen=table.slice(0,8).map(x=>x.id);
function eraSummary(era){
  const models=frozen.map(id=>({id,pool9:summarize(byCfg[id][era].new),budget8:summarize(byCfg[id][era].base)}));
  const unique5=[...new Set(models.flatMap(x=>x.pool9.ge5Dates))].sort(),uniqueFull=[...new Set(models.flatMap(x=>x.pool9.fullDates))].sort();
  const base5=[...new Set(models.flatMap(x=>x.budget8.ge5Dates))].sort(),baseFull=[...new Set(models.flatMap(x=>x.budget8.fullDates))].sort();
  return{models,uniquePool9_5PlusDates:unique5,uniquePool9FullDates:uniqueFull,uniqueBudget8_5PlusDates:base5,uniqueBudget8FullDates:baseFull};
}
const mid=eraSummary('mid'),late=eraSummary('late');
const repeat5=mid.uniquePool9_5PlusDates.length>0&&late.uniquePool9_5PlusDates.length>0,repeatFull=mid.uniquePool9FullDates.length>0&&late.uniquePool9FullDates.length>0;
const out={generatedAt:new Date().toISOString(),version:'v228',gameId:GAME,family:'COST_AWARE_POOL9_30_LINE_COVER',purpose:'Test whether 15 EUR / 30 lines over a 9-number ranked pool improves full-hit conversion versus complete Budget8 (14 EUR / 28 lines), without changing the underlying predictor.',candidatePool:{nominalConfigurations:configs.length,effectiveConfigurations:configs.length,selectionCriterion:'Top 8 by TRAIN-only delta full, then delta 5+, then average-best-hit improvement versus same-family Budget8.'},dataBoundary:{train:'all eligible draws before 2023-01-01',validation:'2023-01-01..2024-12-31',postFreeze:'2025-01-01 onward',minimumHistory:MIN_HISTORY,chronological:true,targetUpdatedAfterScoring:true},economics:{budget8:{poolSize:8,lines:28,costEUR:14},pool9:{poolSize:9,lines:30,costEUR:15},realStakeEUR:0},frozen,trainRanking:table,validation:mid,postFreeze:late,signals:{repeat5PlusAcrossEras:repeat5,repeatFullAcrossEras:repeatFull,validationFullDates:mid.uniquePool9FullDates,postFreezeFullDates:late.uniquePool9FullDates,validation5PlusDates:mid.uniquePool9_5PlusDates,postFreeze5PlusDates:late.uniquePool9_5PlusDates},decision:repeatFull?'AUDIT_FULL_SIGNAL':repeat5?'AUDIT_REPEAT5_SIGNAL':'NEGATIVE_OR_NO_REPEAT',multipleTesting:{status:(repeatFull||repeat5)?'REQUIRED_BEFORE_PROMOTION':'NOT_TRIGGERED',candidateCount:configs.length},realMoneyPass:false,realStakeEUR:0};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({decision:out.decision,frozen,signals:out.signals},null,2));