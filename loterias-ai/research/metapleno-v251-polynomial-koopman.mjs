#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai';
const ARCH=path.join(ROOT,'data','archive','bonoloto');
const OUT=path.join(ROOT,'data','research','metapleno-v251-polynomial-koopman.json');
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

const rows=load();
const N=rows.length;
const inc=Array.from({length:N},()=>new Uint8Array(MAXN));
for(let i=0;i<N;i++) for(const n of rows[i].main) inc[i][n-1]=1;
const pref=Array.from({length:N+1},()=>new Uint16Array(MAXN));
for(let i=0;i<N;i++){
  const p=pref[i], q=pref[i+1], x=inc[i];
  for(let n=0;n<MAXN;n++) q[n]=p[n]+x[n];
}
const gap=Array.from({length:N},()=>new Uint16Array(MAXN));
const last=new Int32Array(MAXN); last.fill(-1);
for(let i=0;i<N;i++){
  for(let n=0;n<MAXN;n++) gap[i][n]=last[n]<0?365:Math.min(365,i-last[n]);
  for(const n of rows[i].main) last[n-1]=i;
}
function freq(i,n,w){
  const a=Math.max(0,i-w+1), den=i-a+1;
  return den>0?(pref[i+1][n]-pref[a][n])/den:0;
}
function baseState(i,n){
  const f30=freq(i,n,30), f120=freq(i,n,120), f365=freq(i,n,365);
  return [inc[i][n], gap[i][n]/365, f30, f120, f365, f30-f365, (n+1)/MAXN];
}
function psi(i,n,degree){
  const x=baseState(i,n);
  if(degree===1) return [1,...x];
  const [a,g,f30,f120,f365,tr,id]=x;
  return [1,a,g,f30,f120,f365,tr,id,g*g,f30*f30,f120*f120,tr*tr,a*g,f30*f120,g*tr,id*tr];
}
function solve(A,b){
  const n=b.length;
  const M=Array.from({length:n},(_,i)=>[...A[i],b[i]]);
  for(let c=0;c<n;c++){
    let p=c;
    for(let r=c+1;r<n;r++) if(Math.abs(M[r][c])>Math.abs(M[p][c])) p=r;
    if(Math.abs(M[p][c])<1e-12) continue;
    [M[c],M[p]]=[M[p],M[c]];
    const d=M[c][c]; for(let j=c;j<=n;j++) M[c][j]/=d;
    for(let r=0;r<n;r++) if(r!==c){
      const f=M[r][c]; if(!f) continue;
      for(let j=c;j<=n;j++) M[r][j]-=f*M[c][j];
    }
  }
  return M.map(r=>r[n]);
}
function fit(endIdx,window,degree,lambda){
  const start=Math.max(365,endIdx-window);
  const d=psi(Math.max(0,start),0,degree).length;
  const G=Array.from({length:d},()=>Array(d).fill(0));
  const b=Array(d).fill(0);
  for(let t=start;t<endIdx-1;t++){
    for(let n=0;n<MAXN;n++){
      const z=psi(t,n,degree), y=inc[t+1][n];
      for(let i=0;i<d;i++){
        b[i]+=z[i]*y;
        for(let j=0;j<d;j++) G[i][j]+=z[i]*z[j];
      }
    }
  }
  for(let i=0;i<d;i++) G[i][i]+=lambda;
  return {coef:solve(G,b),window,degree,lambda};
}
function scoreAt(model,i){
  const out=Array(MAXN).fill(0);
  for(let n=0;n<MAXN;n++){
    const z=psi(i,n,model.degree);
    let s=0; for(let k=0;k<z.length;k++) s+=model.coef[k]*z[k];
    out[n]=s;
  }
  return out;
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
function idxBefore(date){
  let k=0; while(k<N&&rows[k].date<date) k++; return k;
}
function evalEra(model,start,end){
  let n=0,h5=0,h6=0,sum=0; const hitDates=[];
  const a=idxBefore(start), b=idxBefore(end);
  for(let i=Math.max(1,a);i<b;i++){
    const sc=scoreAt(model,i-1), L=lines(sc), target=new Set(rows[i].main); let best=0;
    for(const l of L){ let h=0; for(const x of l) if(target.has(x)) h++; if(h>best) best=h; }
    n++; sum+=best; if(best>=5){h5++;hitDates.push({date:rows[i].date,best});} if(best===6)h6++;
  }
  return {n,meanBest:n?sum/n:0,hit5Plus:h5,full6:h6,hitDates};
}
const pre2019=idxBefore('2019-01-01');
const pre2023=idxBefore('2023-01-01');
const cfgs=[];
for(const window of [730,1460,2920]) for(const degree of [1,2]) for(const lambda of [0.01,0.1]) cfgs.push({window,degree,lambda});
const train=[];
for(const cfg of cfgs){
  const m=fit(pre2019,cfg.window,cfg.degree,cfg.lambda);
  const e=evalEra(m,'2019-01-01','2023-01-01');
  train.push({cfg,...e});
}
train.sort((a,b)=>b.full6-a.full6||b.hit5Plus-a.hit5Plus||b.meanBest-a.meanBest||a.cfg.degree-b.cfg.degree||a.cfg.window-b.cfg.window||a.cfg.lambda-b.cfg.lambda);
const selected=train[0];
const frozen=fit(pre2023,selected.cfg.window,selected.cfg.degree,selected.cfg.lambda);
const validation=evalEra(frozen,'2023-01-01','2025-01-01');
const postFreeze=evalEra(frozen,'2025-01-01','9999-12-31');
const repeat=validation.hit5Plus>0&&postFreeze.hit5Plus>0;
const out={
  version:'v251',engine:'Polynomial Koopman EDMD',family:'POLYNOMIAL_KOOPMAN_EDMD',gameId:'bonoloto',generatedAt:new Date().toISOString(),archiveDraws:N,
  candidatePool:{nominalConfigurations:cfgs.length,effectiveConfigurations:cfgs.length,poolSize:12,linesPerDraw:LINES,theoreticalCostEUR:COST},
  reconstruction:'Extended Dynamic Mode Decomposition coordinate readout on a deterministic polynomial dictionary of pre-draw number states (previous inclusion, gap, rolling frequencies, trend and number identity). Hyperparameters selected entirely pre-2023; final Koopman readout refit only through 2022 and frozen.',
  selection:{criterion:'pre-2023 only: full6 > hit5+ > meanBest > lower complexity',selected:selected.cfg,train:{n:selected.n,meanBest:selected.meanBest,hit5Plus:selected.hit5Plus,full6:selected.full6}},
  validation:{period:'2023-2024',...validation},postFreeze:{period:'2025+',...postFreeze},
  signal:{repeat5PlusAcrossEras:repeat,fullAcrossEras:validation.full6>0&&postFreeze.full6>0,requiresAudit:repeat||validation.full6>0||postFreeze.full6>0},
  decision:(repeat||validation.full6||postFreeze.full6)?'AUDIT_SIGNAL':'NEGATIVE',realMoneyPass:false,realStakeEUR:0,
  note:'Orthogonal Koopman/EDMD lane with deterministic polynomial observables. Retrospective evidence never authorizes real money; any 5+/6/6 signal requires matched-null, multiple-testing correction and prospective freeze.'
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
