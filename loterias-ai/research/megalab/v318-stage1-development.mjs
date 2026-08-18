#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const PREREG=`${ROOT}/data/research/metapleno-v318-preregister.json`;
const AMEND=`${ROOT}/data/research/metapleno-v318-preexecution-amendment.json`;
const OUT=`${ROOT}/data/research/metapleno-v318-stage1-development.json`;
const prereg=JSON.parse(fs.readFileSync(PREREG,'utf8'));
const amend=JSON.parse(fs.readFileSync(AMEND,'utf8'));
if(prereg.version!=='v318'||prereg.status!=='PREREGISTERED_BEFORE_EXECUTION')throw new Error('v318 preregistration missing or drifted');
if(amend.status!=='BINDING_PRE_EXECUTION_CORRECTION'||amend.executionStateAtAmendment?.candidateEvaluationRun!==false)throw new Error('binding v318 pre-execution amendment missing');
if(prereg.temporalProtocol?.developmentEnd!=='2018-12-31')throw new Error('development boundary drift');
if(prereg.guards?.realMoneyPass!==false||Number(prereg.guards?.realStakeEUR)!==0)throw new Error('real-money gate drift');

const GAMES=['bonoloto','primitiva'];
const DEV_END='2018-12-31';
const p0=6/49;
const WINDOWS=prereg.frozenGrid.windows.map(Number);
const PRIORS=prereg.frozenGrid.priorStrengths.map(Number);
const CROSS=prereg.frozenGrid.crossWeights.map(Number);
const MIN_EVAL=Number(prereg.developmentGate.minimumEvaluatedDraws);

function choose(n,k){if(k<0||k>n)return 0;k=Math.min(k,n-k);let x=1;for(let i=1;i<=k;i++)x=x*(n-k+i)/i;return x;}
const P5PLUS=(choose(6,5)*choose(43,3)+choose(6,6)*choose(43,2))/choose(49,8);
const P6=choose(43,2)/choose(49,8);

function loadDevelopment(game){
  const dir=`${ROOT}/data/archive/${game}`;
  const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)&&Number(f.slice(0,4))<=2018).sort();
  const opened=[];let rows=[];
  for(const file of files){
    const year=Number(file.slice(0,4));
    if(year>2018)throw new Error(`future file guard ${game}/${file}`);
    const doc=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
    opened.push(file);
    const rec=Array.isArray(doc)?doc:(doc.records||[]);
    for(const r of rec){
      const date=String(r.drawDate||'').slice(0,10),main=(r.result?.main||[]).map(Number);
      if(date&&date<=DEV_END&&main.length===6&&new Set(main).size===6&&main.every(n=>Number.isInteger(n)&&n>=1&&n<=49))rows.push({date,main:main.slice().sort((a,b)=>a-b)});
    }
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  return {rows,opened};
}
const data=Object.fromEntries(GAMES.map(g=>[g,loadDevelopment(g)]));
if(Object.values(data).some(x=>x.opened.some(f=>Number(f.slice(0,4))>2018)))throw new Error('validation file touched');

function counts(rows,endExclusive,window){
  const start=endExclusive-window;
  if(start<0)return null;
  const c=new Int32Array(50);
  for(let i=start;i<endExclusive;i++)for(const n of rows[i].main)c[n]++;
  return c;
}
function otherIndexBefore(rows,date){
  let lo=0,hi=rows.length;
  while(lo<hi){const m=(lo+hi)>>1;if(rows[m].date<date)lo=m+1;else hi=m;}return lo;
}
function rankPool(ownCounts,otherCounts,window,prior,crossWeight){
  const denom=window+prior;
  const se=Math.sqrt(p0*(1-p0)/denom);
  const scored=[];
  for(let n=1;n<=49;n++){
    const ownMean=(ownCounts[n]+prior*p0)/denom;
    const otherMean=(otherCounts[n]+prior*p0)/denom;
    const ownZ=(ownMean-p0)/se,otherZ=(otherMean-p0)/se;
    scored.push({n,score:ownZ+crossWeight*otherZ});
  }
  scored.sort((a,b)=>b.score-a.score||a.n-b.n);
  return scored.slice(0,8).map(x=>x.n).sort((a,b)=>a-b);
}
function hits(pool,winning){const s=new Set(pool);let h=0;for(const n of winning)if(s.has(n))h++;return h;}

function evaluate(game,window,prior,crossWeight){
  const own=data[game].rows,other=data[game==='bonoloto'?'primitiva':'bonoloto'].rows;
  let evaluated=0,fivePlus=0,fullSix=0,sumHits=0;
  const events=[];const hash=crypto.createHash('sha256');
  for(let i=window;i<own.length;i++){
    const target=own[i];
    const oi=otherIndexBefore(other,target.date);
    if(oi<window)continue;
    const oc=counts(own,i,window),xc=counts(other,oi,window);
    if(!oc||!xc)continue;
    const pool=rankPool(oc,xc,window,prior,crossWeight),h=hits(pool,target.main);
    evaluated++;sumHits+=h;hash.update(`${target.date}:${pool.join(',')}\n`);
    if(h>=5){fivePlus++;events.push({date:target.date,hits:h,pool,winning:target.main});}
    if(h===6)fullSix++;
  }
  return {game,window,priorStrength:prior,crossWeight,evaluatedDraws:evaluated,fivePlusPoolHits:fivePlus,fullSixPoolHits:fullSix,meanPoolHits:evaluated?sumHits/evaluated:0,matchedRandomExpectedFivePlus:evaluated*P5PLUS,matchedRandomExpectedFullSix:evaluated*P6,behaviorHash:hash.digest('hex'),events};
}

const all=[];
for(const game of GAMES)for(const window of WINDOWS)for(const prior of PRIORS)for(const crossWeight of CROSS)all.push(evaluate(game,window,prior,crossWeight));
const byKey=new Map(all.map(x=>[`${x.game}|${x.window}|${x.priorStrength}|${x.crossWeight}`,x]));
for(const x of all){
  const nested=byKey.get(`${x.game}|${x.window}|${x.priorStrength}|0`);
  x.nestedSameGameFivePlus=nested?.fivePlusPoolHits??null;
  x.fivePlusExcessOverNested=x.crossWeight===0?0:x.fivePlusPoolHits-(nested?.fivePlusPoolHits??0);
  x.fivePlusExcessOverRandom=x.fivePlusPoolHits-x.matchedRandomExpectedFivePlus;
  x.developmentGatePass=x.crossWeight>0&&x.evaluatedDraws>=MIN_EVAL&&x.fivePlusExcessOverNested>=Number(prereg.developmentGate.minimumAbsoluteFivePlusExcessOverNested)&&x.fivePlusExcessOverRandom>0;
}

const selectedByGame={};
for(const game of GAMES){
  const candidates=all.filter(x=>x.game===game&&x.developmentGatePass).sort((a,b)=>b.fivePlusExcessOverNested-a.fivePlusExcessOverNested||b.fivePlusPoolHits-a.fivePlusPoolHits||b.fullSixPoolHits-a.fullSixPoolHits||b.meanPoolHits-a.meanPoolHits||a.window-b.window||a.priorStrength-b.priorStrength||a.crossWeight-b.crossWeight);
  const seen=new Set(),sel=[];
  for(const c of candidates){if(seen.has(c.behaviorHash))continue;seen.add(c.behaviorHash);sel.push(c);if(sel.length>=Number(prereg.frozenGrid.maximumSelectedCrossGameCandidatesPerGameAfterDevelopment))break;}
  selectedByGame[game]=sel.map(({events,...x})=>({...x,eventDates:events.map(e=>e.date)}));
}
const selectedTotal=Object.values(selectedByGame).reduce((s,a)=>s+a.length,0);
const topByGame={};
for(const game of GAMES)topByGame[game]=all.filter(x=>x.game===game).sort((a,b)=>b.fivePlusExcessOverNested-a.fivePlusExcessOverNested||b.fivePlusPoolHits-a.fivePlusPoolHits||b.meanPoolHits-a.meanPoolHits).slice(0,8).map(({events,...x})=>({...x,eventDates:events.map(e=>e.date)}));

const out={
  generatedAt:new Date().toISOString(),version:'v318-stage1-development',family:prereg.family,
  status:selectedTotal?'DEVELOPMENT_SIGNAL_CANDIDATES_FROZEN_FOR_VALIDATION':'CLOSED_NO_DEVELOPMENT_SIGNAL',
  amendmentApplied:amend.version,
  temporalIsolation:{developmentEnd:DEV_END,openedFiles:Object.fromEntries(GAMES.map(g=>[g,data[g].opened])),validationTouched:false,blindOosTouched:false,postFreezeTouched:false},
  exactMatchedNull:{poolSize:8,fivePlusProbability:P5PLUS,fullSixProbability:P6},
  grid:{windows:WINDOWS,priorStrengths:PRIORS,crossWeights:CROSS,logicalConfigurations:all.length},
  selectedByGame,selectedTotal,topDevelopment:topByGame,
  guards:{retuningPerformed:false,realMoneyPass:false,realStakeEUR:0,maximumTheoreticalCostEURPerGameDraw:14},
  next:selectedTotal?'run validation 2019-2022 using only these frozen candidate definitions; do not read 2023+':'archive v318; do not read validation or 2023+'
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,selectedTotal,selectedCounts:Object.fromEntries(GAMES.map(g=>[g,selectedByGame[g].length])),best:Object.fromEntries(GAMES.map(g=>[g,topByGame[g][0]||null])),validationTouched:false,realMoneyPass:false},null,2));
