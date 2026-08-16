#!/usr/bin/env node
/** v239 — Lagged Tensor CP Decomposition (Bonoloto). Research only. */
import fs from 'node:fs';
import path from 'node:path';
const ROOT='loterias-ai', ARCH=path.join(ROOT,'data','archive','bonoloto'), OUT=path.join(ROOT,'data','research','metapleno-v239-lagged-tensor-cp.json');
const MAXN=49, LINES=30, COST=15;
function load(){const rows=[];for(const f of fs.readdirSync(ARCH).filter(f=>/^\d{4}\.json$/.test(f)).sort()){const j=JSON.parse(fs.readFileSync(path.join(ARCH,f),'utf8'));for(const r of (j.records||j.draws||[])){const date=r.drawDate||r.date;const main=(r.result?.main||r.main||r.numbers||[]).map(Number).sort((a,b)=>a-b);if(date&&main.length===6&&main.every(n=>n>=1&&n<=49))rows.push({date,main});}}return [...new Map(rows.map(r=>[r.date,r])).values()].sort((a,b)=>a.date.localeCompare(b.date));}
function normCol(M,r){let s=0;for(let i=0;i<M.length;i++)s+=M[i][r]*M[i][r];s=Math.sqrt(s)||1;for(let i=0;i<M.length;i++)M[i][r]/=s}
function fitCP(rows,rank,maxLag,window){const X=rows.slice(-window);const A=Array.from({length:MAXN},(_,i)=>Array.from({length:rank},(_,r)=>0.2+Math.abs(Math.sin((i+1)*(r+1)*1.173))));const B=Array.from({length:MAXN},(_,i)=>Array.from({length:rank},(_,r)=>0.2+Math.abs(Math.cos((i+2)*(r+1)*0.917))));const C=Array.from({length:maxLag},(_,l)=>Array.from({length:rank},(_,r)=>0.2+1/(1+l+r+1)));
 const T=Array.from({length:maxLag},()=>Array.from({length:MAXN},()=>new Float64Array(MAXN)));
 for(let t=maxLag;t<X.length;t++){for(let l=1;l<=maxLag;l++){for(const n of X[t].main)for(const m of X[t-l].main)T[l-1][n-1][m-1]++;}}
 for(let it=0;it<8;it++){
  for(let r=0;r<rank;r++){
   for(let n=0;n<MAXN;n++){let s=0;for(let l=0;l<maxLag;l++)for(let m=0;m<MAXN;m++)s+=T[l][n][m]*B[m][r]*C[l][r];A[n][r]=1e-9+s}
   normCol(A,r);
   for(let m=0;m<MAXN;m++){let s=0;for(let l=0;l<maxLag;l++)for(let n=0;n<MAXN;n++)s+=T[l][n][m]*A[n][r]*C[l][r];B[m][r]=1e-9+s}
   normCol(B,r);
   for(let l=0;l<maxLag;l++){let s=0;for(let n=0;n<MAXN;n++)for(let m=0;m<MAXN;m++)s+=T[l][n][m]*A[n][r]*B[m][r];C[l][r]=1e-9+s}
   normCol(C,r);
  }
 }
 return{A,B,C,rank,maxLag};}
function scoreNext(history,model){const s=Array(MAXN).fill(0);for(let n=0;n<MAXN;n++)for(let r=0;r<model.rank;r++){let ctx=0;for(let l=1;l<=model.maxLag;l++){const d=history[history.length-l];if(!d)continue;let z=0;for(const m of d.main)z+=model.B[m-1][r];ctx+=model.C[l-1][r]*z}s[n]+=model.A[n][r]*ctx}return s}
function chooseLines(scores){const pool=Array.from({length:MAXN},(_,i)=>i+1).sort((a,b)=>scores[b-1]-scores[a-1]||a-b).slice(0,9);const out=[];for(let a=0;a<4;a++)for(let b=a+1;b<5;b++)for(let c=b+1;c<6;c++)for(let d=c+1;d<7;d++)for(let e=d+1;e<8;e++)for(let f=e+1;f<9;f++){const line=[pool[a],pool[b],pool[c],pool[d],pool[e],pool[f]];out.push({line,v:line.reduce((q,n)=>q+scores[n-1],0)})}return out.sort((x,y)=>y.v-x.v||x.line.join(',').localeCompare(y.line.join(','))).slice(0,LINES).map(x=>x.line)}
function evalEra(all,model,start,end){let n=0,h5=0,h6=0,sum=0;const hitDates=[];for(let i=model.maxLag;i<all.length;i++){const d=all[i];if(d.date<start||d.date>=end)continue;const lines=chooseLines(scoreNext(all.slice(0,i),model)),truth=new Set(d.main);let best=0;for(const line of lines)best=Math.max(best,line.reduce((q,x)=>q+truth.has(x),0));n++;sum+=best;if(best>=5){h5++;hitDates.push({date:d.date,best})}if(best===6)h6++}return{n,meanBest:n?sum/n:0,hit5Plus:h5,full6:h6,hitDates}}
const rows=load(),pre2019=rows.filter(r=>r.date<'2019-01-01');
const configs=[];for(const rank of [2,3,4])for(const maxLag of [2,4,6])for(const window of [365,730])configs.push({rank,maxLag,window});
const trainResults=[];for(const cfg of configs){const model=fitCP(pre2019,cfg.rank,cfg.maxLag,cfg.window);const e=evalEra(rows,model,'2019-01-01','2023-01-01');trainResults.push({cfg,...e})}
trainResults.sort((a,b)=>b.full6-a.full6||b.hit5Plus-a.hit5Plus||b.meanBest-a.meanBest||a.cfg.rank-b.cfg.rank||a.cfg.maxLag-b.cfg.maxLag||a.cfg.window-b.cfg.window);const selected=trainResults[0];
const frozenTrain=rows.filter(r=>r.date<'2023-01-01'),frozen=fitCP(frozenTrain,selected.cfg.rank,selected.cfg.maxLag,selected.cfg.window),validation=evalEra(rows,frozen,'2023-01-01','2025-01-01'),postFreeze=evalEra(rows,frozen,'2025-01-01','9999-12-31');
const repeat=validation.hit5Plus>0&&postFreeze.hit5Plus>0;const out={version:'v239',engine:'Lagged Tensor CP Decomposition',family:'LAGGED_DRAW_NUMBER_TENSOR_CP',gameId:'bonoloto',generatedAt:new Date().toISOString(),archiveDraws:rows.length,candidatePool:{nominalConfigurations:configs.length,effectiveConfigurations:configs.length,poolSize:9,linesPerDraw:LINES,theoreticalCostEUR:COST},selection:{criterion:'pre-2023 only: full6 > hit5+ > meanBest > lower complexity',selected:selected.cfg,train:{n:selected.n,meanBest:selected.meanBest,hit5Plus:selected.hit5Plus,full6:selected.full6}},validation:{period:'2023-2024',...validation},postFreeze:{period:'2025+',...postFreeze},signal:{repeat5PlusAcrossEras:repeat,fullAcrossEras:validation.full6>0&&postFreeze.full6>0,requiresAudit:repeat||validation.full6>0||postFreeze.full6>0},decision:(repeat||validation.full6||postFreeze.full6)?'AUDIT_SIGNAL':'NEGATIVE',realMoneyPass:false,realStakeEUR:0,note:'Third-order lagged tensor factorization; selection is pre-2023 only and frozen thereafter. Retrospective evidence never authorizes real money.'};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));