#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const INPUT='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const OUT='loterias-ai/casino/lightning/evidence/replay-paper-v1.json';
const TRAIN_FRACTION=0.70;
const ALPHA_FAMILY=0.05;
const MODELS=2;
const ALPHA_BONF=ALPHA_FAMILY/MODELS;

const rows=fs.readFileSync(INPUT,'utf8').trim().split(/\n+/).filter(Boolean).map(JSON.parse)
  .filter(r=>r.trainingEligible===true&&r.realMoney===false&&Number.isInteger(r.winner)&&r.winner>=0&&r.winner<=36&&r.roundId&&r.timestamp);
const byId=new Map(); for(const r of rows) byId.set(r.roundId,r);
const data=[...byId.values()].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
if(data.length<500) throw new Error(`Need >=500 authoritative rounds, found ${data.length}`);
const cut=Math.floor(data.length*TRAIN_FRACTION); const train=data.slice(0,cut), test=data.slice(cut);

const counts=Array(37).fill(0); for(const r of train) counts[r.winner]++;
const freqProb=counts.map(c=>(c+1)/(train.length+37));
const topFreq=freqProb.indexOf(Math.max(...freqProb));
const transitions=Array.from({length:37},()=>Array(37).fill(0));
for(let i=1;i<train.length;i++) transitions[train[i-1].winner][train[i].winner]++;
const transProb=transitions.map(row=>{const s=row.reduce((a,b)=>a+b,0);return row.map(c=>(c+1)/(s+37));});

function metrics(name, probsForIndex){let hits=0,ll=0,brier=0;const preds=[];for(let i=0;i<test.length;i++){const p=probsForIndex(i);const y=test[i].winner;let top=0;for(let j=1;j<37;j++)if(p[j]>p[top])top=j;if(top===y)hits++;ll+=-Math.log(Math.max(p[y],1e-15));let br=0;for(let j=0;j<37;j++){const o=j===y?1:0;br+=(p[j]-o)**2;}brier+=br;preds.push({roundId:test[i].roundId,timestamp:test[i].timestamp,winner:y,top1:top});}return{name,n:test.length,hits,accuracy:hits/test.length,logLoss:ll/test.length,brier:brier/test.length,predictionsHash:crypto.createHash('sha256').update(JSON.stringify(preds)).digest('hex')};}
const uniformP=Array(37).fill(1/37);
const uniform=metrics('uniform',()=>uniformP);
const frequency=metrics('train_frequency',()=>freqProb);
const transition=metrics('train_markov1',(i)=>{const globalIndex=cut+i;const prev=data[globalIndex-1]?.winner;return Number.isInteger(prev)?transProb[prev]:freqProb;});

function binomTail(k,n,p){let term=(1-p)**n,sum=0;if(k===0)return 1;for(let x=0;x<=n;x++){if(x>=k)sum+=term;if(x<n)term*=((n-x)/(x+1))*(p/(1-p));}return Math.min(1,sum);}
for(const m of [frequency,transition]){m.vsUniform={accuracyLift:m.accuracy-uniform.accuracy,logLossImprovement:uniform.logLoss-m.logLoss,brierImprovement:uniform.brier-m.brier,oneSidedBinomialP:binomTail(m.hits,m.n,1/37),bonferroniAlpha:ALPHA_BONF};m.statisticallyBeatsUniform=m.vsUniform.oneSidedBinomialP<=ALPHA_BONF&&m.vsUniform.logLossImprovement>0&&m.vsUniform.brierImprovement>0;}
const promoted=[frequency,transition].filter(m=>m.statisticallyBeatsUniform);
const payload={version:'lightning-replay-paper-v1',generatedAt:new Date().toISOString(),purpose:'temporal out-of-sample predictability check; not a betting recommendation',inputRows:data.length,train:{n:train.length,start:train[0].timestamp,end:train.at(-1).timestamp},test:{n:test.length,start:test[0].timestamp,end:test.at(-1).timestamp},protocol:{split:'chronological 70/30',models:['train_frequency','train_markov1'],baseline:'uniform 1/37',smoothing:'Laplace +1',alphaFamily:ALPHA_FAMILY,multiplicity:'Bonferroni',retuningAfterTest:false},models:{uniform,frequency,transition},summary:{promotedModels:promoted.map(x=>x.name),edgeObserved:promoted.length>0,realMoneyPass:false,realStakeEUR:0,next:promoted.length?'require independent future holdout before any stronger claim':'retain null/randomness interpretation and expand prospective corpus'},safety:{authenticationBypassAttempted:false,realMoney:false,bettingRecommendation:false}};
fs.mkdirSync('loterias-ai/casino/lightning/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({inputRows:data.length,train:train.length,test:test.length,frequency:frequency.vsUniform,transition:transition.vsUniform,edgeObserved:payload.summary.edgeObserved,realMoney:false},null,2));
