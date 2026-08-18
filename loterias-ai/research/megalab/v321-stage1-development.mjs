#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const SPEC=`${ROOT}/data/research/metapleno-v321-preregister.json`;
const OUT=`${ROOT}/data/research/metapleno-v321-stage1-development.json`;
const spec=JSON.parse(fs.readFileSync(SPEC,'utf8'));
if(spec.version!=='v321'||spec.status!=='PREREGISTERED_BEFORE_EXECUTION')throw new Error('v321 preregistration drift');
if(spec.temporalProtocol?.developmentEvaluationStart!=='2010-01-01'||spec.temporalProtocol?.developmentEnd!=='2018-12-31')throw new Error('v321 development boundary drift');
if(Number(spec.method?.maximumAnalogueEndpoints)!==512||spec.guards?.computeBoundariesLockedBeforeExecution!==true)throw new Error('v321 compute boundary drift');
if(spec.guards?.realMoneyPass!==false||Number(spec.guards?.realStakeEUR)!==0)throw new Error('v321 real-money guard drift');

const GAMES=['bonoloto','primitiva'];
const START='2010-01-01',END='2018-12-31',MAX_LIBRARY=512;
const CONTEXTS=spec.frozenGrid.contextLengths.map(Number);
const KS=spec.frozenGrid.neighbours.map(Number);
const SIMS=spec.frozenGrid.similarities;
const FREQ_WINDOWS=spec.frozenGrid.frequencyWindows.map(Number);
const MIN_EVAL=Number(spec.developmentGate.minimumEvaluatedDraws);
const MIN_EXCESS=Number(spec.developmentGate.mustBeatMatchedFrequencyBaselineByAtLeast);
const MIN_DATES=Number(spec.developmentGate.minimumDistinctFivePlusDates);

function choose(n,k){if(k<0||k>n)return 0;k=Math.min(k,n-k);let x=1;for(let i=1;i<=k;i++)x=x*(n-k+i)/i;return x;}
const P5PLUS=(choose(6,5)*choose(43,3)+choose(6,6)*choose(43,2))/choose(49,8);
const P6=choose(43,2)/choose(49,8);

function loadDevelopment(game){
  const dir=`${ROOT}/data/archive/${game}`;
  const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)&&Number(f.slice(0,4))<=2018).sort();
  const opened=[];let rows=[];
  for(const f of files){
    if(Number(f.slice(0,4))>2018)throw new Error('v321 validation file touched');
    const d=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));opened.push(f);
    for(const r of (Array.isArray(d)?d:(d.records||[]))){
      const date=String(r.drawDate||'').slice(0,10),main=(r.result?.main||[]).map(Number).sort((a,b)=>a-b);
      if(date&&date<=END&&main.length===6&&new Set(main).size===6&&main.every(n=>Number.isInteger(n)&&n>=1&&n<=49))rows.push({date,main});
    }
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  return{rows,opened};
}

function contextVectors(rows,C){
  const out=Array(rows.length).fill(null);
  const weights=Array.from({length:C},(_,x)=>Math.exp(-x/C));
  for(let i=C;i<rows.length;i++){
    const v=new Float64Array(50);
    for(let r=1;r<=C;r++)for(const n of rows[i-r].main)v[n]+=weights[r-1];
    let norm=0;for(let n=1;n<=49;n++)norm+=v[n]*v[n];norm=Math.sqrt(norm);
    if(!(norm>0))throw new Error('zero v321 context norm');
    for(let n=1;n<=49;n++)v[n]/=norm;
    out[i]=v;
  }
  return out;
}
function dot(a,b){let s=0;for(let n=1;n<=49;n++)s+=a[n]*b[n];return Math.max(0,Math.min(1,s));}
function top8(scores){const a=[];for(let n=1;n<=49;n++)a.push({n,s:Number(scores[n]||0)});a.sort((x,y)=>y.s-x.s||x.n-y.n);return a.slice(0,8).map(x=>x.n).sort((a,b)=>a-b);}
function hits(pool,winning){const s=new Set(pool);let h=0;for(const n of winning)if(s.has(n))h++;return h;}
function baselinePool(rows,t,W){const counts=new Int32Array(50);for(let i=t-W;i<t;i++)for(const n of rows[i].main)counts[n]++;return top8(counts);}
function freshMetric(){return{evaluated:0,fivePlus:0,fullSix:0,sumHits:0,events:[],hash:crypto.createHash('sha256')};}
function record(m,date,pool,h,winning){m.evaluated++;m.sumHits+=h;m.hash.update(`${date}:${pool.join(',')}\n`);if(h>=5)m.events.push({date,hits:h,pool,winning});if(h>=5)m.fivePlus++;if(h===6)m.fullSix++;}
function finish(m){return{evaluatedDraws:m.evaluated,fivePlusPoolHits:m.fivePlus,fullSixPoolHits:m.fullSix,meanPoolHits:m.evaluated?m.sumHits/m.evaluated:0,behaviorHash:m.hash.digest('hex'),eventDates:[...new Set(m.events.map(e=>e.date))],events:m.events,matchedRandomExpectedFivePlus:m.evaluated*P5PLUS,matchedRandomExpectedFullSix:m.evaluated*P6};}

function poolsForTarget(rows,t,vecs,C){
  const target=vecs[t];if(!target)return null;
  const j0=Math.max(C,t-MAX_LIBRARY),neigh=[];
  for(let j=j0;j<t;j++){
    const v=vecs[j];if(!v)continue;
    const cos=dot(target,v),d2=Math.max(0,2-2*cos);
    neigh.push({j,cos,d2});
  }
  if(neigh.length<Math.max(...KS))return null;
  neigh.sort((a,b)=>b.cos-a.cos||b.j-a.j);
  const dists=neigh.map(x=>x.d2).sort((a,b)=>a-b),median=dists[Math.floor(dists.length/2)]||1e-12,gamma=1/Math.max(1e-12,median);
  const pools=new Map();
  for(const K of KS){
    const chosen=neigh.slice(0,K);
    for(const sim of SIMS){
      const score=new Float64Array(50);
      for(const q of chosen){
        const w=sim==='cosine'?Math.max(1e-12,q.cos):Math.exp(-gamma*q.d2);
        for(const n of rows[q.j].main)score[n]+=w;
      }
      pools.set(`${C}|${K}|${sim}`,top8(score));
    }
  }
  return pools;
}

function runGame(game){
  const {rows,opened}=loadDevelopment(game);
  const vecByC=new Map(CONTEXTS.map(C=>[C,contextVectors(rows,C)]));
  const baselineMetrics=new Map(FREQ_WINDOWS.map(F=>[F,freshMetric()]));
  const metrics=new Map();
  for(const C of CONTEXTS)for(const K of KS)for(const sim of SIMS)for(const F of FREQ_WINDOWS)metrics.set(`${C}|${K}|${sim}|${F}`,freshMetric());
  let evalTargets=0;
  for(let t=0;t<rows.length;t++){
    const target=rows[t];if(target.date<START||target.date>END)continue;
    if(FREQ_WINDOWS.some(F=>t<F)||CONTEXTS.some(C=>t<C))continue;
    const baselines=new Map();
    for(const F of FREQ_WINDOWS){const pool=baselinePool(rows,t,F),h=hits(pool,target.main);baselines.set(F,{pool,h});record(baselineMetrics.get(F),target.date,pool,h,target.main);}
    let usable=true;const byC=new Map();
    for(const C of CONTEXTS){const p=poolsForTarget(rows,t,vecByC.get(C),C);if(!p){usable=false;break;}byC.set(C,p);}
    if(!usable)continue;
    evalTargets++;
    for(const C of CONTEXTS)for(const K of KS)for(const sim of SIMS){const pool=byC.get(C).get(`${C}|${K}|${sim}`),h=hits(pool,target.main);for(const F of FREQ_WINDOWS)record(metrics.get(`${C}|${K}|${sim}|${F}`),target.date,pool,h,target.main);}
  }
  const baselines=Object.fromEntries(FREQ_WINDOWS.map(F=>[F,finish(baselineMetrics.get(F))]));
  const candidates=[];
  for(const C of CONTEXTS)for(const K of KS)for(const sim of SIMS)for(const F of FREQ_WINDOWS){
    const r=finish(metrics.get(`${C}|${K}|${sim}|${F}`)),b=baselines[F];
    const c={game,contextLength:C,neighbours:K,similarity:sim,frequencyWindow:F,...r,frequencyBaseline:{fivePlusPoolHits:b.fivePlusPoolHits,fullSixPoolHits:b.fullSixPoolHits,meanPoolHits:b.meanPoolHits,behaviorHash:b.behaviorHash},fivePlusExcessOverFrequency:r.fivePlusPoolHits-b.fivePlusPoolHits,fivePlusExcessOverRandom:r.fivePlusPoolHits-r.matchedRandomExpectedFivePlus,distinctFivePlusDates:r.eventDates.length};
    c.developmentGatePass=c.evaluatedDraws>=MIN_EVAL&&c.fivePlusExcessOverFrequency>=MIN_EXCESS&&c.fivePlusExcessOverRandom>0&&c.distinctFivePlusDates>=MIN_DATES;
    candidates.push(c);
  }
  candidates.sort((a,b)=>b.fivePlusExcessOverFrequency-a.fivePlusExcessOverFrequency||b.fivePlusExcessOverRandom-a.fivePlusExcessOverRandom||b.distinctFivePlusDates-a.distinctFivePlusDates||b.meanPoolHits-a.meanPoolHits||a.contextLength-b.contextLength||a.neighbours-b.neighbours||a.similarity.localeCompare(b.similarity)||a.frequencyWindow-b.frequencyWindow);
  const selected=[],seen=new Set();
  for(const c of candidates){if(!c.developmentGatePass||seen.has(c.behaviorHash))continue;seen.add(c.behaviorHash);const {events,...safe}=c;selected.push({...safe,eventDetails:events});if(selected.length>=Number(spec.frozenGrid.maximumDevelopmentSurvivorsPerGame))break;}
  const top=candidates.slice(0,10).map(({events,...c})=>({...c,eventDetails:events}));
  return{game,drawsRead:rows.length,lastDrawRead:rows.at(-1)?.date||null,developmentTargetsEvaluated:evalTargets,openedFiles:opened,selected,topDevelopment:top};
}

const games=GAMES.map(runGame),selectedTotal=games.reduce((s,g)=>s+g.selected.length,0);
const preregRaw=fs.readFileSync(SPEC);
const out={generatedAt:new Date().toISOString(),version:'v321-stage1-development',family:spec.family,status:selectedTotal?'DEVELOPMENT_SURVIVORS_READY_FOR_VALIDATION_FREEZE':'CLOSED_NO_DEVELOPMENT_SIGNAL',preregisterSha256:crypto.createHash('sha256').update(preregRaw).digest('hex'),temporalIsolation:{developmentEvaluationStart:START,developmentEnd:END,maximumAnalogueEndpoints:MAX_LIBRARY,validationTouched:false,blindOosTouched:false,postFreezeTouched:false,openedFiles:Object.fromEntries(games.map(g=>[g.game,g.openedFiles]))},exactMatchedNull:{poolSize:8,fivePlusProbability:P5PLUS,fullSixProbability:P6},grid:{contextLengths:CONTEXTS,neighbours:KS,similarities:SIMS,frequencyWindows:FREQ_WINDOWS,logicalConfigurationsPerGame:CONTEXTS.length*KS.length*SIMS.length*FREQ_WINDOWS.length},games:games.map(({openedFiles,...g})=>g),selectedTotal,guards:{retuningPerformed:false,targetLeakageUsed:false,validationTouched:false,blindOosTouched:false,realMoneyPass:false,realStakeEUR:0,maximumTheoreticalCostEURPerGameDraw:14},next:selectedTotal?'freeze exact behavioral survivors before opening 2019-2022 validation':'archive v321; do not read validation or OOS'};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,selectedTotal,games:Object.fromEntries(games.map(g=>[g.game,{developmentTargetsEvaluated:g.developmentTargetsEvaluated,selected:g.selected.map(x=>({contextLength:x.contextLength,neighbours:x.neighbours,similarity:x.similarity,frequencyWindow:x.frequencyWindow,fivePlus:x.fivePlusPoolHits,frequency:x.frequencyBaseline.fivePlusPoolHits,randomExpected:x.matchedRandomExpectedFivePlus,dates:x.eventDates}))}])),validationTouched:false,blindOosTouched:false,realMoneyPass:false},null,2));
