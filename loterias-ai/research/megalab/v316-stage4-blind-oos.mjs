#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const R='loterias-ai';
const freezePath=path.join(R,'data/research/metapleno-v316-stage3-freeze.json');
const outPath=path.join(R,'data/research/metapleno-v316-stage4-oos.json');
const freeze=JSON.parse(fs.readFileSync(freezePath,'utf8'));
if(freeze.status!=='FROZEN_READY_FOR_BLIND_OOS'||freeze.validationTouched!==false||freeze.postFreezeTouched!==false||freeze.retuningPerformed!==false) throw new Error('invalid frozen lineage');
if(freeze.realMoneyPass!==false||Number(freeze.realStakeEUR)!==0) throw new Error('real-money gate not fail-closed');

const G={bonoloto:{dir:'bonoloto',max:49,pick:6},primitiva:{dir:'primitiva',max:49,pick:6},euromillones:{dir:'euromillones',max:50,pick:5},'gordo-primitiva':{dir:'gordo-primitiva',max:54,pick:5}};
const H=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
function load(id){const g=G[id],a=[];for(const f of fs.readdirSync(path.join(R,'data/archive',g.dir)).filter(x=>/^\d{4}\.json$/.test(x)).sort()){const j=JSON.parse(fs.readFileSync(path.join(R,'data/archive',g.dir,f)));for(const z of j.records||j.draws||[]){const date=z.drawDate||z.date,main=(z.result?.main||z.main||z.numbers||[]).map(Number).sort((x,y)=>x-y);if(date&&date>='2019-01-01'&&date<'2025-01-01'&&main.length===g.pick)a.push({date,main})}}return[...new Map(a.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date))}
function dist(rows,a,b,max){const v=new Float64Array(max);let total=0;for(let i=a;i<b;i++)for(const n of rows[i].main){v[n-1]++;total++;}const z=total||1;for(let n=0;n<max;n++)v[n]/=z;return v}
function cooc(rows,a,b,max){const c=Array.from({length:max},()=>new Float64Array(max));let draws=0;for(let i=a;i<b;i++){draws++;const s=rows[i].main;for(let x=0;x<s.length;x++)for(let y=x+1;y<s.length;y++){c[s[x]-1][s[y]-1]++;c[s[y]-1][s[x]-1]++}}const z=draws||1;for(let i=0;i<max;i++)for(let j=0;j<max;j++)c[i][j]/=z;return c}
function sinkhorn(src,tgt,cost,eps,iters=10){const n=src.length,K=Array.from({length:n},()=>new Float64Array(n));for(let i=0;i<n;i++)for(let j=0;j<n;j++)K[i][j]=Math.exp(-cost[i][j]/eps)+1e-18;let u=new Float64Array(n).fill(1),v=new Float64Array(n).fill(1);for(let it=0;it<iters;it++){const nu=new Float64Array(n),nv=new Float64Array(n);for(let i=0;i<n;i++){let s=0;for(let j=0;j<n;j++)s+=K[i][j]*v[j];nu[i]=src[i]/Math.max(1e-18,s)}for(let j=0;j<n;j++){let s=0;for(let i=0;i<n;i++)s+=K[i][j]*nu[i];nv[j]=tgt[j]/Math.max(1e-18,s)}u=nu;v=nv}return{K,u,v}}
function predict(rows,idx,g,cfg){const w=cfg.window,recentStart=Math.max(0,idx-w),prevStart=Math.max(0,idx-2*w),src=dist(rows,prevStart,recentStart,g.max),tgt=dist(rows,recentStart,idx,g.max),cc=cfg.cost==='INDEX_PLUS_COOCCURRENCE'?cooc(rows,recentStart,idx,g.max):null,cost=Array.from({length:g.max},(_,i)=>{const r=new Float64Array(g.max);for(let j=0;j<g.max;j++){const base=Math.abs(i-j)/Math.max(1,g.max-1);r[j]=cfg.cost==='INDEX_DISTANCE'?base:Math.min(1,0.7*base+0.3*(1-(cc?.[i]?.[j]||0)))}return r}),{K,u,v}=sinkhorn(src,tgt,cost,cfg.eps),scores=[];for(let j=0;j<g.max;j++){let incoming=0,signed=0;for(let i=0;i<g.max;i++){const m=u[i]*K[i][j]*v[j];incoming+=m;signed+=m*(j-i)/Math.max(1,g.max-1)}const momentum=signed/Math.max(1e-12,incoming),score=tgt[j]+0.35*momentum+0.05*(tgt[j]-src[j]);scores.push([score,j+1])}scores.sort((a,b)=>b[0]-a[0]||a[1]-b[1]);return scores.slice(0,g.pick).map(x=>x[1]).sort((a,b)=>a-b)}
function normalTail(z){const t=1/(1+0.2316419*Math.abs(z));const d=0.3989422804014327*Math.exp(-z*z/2);const p=d*t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));const cdf=z>=0?1-p:p;return Math.max(0,Math.min(1,1-cdf));}
function nullMoments(N,K,n){const mu=n*K/N;const variance=n*(K/N)*(1-K/N)*((N-n)/(N-1));return{mu,variance};}
const byGame={};let any5=false,anyFull=false,anyCorrected=false;
for(const [id,g] of Object.entries(G)){
  const rows=load(id), frozen=freeze.frozenByGame?.[id]||[];
  const oosIdx=rows.map((r,i)=>({r,i})).filter(x=>x.r.date>='2023-01-01'&&x.r.date<'2025-01-01');
  if(!oosIdx.length) throw new Error(`no OOS rows ${id}`);
  const results=[];
  for(const cfg of frozen){
    let totalHits=0,nearFull=0,fivePlus=0,fullMain=0,maxHits=0;const hist={},traj=[],extremeEvents=[];
    for(const {r,i} of oosIdx){
      if(i<Math.max(16,cfg.window*2)) continue;
      const pred=predict(rows,i,g,cfg),hits=pred.filter(x=>r.main.includes(x)).length;
      totalHits+=hits;maxHits=Math.max(maxHits,hits);hist[hits]=(hist[hits]||0)+1;if(hits>=g.pick-1)nearFull++;if(hits>=5)fivePlus++;if(hits===g.pick)fullMain++;if(hits>=Math.max(4,g.pick-1)) extremeEvents.push({date:r.date,prediction:pred,actual:r.main,hits});traj.push(`${r.date}:${pred.join('-')}`);
    }
    const draws=Object.values(hist).reduce((a,b)=>a+b,0), meanHits=totalHits/Math.max(1,draws),nm=nullMoments(g.max,g.pick,g.pick),z=(totalHits-draws*nm.mu)/Math.sqrt(Math.max(1e-12,draws*nm.variance)),pOneSided=normalTail(z);
    results.push({window:cfg.window,eps:cfg.eps,cost:cfg.cost,frozenBehaviorHash:cfg.behaviorHash,oosBehaviorHash:H(traj.join('|')),draws,meanHits,nullExpectedMeanHits:nm.mu,deltaVsNull:meanHits-nm.mu,z,pOneSided,maxHits,nearFull,fivePlus,fullMain,hitHistogram:hist,extremeEvents});
  }
  const sortedP=[...results].sort((a,b)=>a.pOneSided-b.pOneSided);let holmPass=false;for(let i=0;i<sortedP.length;i++){const threshold=0.05/(sortedP.length-i);sortedP[i].holmThreshold=threshold;sortedP[i].holmSignificant=sortedP[i].pOneSided<=threshold;if(sortedP[i].holmSignificant) holmPass=true;else break;}
  const distinctOosBehaviors=new Set(results.map(x=>x.oosBehaviorHash)).size;
  any5 ||= results.some(x=>x.fivePlus>0); anyFull ||= results.some(x=>x.fullMain>0); anyCorrected ||= holmPass;
  byGame[id]={oosDraws:oosIdx.length,frozenCandidates:frozen.length,distinctOosBehaviors,holmAnySignificant:holmPass,maxHits:Math.max(...results.map(x=>x.maxHits),0),nearFullEvents:results.reduce((a,x)=>a+x.nearFull,0),fivePlusEvents:results.reduce((a,x)=>a+x.fivePlus,0),fullMainEvents:results.reduce((a,x)=>a+x.fullMain,0),candidates:results};
}
const auditRequired=any5||anyFull||anyCorrected;
const out={version:'v316-stage4',family:'OPTIMAL_TRANSPORT_REGIME_AUDIT',status:auditRequired?'OOS_SIGNAL_REQUIRES_HARD_AUDIT':'NEGATIVE_OOS_FALSIFIED',freezeManifestHash:freeze.manifestHash,oosWindow:'2023-01-01/2025-01-01',validationTouched:true,postFreezeTouched:false,retuningPerformed:false,repeat5Plus:any5,fullHit:anyFull,correctedStatisticalAnomaly:anyCorrected,auditRequired,byGame,budget:{maximumTheoreticalCostEURPerGameDraw:15},realMoneyPass:false,realStakeEUR:0,generatedAt:new Date().toISOString()};
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,auditRequired,repeat5Plus:any5,fullHit:anyFull,correctedStatisticalAnomaly:anyCorrected,byGame:Object.fromEntries(Object.entries(byGame).map(([k,v])=>[k,{maxHits:v.maxHits,nearFullEvents:v.nearFullEvents,fivePlusEvents:v.fivePlusEvents,fullMainEvents:v.fullMainEvents,holmAnySignificant:v.holmAnySignificant}]))},null,2));
