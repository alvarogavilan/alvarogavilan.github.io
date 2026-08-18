#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai/casino/lightning';
const DATA=`${ROOT}/data/casinoorg-lightningroulette.jsonl`;
const FREEZE=`${ROOT}/evidence/physical-rng-prospective-freeze-v1.json`;
const OUT=`${ROOT}/evidence/physical-rng-prospective-status-v1.json`;

const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const startMs=Date.parse(freeze.prospectiveStartsAt);
const boundary=Number(freeze.fixedBoundaryRounds);
const reps=Number(freeze.permutation?.replicates);
const seed=Number(freeze.permutation?.seed);
const alpha=Number(freeze.alphaFamilyWise);
if(freeze.version!=='physical-rng-prospective-freeze-v1')throw new Error('unexpected physical RNG freeze version');
if(!Number.isFinite(startMs))throw new Error('invalid prospectiveStartsAt');
if(boundary!==5000||reps!==10000||alpha!==0.01)throw new Error('frozen boundary/permutation/alpha drift');
if(freeze.guards?.noRetuning!==true||freeze.guards?.noOptionalStopping!==true||freeze.guards?.realMoneyAllowed!==false)throw new Error('physical RNG guards drift');

function ts(r){const v=Date.parse(r.ts??r.timestamp??r.observedAt??r.createdAt);return Number.isFinite(v)?v:null;}
let rows=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map((x,i)=>({...JSON.parse(x),_i:i})).filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))&&Number(r.winner)>=0&&Number(r.winner)<=36).map(r=>({...r,_ts:ts(r),winner:Number(r.winner)}));
if(!rows.every(r=>r._ts!=null))throw new Error('physical RNG prospective requires timestamps');
rows.sort((a,b)=>a._ts-b._ts||a._i-b._i);
const future=rows.filter(r=>r._ts>startMs);
const used=future.slice(0,boundary);
const finalReady=used.length===boundary;

const base={
  version:'physical-rng-prospective-status-v1',
  generatedAt:new Date().toISOString(),
  freezeVersion:freeze.version,
  prospectiveStartsAt:freeze.prospectiveStartsAt,
  progress:{
    eligibleFutureRounds:future.length,
    fixedBoundaryRounds:boundary,
    roundsUsedForV1:used.length,
    roundsRemaining:Math.max(0,boundary-used.length),
    postBoundaryRowsIgnoredForV1:Math.max(0,future.length-boundary),
    firstEligibleAt:future[0]?new Date(future[0]._ts).toISOString():null,
    latestEligibleAt:future.at(-1)?new Date(future.at(-1)._ts).toISOString():null
  },
  disclosure:{
    policy:finalReady?'FIXED_FINAL_AVAILABLE':'ADMINISTRATIVE_PROGRESS_ONLY',
    observedStatisticsHidden:!finalReady,
    pValuesHidden:!finalReady,
    directionHidden:!finalReady
  },
  final:null,
  guards:{
    exploratoryPastExcluded:true,
    fixedFirst5000FutureRowsOnly:true,
    noRetuning:true,
    noOptionalStopping:true,
    postBoundaryRowsMayRescueV1:false,
    automaticBettingAllowed:false,
    realMoneyAllowed:false,
    realStakeEUR:0
  }
};

if(!finalReady){
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(base,null,2)+'\n');
  console.log(JSON.stringify({phase:'ACCUMULATING_BLINDED',...base.progress,realMoneyAllowed:false},null,2));
  process.exit(0);
}

const seq=Int16Array.from(used.map(r=>r.winner));
const N=seq.length;
const counts=Array(37).fill(0);for(const x of seq)counts[x]++;
const uniformExpected=N/37;
const chi2=counts.reduce((s,c)=>s+(c-uniformExpected)**2/uniformExpected,0);

// Regularized upper incomplete gamma Q(a,x), Numerical Recipes style.
function gammln(xx){const cof=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.001208650973866179,-0.000005395239384953];let x=xx-1,tmp=x+5.5;tmp-=(x+0.5)*Math.log(tmp);let ser=1.000000000190015;for(let j=0;j<6;j++)ser+=cof[j]/++x;return -tmp+Math.log(2.5066282746310005*ser);}
function gammq(a,x){if(x<0||a<=0)return NaN;if(x<a+1){let ap=a,sum=1/a,del=sum;for(let n=1;n<=200;n++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*3e-14)break;}const gamser=sum*Math.exp(-x+a*Math.log(x)-gammln(a));return Math.max(0,Math.min(1,1-gamser));}let b=x+1-a,c=1/1e-300,d=1/b,h=d;for(let i=1;i<=200;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-300)d=1e-300;c=b+an/c;if(Math.abs(c)<1e-300)c=1e-300;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<3e-14)break;}return Math.max(0,Math.min(1,Math.exp(-x+a*Math.log(x)-gammln(a))*h));}
const uniformP=gammq(36/2,chi2/2);

const matchExpected=counts.reduce((s,c)=>s+c*(c-1),0)/(N*(N-1));
function serialMax(arr){let max=0;for(let lag=1;lag<=20;lag++){let m=0;for(let i=lag;i<N;i++)if(arr[i]===arr[i-lag])m++;const n=N-lag,rate=m/n,se=Math.sqrt(Math.max(1e-15,matchExpected*(1-matchExpected)/n));const z=Math.abs(rate-matchExpected)/se;if(z>max)max=z;}return max;}

const wheel=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const wi=Array(37);wheel.forEach((n,i)=>wi[n]=i);
function wheelDist(a,b){let d=Math.abs(wi[a]-wi[b]);return Math.min(d,37-d);}
function expectedRelation(maxD){let favorable=0;for(let a=0;a<37;a++)for(let b=0;b<37;b++){if(wheelDist(a,b)<=maxD){const pairs=a===b?counts[a]*(counts[b]-1):counts[a]*counts[b];favorable+=pairs;}}return favorable/(N*(N-1));}
const wheelExpected1=expectedRelation(1),wheelExpected2=expectedRelation(2);
function wheelMax(arr){let h1=0,h2=0;for(let i=1;i<N;i++){const d=wheelDist(arr[i-1],arr[i]);if(d<=1)h1++;if(d<=2)h2++;}const n=N-1,r1=h1/n,r2=h2/n;const z1=Math.abs(r1-wheelExpected1)/Math.sqrt(Math.max(1e-15,wheelExpected1*(1-wheelExpected1)/n));const z2=Math.abs(r2-wheelExpected2)/Math.sqrt(Math.max(1e-15,wheelExpected2*(1-wheelExpected2)/n));return Math.max(z1,z2);}
const observedSerial=serialMax(seq),observedWheel=wheelMax(seq);

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const rnd=mulberry32(seed>>>0);
const perm=Int16Array.from(seq);
let exceedSerial=0,exceedWheel=0;
for(let r=0;r<reps;r++){
  perm.set(seq);
  for(let i=N-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=perm[i];perm[i]=perm[j];perm[j]=t;}
  if(serialMax(perm)>=observedSerial-1e-12)exceedSerial++;
  if(wheelMax(perm)>=observedWheel-1e-12)exceedWheel++;
}
const serialP=(1+exceedSerial)/(reps+1),wheelP=(1+exceedWheel)/(reps+1);

const tests=[
  {id:'uniform37',p:uniformP,statistic:chi2},
  {id:'serial-max20',p:serialP,statistic:observedSerial},
  {id:'wheel-neighbour-max',p:wheelP,statistic:observedWheel}
];
const sorted=[...tests].sort((a,b)=>a.p-b.p||a.id.localeCompare(b.id));
let continueReject=true;for(let i=0;i<sorted.length;i++){const threshold=alpha/(sorted.length-i);sorted[i].holmThreshold=threshold;sorted[i].rejected=continueReject&&sorted[i].p<=threshold;if(!sorted[i].rejected)continueReject=false;}
const map=new Map(sorted.map(x=>[x.id,x]));for(const t of tests){const h=map.get(t.id);t.holmThreshold=h.holmThreshold;t.rejected=h.rejected;}
const anyRejected=tests.some(t=>t.rejected);

base.final={
  boundaryRounds:N,
  firstRoundAt:new Date(used[0]._ts).toISOString(),
  lastRoundAt:new Date(used.at(-1)._ts).toISOString(),
  tests,
  uniform:{counts,expectedPerNumber:uniformExpected,chiSquare:chi2,df:36,pValue:uniformP},
  serial:{maxAbsStandardizedDeviationLags1to20:observedSerial,marginalPreservingExpectedMatchRate:matchExpected,pValue:serialP,permutationReplicates:reps},
  wheel:{maxAbsStandardizedNeighbourDeviation:observedWheel,expectedDistanceLE1:wheelExpected1,expectedDistanceLE2:wheelExpected2,pValue:wheelP,permutationReplicates:reps},
  multiplicity:{method:'Holm-Bonferroni',familyWiseAlpha:alpha,anyRejected},
  interpretation:anyRejected?'ANOMALY_REQUIRES_INDEPENDENT_REPLICATION_NOT_BETTING':'NO_REPRODUCIBLE_PHYSICAL_RNG_ANOMALY_DETECTED_IN_V1',
  claimAllowed:false,
  replicationRequiredBeforeAnyClaim:anyRejected,
  realMoneyAllowed:false
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(base,null,2)+'\n');
console.log(JSON.stringify({phase:'FIXED_FINAL_AVAILABLE',tests:tests.map(t=>({id:t.id,p:t.p,holmThreshold:t.holmThreshold,rejected:t.rejected})),interpretation:base.final.interpretation,realMoneyAllowed:false},null,2));
