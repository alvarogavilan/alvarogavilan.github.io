#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai';
const ARCH=path.join(ROOT,'data','archive','bonoloto');
const OUT=path.join(ROOT,'data','research','metapleno-v243-temporal-gradient-boosting.json');
const MAXN=49, LINES=30, COST=15, POOL=12;

function load(){
  const rows=[];
  for(const f of fs.readdirSync(ARCH).filter(f=>/^\d{4}\.json$/.test(f)).sort()){
    const j=JSON.parse(fs.readFileSync(path.join(ARCH,f),'utf8'));
    for(const r of (j.records||j.draws||[])){
      const date=r.drawDate||r.date;
      const main=(r.result?.main||r.main||r.numbers||[]).map(Number).sort((a,b)=>a-b);
      if(date&&main.length===6) rows.push({date,main});
    }
  }
  return [...new Map(rows.map(r=>[r.date,r])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}

function features(rows, idx, n){
  const x=n+1;
  const wins=w=>{let c=0;for(let i=Math.max(0,idx-w);i<idx;i++)if(rows[i].main.includes(x))c++;return c/w;};
  let gap=200;
  for(let i=idx-1;i>=Math.max(0,idx-200);i--){if(rows[i].main.includes(x)){gap=idx-i;break;}}
  const f5=wins(5), f20=wins(20), f60=wins(60), f180=wins(180);
  return [
    Math.min(gap,200)/200,
    f5,
    f20,
    f60,
    f180,
    f20-f180,
    f60-f180,
    n/(MAXN-1)
  ];
}

function samples(rows, endExclusive, windowDraws){
  const end=endExclusive;
  const start=Math.max(200,end-windowDraws);
  const X=[], y=[];
  for(let i=start;i<end;i++){
    const target=new Set(rows[i].main);
    for(let n=0;n<MAXN;n++){
      X.push(features(rows,i,n));
      y.push(target.has(n+1)?1:0);
    }
  }
  return {X,y};
}

function fitBoost(X,y,trees,lr){
  const base=y.reduce((a,b)=>a+b,0)/y.length;
  const pred=Array(y.length).fill(base);
  const model=[];
  const thresholds=[.05,.1,.2,.35,.5,.7,.9];
  for(let t=0;t<trees;t++){
    let best=null;
    for(let f=0;f<X[0].length;f++){
      for(const thr of thresholds){
        let lsum=0,lsq=0,ln=0,rsum=0,rsq=0,rn=0;
        for(let i=0;i<X.length;i++){
          const r=y[i]-pred[i];
          if(X[i][f]<=thr){lsum+=r;lsq+=r*r;ln++;}else{rsum+=r;rsq+=r*r;rn++;}
        }
        if(!ln||!rn) continue;
        const lv=lsum/ln, rv=rsum/rn;
        const loss=(lsq-lsum*lsum/ln)+(rsq-rsum*rsum/rn);
        if(!best||loss<best.loss) best={f,thr,lv,rv,loss};
      }
    }
    if(!best) break;
    model.push(best);
    for(let i=0;i<X.length;i++) pred[i]+=lr*(X[i][best.f]<=best.thr?best.lv:best.rv);
  }
  return {base,lr,stumps:model};
}

function scoreOne(model,x){
  let s=model.base;
  for(const st of model.stumps) s+=model.lr*(x[st.f]<=st.thr?st.lv:st.rv);
  return s;
}

function ticketLines(scores){
  const pool=Array.from({length:MAXN},(_,i)=>i+1).sort((a,b)=>scores[b-1]-scores[a-1]||a-b).slice(0,POOL);
  const cand=[];
  for(let a=0;a<7;a++)for(let b=a+1;b<8;b++)for(let c=b+1;c<9;c++)for(let d=c+1;d<10;d++)for(let e=d+1;e<11;e++)for(let f=e+1;f<12;f++){
    const line=[pool[a],pool[b],pool[c],pool[d],pool[e],pool[f]];
    cand.push({line,v:line.reduce((s,n)=>s+scores[n-1],0)});
  }
  return cand.sort((x,y)=>y.v-x.v).slice(0,LINES).map(x=>x.line);
}

function evalEra(rows,model,start,end){
  let n=0,sum=0,h5=0,h6=0; const hitDates=[];
  for(let i=0;i<rows.length;i++){
    const d=rows[i];
    if(d.date<start||d.date>=end||i<200) continue;
    const scores=Array.from({length:MAXN},(_,k)=>scoreOne(model,features(rows,i,k)));
    const lines=ticketLines(scores), target=new Set(d.main);
    let best=0;
    for(const l of lines) best=Math.max(best,l.reduce((s,x)=>s+target.has(x),0));
    n++;sum+=best;
    if(best>=5){h5++;hitDates.push({date:d.date,best});}
    if(best===6)h6++;
  }
  return {n,meanBest:n?sum/n:0,hit5Plus:h5,full6:h6,hitDates};
}

const rows=load();
const idx2019=rows.findIndex(r=>r.date>='2019-01-01');
const idx2023=rows.findIndex(r=>r.date>='2023-01-01');
const cfgs=[];
for(const windowDraws of [365,730]) for(const trees of [6,12,18]) for(const lr of [.05,.1]) cfgs.push({windowDraws,trees,lr});
const trials=[];
for(const cfg of cfgs){
  const s=samples(rows,idx2019,cfg.windowDraws);
  const model=fitBoost(s.X,s.y,cfg.trees,cfg.lr);
  const e=evalEra(rows,model,'2019-01-01','2023-01-01');
  trials.push({cfg,...e});
}
trials.sort((a,b)=>b.full6-a.full6||b.hit5Plus-a.hit5Plus||b.meanBest-a.meanBest||a.cfg.trees-b.cfg.trees||a.cfg.windowDraws-b.cfg.windowDraws||a.cfg.lr-b.cfg.lr);
const selected=trials[0];
const frozenSamples=samples(rows,idx2023,selected.cfg.windowDraws);
const frozen=fitBoost(frozenSamples.X,frozenSamples.y,selected.cfg.trees,selected.cfg.lr);
const validation=evalEra(rows,frozen,'2023-01-01','2025-01-01');
const postFreeze=evalEra(rows,frozen,'2025-01-01','9999-12-31');
const repeat=validation.hit5Plus>0&&postFreeze.hit5Plus>0;
const anyFull=validation.full6>0||postFreeze.full6>0;
const out={
  version:'v243',engine:'Temporal Gradient Boosted Stumps',family:'TEMPORAL_GRADIENT_BOOSTING',gameId:'bonoloto',generatedAt:new Date().toISOString(),archiveDraws:rows.length,
  candidatePool:{nominalConfigurations:cfgs.length,effectiveConfigurations:cfgs.length,poolSize:POOL,linesPerDraw:LINES,theoreticalCostEUR:COST},
  reconstruction:'Every prediction uses features computed only from draws strictly before the target draw. Hyperparameters are selected on 2019-2022 after fitting only pre-2019; selected model is retrained only on pre-2023 and frozen.',
  features:['gap200','freq5','freq20','freq60','freq180','trend20_180','trend60_180','number_position'],
  selection:{criterion:'pre-2023 only: full6 > hit5+ > meanBest > lower complexity',selected:selected.cfg,train:{n:selected.n,meanBest:selected.meanBest,hit5Plus:selected.hit5Plus,full6:selected.full6}},
  validation:{period:'2023-2024',...validation},postFreeze:{period:'2025+',...postFreeze},
  signal:{repeat5PlusAcrossEras:repeat,fullAcrossEras:validation.full6>0&&postFreeze.full6>0,requiresAudit:repeat||anyFull},
  decision:(repeat||anyFull)?'AUDIT_SIGNAL':'NEGATIVE',realMoneyPass:false,realStakeEUR:0,
  note:'Nonlinear supervised boosting lane. Retrospective evidence never authorizes real money; any 5+/6/6 signal requires matched-null, multiple-testing correction and prospective freeze.'
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
