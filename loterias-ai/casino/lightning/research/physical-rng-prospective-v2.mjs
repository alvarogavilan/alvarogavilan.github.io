#!/usr/bin/env node
import fs from 'node:fs';

const ROOT='loterias-ai/casino/lightning';
const DATA=`${ROOT}/data/casinoorg-lightningroulette-segment-v2.jsonl`;
const FREEZE=`${ROOT}/evidence/authoritative-segment-v2-freeze.json`;
const OUT=`${ROOT}/evidence/physical-rng-prospective-v2-status.json`;
const f=JSON.parse(fs.readFileSync(FREEZE,'utf8')),spec=f.restartedExperiments?.physicalRngV2;
const startMs=Date.parse(f.prospectiveStartsAt),boundary=Number(spec?.fixedRounds),reps=Number(spec?.permutationReplicates),alpha=Number(spec?.familyWiseAlpha),seed=20260818;
if(f.version!=='authoritative-segment-v2-freeze'||!Number.isFinite(startMs)||boundary!==5000||reps!==10000||alpha!==0.01||spec?.noInterimStatisticsRead!==true)throw new Error('physical v2 frozen protocol drift');
const rows=fs.existsSync(DATA)?fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))&&Number(r.winner)>=0&&Number(r.winner)<=36).map(r=>({...r,_ts:Date.parse(r.timestamp??r.ts),winner:Number(r.winner)})).sort((a,b)=>a._ts-b._ts):[];
if(rows.some(r=>!Number.isFinite(r._ts)||r._ts<=startMs))throw new Error('physical v2 segment contains invalid/pre-barrier row');
const used=rows.slice(0,boundary),finalReady=used.length===boundary;
const out={version:'physical-rng-prospective-v2-status',freezeVersion:f.version,prospectiveStartsAt:f.prospectiveStartsAt,sourceSegment:'authoritative-v2',progress:{eligibleRows:rows.length,fixedBoundaryRounds:boundary,roundsUsedForV2:used.length,roundsRemaining:Math.max(0,boundary-used.length),postBoundaryRowsIgnored:Math.max(0,rows.length-boundary)},disclosure:{policy:finalReady?'FIXED_FINAL_AVAILABLE':'ADMINISTRATIVE_PROGRESS_ONLY',observedStatisticsHidden:!finalReady,pValuesHidden:!finalReady,directionHidden:!finalReady},final:null,guards:{newCleanSegmentAfterSourceDiscontinuity:true,fixedFirst5000Only:true,noRetuning:true,noOptionalStopping:true,postBoundaryCannotRescue:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
if(finalReady){
  const seq=Int16Array.from(used.map(r=>r.winner)),N=seq.length,counts=Array(37).fill(0);for(const x of seq)counts[x]++;
  const expected=N/37,chi2=counts.reduce((s,c)=>s+(c-expected)**2/expected,0);
  function gammln(xx){const cof=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.001208650973866179,-0.000005395239384953];let x=xx-1,tmp=x+5.5;tmp-=(x+0.5)*Math.log(tmp);let ser=1.000000000190015;for(let j=0;j<6;j++)ser+=cof[j]/++x;return -tmp+Math.log(2.5066282746310005*ser)}
  function gammq(a,x){if(x<a+1){let ap=a,sum=1/a,del=sum;for(let n=1;n<=200;n++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*3e-14)break}return Math.max(0,Math.min(1,1-sum*Math.exp(-x+a*Math.log(x)-gammln(a))))}let b=x+1-a,c=1/1e-300,d=1/b,h=d;for(let i=1;i<=200;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<3e-14)break}return Math.max(0,Math.min(1,Math.exp(-x+a*Math.log(x)-gammln(a))*h))}
  const uniformP=gammq(18,chi2/2),matchExpected=counts.reduce((s,c)=>s+c*(c-1),0)/(N*(N-1));
  function serialMax(a){let max=0;for(let lag=1;lag<=20;lag++){let m=0;for(let i=lag;i<N;i++)if(a[i]===a[i-lag])m++;const n=N-lag,r=m/n,se=Math.sqrt(Math.max(1e-15,matchExpected*(1-matchExpected)/n));max=Math.max(max,Math.abs(r-matchExpected)/se)}return max}
  const wheel=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26],wi=Array(37);wheel.forEach((n,i)=>wi[n]=i);const dist=(a,b)=>Math.min(Math.abs(wi[a]-wi[b]),37-Math.abs(wi[a]-wi[b]));
  function expRel(maxD){let fav=0;for(let a=0;a<37;a++)for(let b=0;b<37;b++)if(dist(a,b)<=maxD)fav+=a===b?counts[a]*(counts[b]-1):counts[a]*counts[b];return fav/(N*(N-1))}
  const e1=expRel(1),e2=expRel(2);function wheelMax(a){let h1=0,h2=0;for(let i=1;i<N;i++){const d=dist(a[i-1],a[i]);if(d<=1)h1++;if(d<=2)h2++}const n=N-1,r1=h1/n,r2=h2/n,z1=Math.abs(r1-e1)/Math.sqrt(Math.max(1e-15,e1*(1-e1)/n)),z2=Math.abs(r2-e2)/Math.sqrt(Math.max(1e-15,e2*(1-e2)/n));return Math.max(z1,z2)}
  const obsS=serialMax(seq),obsW=wheelMax(seq);function mulberry32(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const rnd=mulberry32(seed),perm=Int16Array.from(seq);let exS=0,exW=0;for(let r=0;r<reps;r++){perm.set(seq);for(let i=N-1;i>0;i--){const j=Math.floor(rnd()*(i+1)),t=perm[i];perm[i]=perm[j];perm[j]=t}if(serialMax(perm)>=obsS-1e-12)exS++;if(wheelMax(perm)>=obsW-1e-12)exW++}
  const tests=[{id:'uniform37',p:uniformP,statistic:chi2},{id:'serial-max20',p:(1+exS)/(reps+1),statistic:obsS},{id:'wheel-neighbour-max',p:(1+exW)/(reps+1),statistic:obsW}],sorted=[...tests].sort((a,b)=>a.p-b.p||a.id.localeCompare(b.id));let cont=true;for(let i=0;i<sorted.length;i++){sorted[i].holmThreshold=alpha/(sorted.length-i);sorted[i].rejected=cont&&sorted[i].p<=sorted[i].holmThreshold;if(!sorted[i].rejected)cont=false}const map=new Map(sorted.map(x=>[x.id,x]));for(const t of tests){t.holmThreshold=map.get(t.id).holmThreshold;t.rejected=map.get(t.id).rejected}
  const any=tests.some(t=>t.rejected);out.final={boundaryRounds:N,tests,multiplicity:{method:'Holm-Bonferroni',familyWiseAlpha:alpha,anyRejected:any},interpretation:any?'ANOMALY_REQUIRES_NEW_INDEPENDENT_REPLICATION':'NO_REPRODUCIBLE_PHYSICAL_ANOMALY_DETECTED',claimAllowed:false,realMoneyAllowed:false};
}
const semantic=JSON.stringify(out);let oldCore=null;if(fs.existsSync(OUT)){const old=JSON.parse(fs.readFileSync(OUT,'utf8'));delete old.generatedAt;oldCore=JSON.stringify(old)}if(oldCore===semantic){console.log(JSON.stringify({changed:false,...out.progress,finalReady}));process.exit(0)}fs.writeFileSync(OUT,JSON.stringify({...out,generatedAt:new Date().toISOString()},null,2)+'\n');console.log(JSON.stringify({changed:true,...out.progress,finalReady},null,2));
