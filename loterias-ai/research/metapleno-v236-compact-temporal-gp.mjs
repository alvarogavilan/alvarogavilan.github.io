#!/usr/bin/env node
/**
 * v236 — Sparse Temporal Gaussian Process (Bonoloto)
 * Orthogonal lane: deterministic inducing-point RBF GP approximation over time.
 * Hyperparameters are selected exclusively on pre-2023 data, then frozen.
 * Research only: never authorizes real money.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai';
const ARCH=path.join(ROOT,'data','archive','bonoloto');
const OUT=path.join(ROOT,'data','research','metapleno-v236-compact-temporal-gp.json');
const MAXN=49, K=6, LINES=30, COST=15;

function load(){
  const files=fs.readdirSync(ARCH).filter(f=>/^\d{4}\.json$/.test(f)).sort();
  const rows=[];
  for(const f of files){
    const j=JSON.parse(fs.readFileSync(path.join(ARCH,f),'utf8'));
    for(const r of (j.records||j.draws||[])){
      const date=r.drawDate||r.date;
      const main=(r.result?.main||r.main||r.numbers||[]).map(Number).sort((a,b)=>a-b);
      if(date&&main.length===6&&main.every(n=>n>=1&&n<=49)) rows.push({date,main});
    }
  }
  const m=new Map(rows.map(r=>[r.date,r])); return [...m.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function inv(A){
  const n=A.length,M=A.map((r,i)=>[...r,...Array.from({length:n},(_,j)=>i===j?1:0)]);
  for(let c=0;c<n;c++){
    let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;
    if(Math.abs(M[p][c])<1e-12) throw new Error('singular'); [M[c],M[p]]=[M[p],M[c]];
    const q=M[c][c];for(let j=0;j<2*n;j++)M[c][j]/=q;
    for(let r=0;r<n;r++)if(r!==c){const z=M[r][c];if(z)for(let j=0;j<2*n;j++)M[r][j]-=z*M[c][j];}
  } return M.map(r=>r.slice(n));
}
function weights(window,m,ell,lambda){
  const z=Array.from({length:m},(_,j)=>(window-1)*j/(m-1));
  const phi=Array.from({length:window},(_,t)=>z.map(a=>Math.exp(-.5*((t-a)/ell)**2)));
  const pred=z.map(a=>Math.exp(-.5*((window-a)/ell)**2));
  const G=Array.from({length:m},(_,i)=>Array.from({length:m},(_,j)=>phi.reduce((s,r)=>s+r[i]*r[j],0)+(i===j?lambda:0)));
  const Gi=inv(G), a=Array(m).fill(0);
  for(let i=0;i<m;i++)for(let j=0;j<m;j++)a[i]+=pred[j]*Gi[j][i];
  return Array.from({length:window},(_,t)=>a.reduce((s,x,j)=>s+x*phi[t][j],0));
}
function choose6(pool,scores){
  const out=[]; for(let a=0;a<pool.length-5;a++)for(let b=a+1;b<pool.length-4;b++)for(let c=b+1;c<pool.length-3;c++)for(let d=c+1;d<pool.length-2;d++)for(let e=d+1;e<pool.length-1;e++)for(let f=e+1;f<pool.length;f++){
    const line=[pool[a],pool[b],pool[c],pool[d],pool[e],pool[f]];
    const score=line.reduce((s,n)=>s+scores[n],0);
    out.push({line,score});
  }
  out.sort((x,y)=>y.score-x.score||x.line.join(',').localeCompare(y.line.join(',')));
  return out.slice(0,LINES).map(x=>x.line);
}
function evalCfg(rows,cfg,start,end){
  const w=weights(cfg.window,cfg.m,cfg.ell,cfg.lambda); let n=0,h5=0,h6=0,sum=0; const hitDates=[];
  for(let i=cfg.window;i<rows.length;i++){
    const d=rows[i]; if(d.date<start||d.date>=end) continue;
    const scores=Array(MAXN+1).fill(0);
    for(let lag=0;lag<cfg.window;lag++) for(const num of rows[i-cfg.window+lag].main) scores[num]+=w[lag];
    const ranked=Array.from({length:MAXN},(_,x)=>x+1).sort((a,b)=>scores[b]-scores[a]||a-b);
    const lines=choose6(ranked.slice(0,9),scores), truth=new Set(d.main); let best=0;
    for(const line of lines){const h=line.reduce((s,x)=>s+truth.has(x),0);if(h>best)best=h;}
    n++;sum+=best;if(best>=5){h5++;hitDates.push({date:d.date,best});}if(best===6)h6++;
  }
  return {n,meanBest:n?sum/n:0,hit5Plus:h5,full6:h6,hitDates};
}
const rows=load(); if(rows.length<1000) throw new Error(`archive too small: ${rows.length}`);
const configs=[];
for(const window of [90,180,365]) for(const m of [8,16]) for(const ratio of [.08,.16,.32]) for(const lambda of [.05,.2]) configs.push({window,m,ell:window*ratio,lambda});
// Pre-2023 selection only. Primary objective: full6, then 5+, then mean best; complexity tie-breaker.
const trainResults=configs.map((cfg,id)=>({id,cfg,...evalCfg(rows,cfg,'2019-01-01','2023-01-01')}));
trainResults.sort((a,b)=>b.full6-a.full6||b.hit5Plus-a.hit5Plus||b.meanBest-a.meanBest||a.cfg.m-b.cfg.m||a.cfg.window-b.cfg.window||a.id-b.id);
const selected=trainResults[0];
const validation=evalCfg(rows,selected.cfg,'2023-01-01','2025-01-01');
const postFreeze=evalCfg(rows,selected.cfg,'2025-01-01','9999-12-31');
const repeat5=validation.hit5Plus>0&&postFreeze.hit5Plus>0;
const out={version:'v236',engine:'Sparse Temporal Gaussian Process',family:'TEMPORAL_SPARSE_GP_RBF',gameId:'bonoloto',generatedAt:new Date().toISOString(),archiveDraws:rows.length,candidatePool:{nominalConfigurations:configs.length,effectiveConfigurations:configs.length,linesPerDraw:LINES,theoreticalCostEUR:COST},selection:{criterion:'pre-2023 only: full6 > hit5+ > meanBest > lower complexity',period:'2019-01-01..2022-12-31',selectedId:selected.id,hyperparameters:selected.cfg,train:{n:selected.n,meanBest:selected.meanBest,hit5Plus:selected.hit5Plus,full6:selected.full6}},validation:{period:'2023-2024',...validation},postFreeze:{period:'2025+',...postFreeze},signal:{repeat5PlusAcrossEras:repeat5,fullAcrossEras:validation.full6>0&&postFreeze.full6>0,requiresAudit:repeat5||validation.full6>0||postFreeze.full6>0},realMoneyPass:false,realStakeEUR:0,decision:(repeat5||validation.full6||postFreeze.full6)?'AUDIT_SIGNAL':'NEGATIVE',note:'Inducing-point RBF temporal GP approximation. Hyperparameters frozen before any 2023+ evaluation. No retrospective result authorizes real money.'};
fs.mkdirSync(path.dirname(OUT),{recursive:true}); fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n'); console.log(JSON.stringify(out,null,2));
