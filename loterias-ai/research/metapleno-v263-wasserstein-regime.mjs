#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai';
const ARCH=path.join(ROOT,'data','archive','bonoloto');
const OUT=path.join(ROOT,'data','research','metapleno-v263-wasserstein-regime.json');
const MAXN=49,POOL=8,COST=14;

function load(){
  let a=[];
  for(const f of fs.readdirSync(ARCH).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    const j=JSON.parse(fs.readFileSync(path.join(ARCH,f),'utf8'));
    for(const r of (j.records||j.draws||[])){
      const date=r.drawDate||r.date;
      const main=(r.result?.main||r.main||r.numbers||[]).map(Number).sort((x,y)=>x-y);
      if(date&&main.length===6&&new Set(main).size===6)a.push({date,main});
    }
  }
  return [...new Map(a.map(x=>[x.date,x])).values()].sort((x,y)=>x.date.localeCompare(y.date));
}
function rawFeat(m){
  const sum=m.reduce((a,b)=>a+b,0),mean=sum/6;
  const var6=m.reduce((a,b)=>a+(b-mean)*(b-mean),0)/6;
  const odd=m.filter(x=>x%2).length,low=m.filter(x=>x<=24).length,range=m[5]-m[0];
  let adjacent=0;for(let i=1;i<6;i++)if(m[i]-m[i-1]===1)adjacent++;
  return [sum,Math.sqrt(var6),odd,low,range,adjacent];
}
function stats(X){
  const p=X[0].length,mu=Array(p).fill(0),sd=Array(p).fill(0);
  for(const x of X)for(let j=0;j<p;j++)mu[j]+=x[j]/X.length;
  for(const x of X)for(let j=0;j<p;j++)sd[j]+=(x[j]-mu[j])**2/X.length;
  for(let j=0;j<p;j++)sd[j]=Math.sqrt(sd[j])||1;
  return {mu,sd};
}
function z(x,s){return x.map((v,j)=>(v-s.mu[j])/s.sd[j]);}
function rng(seed){let x=seed>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296;};}
function dirs(k,p=6){
  const r=rng(263001),out=[];
  const fixed=Array.from({length:p},(_,j)=>Array.from({length:p},(_,q)=>j===q?1:0));
  out.push(...fixed);
  while(out.length<k){const v=Array.from({length:p},()=>r()*2-1);const n=Math.sqrt(v.reduce((a,b)=>a+b*b,0))||1;out.push(v.map(x=>x/n));}
  return out.slice(0,k);
}
function proj(x,d){let s=0;for(let j=0;j<d.length;j++)s+=x[j]*d[j];return s;}
function w1(a,b){
  if(!a.length||!b.length)return Infinity;
  const A=[...a].sort((x,y)=>x-y),B=[...b].sort((x,y)=>x-y),m=Math.max(A.length,B.length);
  let s=0;
  for(let i=0;i<m;i++){
    const qa=A[Math.min(A.length-1,Math.floor((i+.5)*A.length/m))];
    const qb=B[Math.min(B.length-1,Math.floor((i+.5)*B.length/m))];
    s+=Math.abs(qa-qb);
  }
  return s/m;
}
function swd(A,B,D){let s=0;for(const d of D)s+=w1(A.map(x=>proj(x,d)),B.map(x=>proj(x,d)));return s/D.length;}
function quantile(a,q){const b=[...a].sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.max(0,Math.floor(q*(b.length-1))))];}
function matrix(rows,lo,hi,scale){const out=[];for(let i=lo;i<hi;i++)out.push(z(rawFeat(rows[i].main),scale));return out;}
function gateScore(rows,i,c,scale,D){if(i<c.recent+c.base)return null;return swd(matrix(rows,i-c.recent,i,scale),matrix(rows,i-c.recent-c.base,i-c.recent,scale),D);}
function otPool(rows,i,c,scale,D){
  const recent=matrix(rows,i-c.recent,i,scale);
  const lo=Math.max(0,i-c.recent-c.base);
  const scores=[];
  for(let n=1;n<=MAXN;n++){
    const cond=[];
    for(let t=lo;t<i;t++)if(rows[t].main.includes(n))cond.push(z(rawFeat(rows[t].main),scale));
    const d=cond.length>=8?swd(recent,cond,D):Infinity;
    scores.push({n,d,count:cond.length});
  }
  return scores.sort((a,b)=>a.d-b.d||b.count-a.count||a.n-b.n).slice(0,POOL).map(x=>x.n).sort((a,b)=>a-b);
}
function hits(p,t){const s=new Set(t);return p.filter(x=>s.has(x)).length;}

const rows=load();
const scale=stats(rows.filter(r=>r.date<'2019-01-01').map(r=>rawFeat(r.main)));
const cfgs=[];
for(const recent of [20,40,80])for(const base of [160,320])for(const q of [0.95,0.99])for(const projections of [12,24])cfgs.push({recent,base,q,projections});
function threshold(c){
  const D=dirs(c.projections),vals=[];
  for(let i=0;i<rows.length;i++){
    const d=rows[i].date;if(d<'2019-01-01'||d>='2023-01-01')continue;
    const s=gateScore(rows,i,c,scale,D);if(s!=null)vals.push(s);
  }
  return quantile(vals,c.q);
}
function evalEra(c,thr,start,end){
  const D=dirs(c.projections);let draws=0,gated=0,h5=0,h6=0,sum=0;const events=[];
  for(let i=0;i<rows.length;i++){
    const d=rows[i].date;if(d<start||d>=end)continue;
    const s=gateScore(rows,i,c,scale,D);if(s==null)continue;draws++;
    if(s<=thr)continue;gated++;
    const p=otPool(rows,i,c,scale,D),h=hits(p,rows[i].main);sum+=h;
    if(h>=5){h5++;events.push({date:d,wasserstein:s,hits:h,pool:p,truth:rows[i].main});}
    if(h===6)h6++;
  }
  return {draws,gated,gateRate:draws?gated/draws:0,meanHitsWhenGated:gated?sum/gated:0,hit5Plus:h5,full6:h6,events};
}
let ranked=cfgs.map(c=>{const thr=threshold(c);return{c,threshold:thr,selection:evalEra(c,thr,'2019-01-01','2023-01-01')};});
ranked.sort((a,b)=>b.selection.full6-a.selection.full6||b.selection.hit5Plus-a.selection.hit5Plus||b.selection.meanHitsWhenGated-a.selection.meanHitsWhenGated||a.selection.gateRate-b.selection.gateRate);
const frozen=ranked.slice(0,4).map(x=>({...x,validation:evalEra(x.c,x.threshold,'2023-01-01','2025-01-01'),postFreeze:evalEra(x.c,x.threshold,'2025-01-01','9999-12-31')}));
const repeat=frozen.some(x=>x.validation.hit5Plus>0&&x.postFreeze.hit5Plus>0);
const full=frozen.some(x=>x.validation.full6>0||x.postFreeze.full6>0);
const out={version:'v263',engine:'Sliced-Wasserstein Optimal-Transport Regime',family:'SLICED_WASSERSTEIN_OT_REGIME',gameId:'bonoloto',generatedAt:new Date().toISOString(),archiveDraws:rows.length,candidatePool:{nominalConfigurations:cfgs.length,effectiveConfigurations:cfgs.length,frozenConfigurations:frozen.length,poolSize:POOL,combinations:28,theoreticalCostEUR:COST},methodology:'Genuinely transport-based regime detector: sliced 1-Wasserstein distance across fixed deterministic projections of six standardized draw invariants. Scaling is frozen pre-2019; thresholds and hyperparameters are selected only in 2019-2022; 2023-2024 validation and 2025+ post-freeze are untouched. On a pre-draw gate, each number is ranked by the sliced-Wasserstein distance between the current recent regime and its prior conditional draw distribution; the closest eight form the theoretical pool8.',leaders:frozen,signal:{repeat5PlusAcrossEras:repeat,anyOOSFull:full,requiresAudit:repeat||full},decision:(repeat||full)?'AUDIT_SIGNAL':'NEGATIVE',realMoneyPass:false,realStakeEUR:0,note:'Research-only optimal-transport family. No historical anomaly authorizes real-money play.'};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({decision:out.decision,repeat5PlusAcrossEras:repeat,anyOOSFull:full},null,2));
