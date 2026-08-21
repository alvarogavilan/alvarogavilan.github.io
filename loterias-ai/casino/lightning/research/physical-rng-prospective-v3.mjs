#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const ROOT='loterias-ai/casino/lightning';
const DATA=`${ROOT}/data/casinoorg-lightningroulette-segment-v2.jsonl`;
const FREEZE=`${ROOT}/evidence/physical-rng-prospective-v3-freeze.json`;
const V2_STATUS=`${ROOT}/evidence/physical-rng-prospective-v2-status.json`;
const OUT=`${ROOT}/evidence/physical-rng-prospective-v3-status.json`;
const f=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(f.version!=='physical-rng-prospective-v3-freeze-v1'||f.activation?.anchorBoundaryRounds!==5000||f.activation?.preRegisteredBeforeV2Final!==true||f.activation?.activationIndependentOfV2Outcome!==true||f.protocol?.fixedReplicationRounds!==5000||f.protocol?.permutationReplicates!==10000||f.protocol?.familyWiseAlpha!==0.01||f.protocol?.noInterimStatisticsRead!==true||f.guards?.realMoneyAllowed!==false)throw Error('physical RNG v3 frozen protocol drift');
const rows=fs.existsSync(DATA)?fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))&&Number(r.winner)>=0&&Number(r.winner)<=36).sort((a,b)=>Date.parse(a.timestamp??a.ts)-Date.parse(b.timestamp??b.ts)):[];
const v2=fs.existsSync(V2_STATUS)?JSON.parse(fs.readFileSync(V2_STATUS,'utf8')):null;
const v2BoundaryFinalized=v2?.progress?.roundsUsedForV2===5000&&v2?.final?.boundaryRounds===5000;
if(rows.length>5000&&!v2BoundaryFinalized)throw Error('physical RNG v3 cannot start before finalized V2 boundary');
const boundaryRows=rows.slice(0,Math.min(5000,rows.length));
const anchorFingerprint=boundaryRows.length===5000?crypto.createHash('sha256').update(boundaryRows.map(r=>`${r.roundId??''}|${r.timestamp??r.ts??''}|${Number(r.winner)}`).join('\n')).digest('hex'):null;
if(fs.existsSync(OUT)){
 const prev=JSON.parse(fs.readFileSync(OUT,'utf8'));
 const prior=prev.activation?.anchorFingerprint||null;
 if(prior&&anchorFingerprint&&prior!==anchorFingerprint)throw Error('physical RNG v3 V2 boundary fingerprint drift');
}
const post=v2BoundaryFinalized?rows.slice(5000):[],used=post.slice(0,5000),ready=used.length===5000;
const out={version:'physical-rng-prospective-v3-status',freezeVersion:f.version,sourceSegment:'authoritative-v2',activation:{anchorBoundaryRounds:5000,preRegisteredBeforeV2Final:true,activationIndependentOfV2Outcome:true,postBoundarySampleOnly:true,v2BoundaryFinalized,anchorFingerprint},progress:{eligibleSegmentRows:rows.length,postV2BoundaryRows:post.length,replicationRoundsUsed:used.length,fixedReplicationRounds:5000,roundsRemaining:Math.max(0,5000-used.length),postReplicationRowsIgnored:Math.max(0,post.length-5000)},disclosure:{policy:ready?'FIXED_FINAL_AVAILABLE':'ADMINISTRATIVE_PROGRESS_ONLY',observedStatisticsHidden:!ready,pValuesHidden:!ready,directionHidden:!ready},final:null,guards:{first5000PostBoundaryOnly:true,noRetuning:true,noOptionalStopping:true,postBoundaryCannotRescue:true,v2BoundaryFingerprintLocked:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
if(ready){
 const seq=Int16Array.from(used.map(r=>Number(r.winner))),N=seq.length,counts=Array(37).fill(0);for(const x of seq)counts[x]++;
 const expected=N/37,chi2=counts.reduce((s,c)=>s+(c-expected)**2/expected,0);
 function gln(xx){const c=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,.001208650973866179,-.000005395239384953];let x=xx-1,t=x+5.5;t-=(x+.5)*Math.log(t);let s=1.000000000190015;for(let j=0;j<6;j++)s+=c[j]/++x;return -t+Math.log(2.5066282746310005*s)}
 function gq(a,x){if(x<a+1){let ap=a,s=1/a,d=s;for(let n=1;n<=200;n++){ap++;d*=x/ap;s+=d;if(Math.abs(d)<Math.abs(s)*3e-14)break}return Math.max(0,Math.min(1,1-s*Math.exp(-x+a*Math.log(x)-gln(a))))}let b=x+1-a,c=1e300,d=1/b,h=d;for(let i=1;i<=200;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<3e-14)break}return Math.max(0,Math.min(1,Math.exp(-x+a*Math.log(x)-gln(a))*h))}
 const uniformP=gq(18,chi2/2),matchExpected=counts.reduce((s,c)=>s+c*(c-1),0)/(N*(N-1));
 function serialMax(a){let mx=0;for(let lag=1;lag<=20;lag++){let m=0;for(let i=lag;i<N;i++)if(a[i]===a[i-lag])m++;const n=N-lag,r=m/n,se=Math.sqrt(Math.max(1e-15,matchExpected*(1-matchExpected)/n));mx=Math.max(mx,Math.abs(r-matchExpected)/se)}return mx}
 const wheel=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26],wi=Array(37);wheel.forEach((n,i)=>wi[n]=i);const dist=(a,b)=>Math.min(Math.abs(wi[a]-wi[b]),37-Math.abs(wi[a]-wi[b]));
 function expRel(k){let fav=0;for(let a=0;a<37;a++)for(let b=0;b<37;b++)if(dist(a,b)<=k)fav+=a===b?counts[a]*(counts[b]-1):counts[a]*counts[b];return fav/(N*(N-1))}
 const e1=expRel(1),e2=expRel(2);function wheelMax(a){let h1=0,h2=0;for(let i=1;i<N;i++){const d=dist(a[i-1],a[i]);if(d<=1)h1++;if(d<=2)h2++}const n=N-1,r1=h1/n,r2=h2/n,z1=Math.abs(r1-e1)/Math.sqrt(Math.max(1e-15,e1*(1-e1)/n)),z2=Math.abs(r2-e2)/Math.sqrt(Math.max(1e-15,e2*(1-e2)/n));return Math.max(z1,z2)}
 function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
 const obsS=serialMax(seq),obsW=wheelMax(seq),rnd=rng(20260821),perm=Int16Array.from(seq);let exS=0,exW=0;for(let r=0;r<10000;r++){perm.set(seq);for(let i=N-1;i>0;i--){const j=Math.floor(rnd()*(i+1)),t=perm[i];perm[i]=perm[j];perm[j]=t}if(serialMax(perm)>=obsS-1e-12)exS++;if(wheelMax(perm)>=obsW-1e-12)exW++}
 const tests=[{id:'uniform37',p:uniformP,statistic:chi2},{id:'serial-max20',p:(1+exS)/10001,statistic:obsS},{id:'wheel-neighbour-max',p:(1+exW)/10001,statistic:obsW}],sorted=[...tests].sort((a,b)=>a.p-b.p||a.id.localeCompare(b.id));let cont=true;for(let i=0;i<sorted.length;i++){sorted[i].holmThreshold=.01/(sorted.length-i);sorted[i].rejected=cont&&sorted[i].p<=sorted[i].holmThreshold;if(!sorted[i].rejected)cont=false}const m=new Map(sorted.map(x=>[x.id,x]));for(const t of tests){t.holmThreshold=m.get(t.id).holmThreshold;t.rejected=m.get(t.id).rejected}const any=tests.some(t=>t.rejected);out.final={boundaryRounds:N,tests,multiplicity:{method:'Holm-Bonferroni',familyWiseAlpha:.01,anyRejected:any},interpretation:any?'INDEPENDENT_REPLICATION_ANOMALY_REQUIRES_FURTHER_PREREGISTERED_CONFIRMATION':'INDEPENDENT_REPLICATION_NO_PHYSICAL_ANOMALY_DETECTED',claimAllowed:false,realMoneyAllowed:false};
}
const core=JSON.stringify(out);let old=null;if(fs.existsSync(OUT)){const x=JSON.parse(fs.readFileSync(OUT,'utf8'));delete x.generatedAt;old=JSON.stringify(x)}if(old===core){console.log(JSON.stringify({changed:false,...out.progress,finalReady:ready}));process.exit(0)}fs.writeFileSync(OUT,JSON.stringify({...out,generatedAt:new Date().toISOString()},null,2)+'\n');console.log(JSON.stringify({changed:true,...out.progress,finalReady:ready},null,2));
