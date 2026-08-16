#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai';
const ARCH=path.join(ROOT,'data','archive','bonoloto');
const OUT=path.join(ROOT,'data','research','metapleno-v244-temporal-mlp.json');
const MAXN=49, F=8, LINES=30, COST=15;

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

function precompute(rows){
  const n=rows.length, X=new Float32Array(n*MAXN*F), last=Array(MAXN).fill(-1);
  const wins=[5,20,60,180], counts=wins.map(()=>Array(MAXN).fill(0));
  const sets=rows.map(r=>new Set(r.main.map(x=>x-1)));
  for(let i=0;i<n;i++){
    for(let num=0;num<MAXN;num++){
      const off=(i*MAXN+num)*F;
      const gap=last[num]<0?200:Math.min(200,i-last[num]);
      const f5=counts[0][num]/5, f20=counts[1][num]/20, f60=counts[2][num]/60, f180=counts[3][num]/180;
      X[off]=Math.log1p(gap)/Math.log(201);
      X[off+1]=f5; X[off+2]=f20; X[off+3]=f60; X[off+4]=f180;
      X[off+5]=f20-f180; X[off+6]=f60-f180; X[off+7]=num/(MAXN-1);
    }
    const s=sets[i];
    for(let w=0;w<wins.length;w++){
      for(const num of s) counts[w][num]++;
      const old=i-wins[w];
      if(old>=0) for(const num of sets[old]) counts[w][num]--;
    }
    for(const num of s) last[num]=i;
  }
  return {X,sets};
}

function rng(seed=244){let x=seed>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296;};}
function sigmoid(x){return x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));}

function initModel(hidden,seed){
  const R=rng(seed), W1=Array.from({length:hidden},()=>Array.from({length:F},()=> (R()-.5)*.3));
  const b1=Array(hidden).fill(0), W2=Array.from({length:hidden},()=> (R()-.5)*.3); let b2=-1.9;
  return {hidden,W1,b1,W2,b2};
}

function train(rows,pc,startIdx,endIdx,cfg,seed){
  const m=initModel(cfg.hidden,seed), H=cfg.hidden, lr=cfg.lr;
  const start=Math.max(startIdx,endIdx-cfg.windowDraws);
  for(let ep=0;ep<cfg.epochs;ep++){
    const eta=lr/(1+ep*.25);
    for(let i=start;i<endIdx;i++){
      const yset=pc.sets[i];
      for(let num=0;num<MAXN;num++){
        const off=(i*MAXN+num)*F, h=new Float64Array(H);
        let z2=m.b2;
        for(let k=0;k<H;k++){
          let z=m.b1[k]; for(let f=0;f<F;f++) z+=m.W1[k][f]*pc.X[off+f];
          h[k]=Math.tanh(z); z2+=m.W2[k]*h[k];
        }
        const p=sigmoid(z2), y=yset.has(num)?1:0, d=p-y;
        const oldW2=m.W2.slice();
        for(let k=0;k<H;k++) m.W2[k]-=eta*(d*h[k]+1e-4*m.W2[k]);
        m.b2-=eta*d;
        for(let k=0;k<H;k++){
          const dz=d*oldW2[k]*(1-h[k]*h[k]);
          for(let f=0;f<F;f++) m.W1[k][f]-=eta*(dz*pc.X[off+f]+1e-4*m.W1[k][f]);
          m.b1[k]-=eta*dz;
        }
      }
    }
  }
  return m;
}

function scoreNum(m,X,off){
  let z=m.b2;
  for(let k=0;k<m.hidden;k++){
    let a=m.b1[k]; for(let f=0;f<F;f++) a+=m.W1[k][f]*X[off+f];
    z+=m.W2[k]*Math.tanh(a);
  }
  return z;
}

function bestLines(scores){
  const pool=Array.from({length:MAXN},(_,i)=>i+1).sort((a,b)=>scores[b-1]-scores[a-1]||a-b).slice(0,12);
  const cand=[];
  for(let a=0;a<7;a++)for(let b=a+1;b<8;b++)for(let c=b+1;c<9;c++)for(let d=c+1;d<10;d++)for(let e=d+1;e<11;e++)for(let f=e+1;f<12;f++){
    const line=[pool[a],pool[b],pool[c],pool[d],pool[e],pool[f]];
    cand.push({line,v:line.reduce((s,n)=>s+scores[n-1],0)});
  }
  return cand.sort((x,y)=>y.v-x.v).slice(0,LINES).map(x=>x.line);
}

function evalEra(rows,pc,m,start,end){
  let n=0,h5=0,h6=0,sum=0; const hitDates=[];
  for(let i=0;i<rows.length;i++){
    const d=rows[i]; if(d.date<start||d.date>=end) continue;
    const scores=Array(MAXN); for(let num=0;num<MAXN;num++) scores[num]=scoreNum(m,pc.X,(i*MAXN+num)*F);
    const L=bestLines(scores), target=pc.sets[i]; let best=0;
    for(const l of L){let h=0;for(const x of l)if(target.has(x-1))h++;if(h>best)best=h;}
    n++;sum+=best;if(best>=5){h5++;hitDates.push({date:d.date,best});}if(best===6)h6++;
  }
  return {n,meanBest:n?sum/n:0,hit5Plus:h5,full6:h6,hitDates};
}

const rows=load(),pc=precompute(rows);
const idx2019=rows.findIndex(r=>r.date>='2019-01-01'), idx2023=rows.findIndex(r=>r.date>='2023-01-01');
const cfgs=[];for(const windowDraws of [730,1460])for(const hidden of [8,16])for(const epochs of [3,6,9])cfgs.push({windowDraws,hidden,epochs,lr:.03});
const trials=[];
for(let c=0;c<cfgs.length;c++){
  const cfg=cfgs[c], m=train(rows,pc,0,idx2019,cfg,244+c), e=evalEra(rows,pc,m,'2019-01-01','2023-01-01');
  trials.push({cfg,...e});
}
trials.sort((a,b)=>b.full6-a.full6||b.hit5Plus-a.hit5Plus||b.meanBest-a.meanBest||a.cfg.hidden-b.cfg.hidden||a.cfg.epochs-b.cfg.epochs||a.cfg.windowDraws-b.cfg.windowDraws);
const selected=trials[0], frozen=train(rows,pc,0,idx2023,selected.cfg,244), validation=evalEra(rows,pc,frozen,'2023-01-01','2025-01-01'), postFreeze=evalEra(rows,pc,frozen,'2025-01-01','9999-12-31');
const repeat=validation.hit5Plus>0&&postFreeze.hit5Plus>0;
const out={version:'v244',engine:'Temporal MLP Classifier',family:'TEMPORAL_MLP_NEURAL',gameId:'bonoloto',generatedAt:new Date().toISOString(),archiveDraws:rows.length,candidatePool:{nominalConfigurations:cfgs.length,effectiveConfigurations:cfgs.length,poolSize:12,linesPerDraw:LINES,theoreticalCostEUR:COST},reconstruction:'Each target uses features computed strictly from prior draws. Hyperparameters selected pre-2023; final MLP retrained only through 2022 and frozen.',features:['gap200','freq5','freq20','freq60','freq180','trend20_180','trend60_180','number_position'],selection:{criterion:'pre-2023 only: full6 > hit5+ > meanBest > lower complexity',selected:selected.cfg,train:{n:selected.n,meanBest:selected.meanBest,hit5Plus:selected.hit5Plus,full6:selected.full6}},validation:{period:'2023-2024',...validation},postFreeze:{period:'2025+',...postFreeze},signal:{repeat5PlusAcrossEras:repeat,fullAcrossEras:validation.full6>0&&postFreeze.full6>0,requiresAudit:repeat||validation.full6>0||postFreeze.full6>0},decision:(repeat||validation.full6||postFreeze.full6)?'AUDIT_SIGNAL':'NEGATIVE',realMoneyPass:false,realStakeEUR:0,note:'Small fully-trained nonlinear neural lane; deterministic seeds and pre-draw reconstruction. Retrospective evidence never authorizes real money.'};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));