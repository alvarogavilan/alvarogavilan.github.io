#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai';
const ARCH=path.join(ROOT,'data','archive','bonoloto');
const OUT=path.join(ROOT,'data','research','metapleno-v247-transfer-entropy.json');
const MAXN=49, LINES=30, COST=15;

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

function incidence(rows){
  return rows.map(r=>{const a=new Uint8Array(MAXN); for(const n of r.main)a[n-1]=1; return a;});
}

function teForPair(R,src,tgt,alpha){
  // counts[y_t][y_prev][x_prev]
  const c=Array.from({length:2},()=>Array.from({length:2},()=>Array(2).fill(alpha)));
  for(let t=1;t<R.length;t++) c[R[t][tgt]][R[t-1][tgt]][R[t-1][src]]++;
  let total=0; for(let y=0;y<2;y++)for(let z=0;z<2;z++)for(let x=0;x<2;x++)total+=c[y][z][x];
  let te=0;
  for(let y=0;y<2;y++)for(let z=0;z<2;z++)for(let x=0;x<2;x++){
    const n=c[y][z][x]; if(!n)continue;
    let denXZ=0, denZ=0, numYZ=0;
    for(let yy=0;yy<2;yy++) denXZ+=c[yy][z][x];
    for(let xx=0;xx<2;xx++)for(let yy=0;yy<2;yy++) denZ+=c[yy][z][xx];
    for(let xx=0;xx<2;xx++) numYZ+=c[y][z][xx];
    const p=n/total, py_xz=n/denXZ, py_z=numYZ/denZ;
    te += p*Math.log(Math.max(1e-12,py_xz/Math.max(1e-12,py_z)));
  }
  return Math.max(0,te);
}

function fit(rows,window,topK,alpha){
  const R=incidence(rows.slice(-window));
  const base=Array(MAXN).fill(0);
  for(const r of R)for(let n=0;n<MAXN;n++)base[n]+=r[n];
  for(let n=0;n<MAXN;n++)base[n]=(base[n]+alpha)/(R.length+2*alpha);
  const incoming=Array.from({length:MAXN},()=>[]);
  for(let tgt=0;tgt<MAXN;tgt++){
    for(let src=0;src<MAXN;src++){
      if(src===tgt)continue;
      const te=teForPair(R,src,tgt,alpha);
      if(te>0)incoming[tgt].push({src,te});
    }
    incoming[tgt].sort((a,b)=>b.te-a.te||a.src-b.src);
    incoming[tgt]=incoming[tgt].slice(0,topK);
  }
  return {base,incoming,window,topK,alpha};
}

function scoreAt(model,prev){
  const P=new Set(prev.main);
  return model.base.map((b,tgt)=>{
    let s=Math.log(Math.max(1e-9,b));
    for(const e of model.incoming[tgt]) if(P.has(e.src+1)) s+=8*e.te;
    return s;
  });
}

function lines(score){
  const pool=Array.from({length:MAXN},(_,i)=>i+1).sort((a,b)=>score[b-1]-score[a-1]||a-b).slice(0,12);
  const cand=[];
  for(let a=0;a<7;a++)for(let b=a+1;b<8;b++)for(let c=b+1;c<9;c++)for(let d=c+1;d<10;d++)for(let e=d+1;e<11;e++)for(let f=e+1;f<12;f++){
    const line=[pool[a],pool[b],pool[c],pool[d],pool[e],pool[f]];
    cand.push({line,v:line.reduce((s,n)=>s+score[n-1],0)});
  }
  return cand.sort((x,y)=>y.v-x.v).slice(0,LINES).map(x=>x.line);
}

function evalEra(all,model,start,end){
  let n=0,h5=0,h6=0,sum=0; const hitDates=[];
  for(let i=1;i<all.length;i++){
    const d=all[i]; if(d.date<start||d.date>=end)continue;
    const sc=scoreAt(model,all[i-1]), L=lines(sc), t=new Set(d.main); let best=0;
    for(const l of L)best=Math.max(best,l.reduce((s,x)=>s+t.has(x),0));
    n++;sum+=best;if(best>=5){h5++;hitDates.push({date:d.date,best});}if(best===6)h6++;
  }
  return {n,meanBest:n?sum/n:0,hit5Plus:h5,full6:h6,hitDates};
}

const rows=load();
const pre2019=rows.filter(r=>r.date<'2019-01-01');
const cfgs=[];
for(const window of [730,1460])for(const topK of [3,6,12])for(const alpha of [0.25,1])cfgs.push({window,topK,alpha});
const tr=[];
for(const cfg of cfgs){
  const m=fit(pre2019,cfg.window,cfg.topK,cfg.alpha);
  const e=evalEra(rows,m,'2019-01-01','2023-01-01');
  tr.push({cfg,...e});
}
tr.sort((a,b)=>b.full6-a.full6||b.hit5Plus-a.hit5Plus||b.meanBest-a.meanBest||a.cfg.topK-b.cfg.topK||a.cfg.window-b.cfg.window);
const selected=tr[0];
const frozen=fit(rows.filter(r=>r.date<'2023-01-01'),selected.cfg.window,selected.cfg.topK,selected.cfg.alpha);
const validation=evalEra(rows,frozen,'2023-01-01','2025-01-01');
const postFreeze=evalEra(rows,frozen,'2025-01-01','9999-12-31');
const repeat=validation.hit5Plus>0&&postFreeze.hit5Plus>0;
const out={
  version:'v247',engine:'Directed Transfer Entropy Network',family:'DIRECTED_TRANSFER_ENTROPY',gameId:'bonoloto',generatedAt:new Date().toISOString(),archiveDraws:rows.length,
  candidatePool:{nominalConfigurations:cfgs.length,effectiveConfigurations:cfgs.length,poolSize:12,linesPerDraw:LINES,theoreticalCostEUR:COST},
  reconstruction:'Directed transfer entropy is estimated from historical binary inclusion states only. Each target number conditions source influence on its own previous inclusion state. Hyperparameters are selected pre-2023; final TE network is refit only through 2022 and frozen.',
  selection:{criterion:'pre-2023 only: full6 > hit5+ > meanBest > lower complexity',selected:selected.cfg,train:{n:selected.n,meanBest:selected.meanBest,hit5Plus:selected.hit5Plus,full6:selected.full6}},
  validation:{period:'2023-2024',...validation},postFreeze:{period:'2025+',...postFreeze},
  signal:{repeat5PlusAcrossEras:repeat,fullAcrossEras:validation.full6>0&&postFreeze.full6>0,requiresAudit:repeat||validation.full6>0||postFreeze.full6>0},
  decision:(repeat||validation.full6||postFreeze.full6)?'AUDIT_SIGNAL':'NEGATIVE',realMoneyPass:false,realStakeEUR:0,
  note:'Directed nonlinear temporal-information lane. Retrospective evidence never authorizes real money; any 5+/6/6 signal requires matched-null, multiple-testing correction and prospective freeze.'
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
