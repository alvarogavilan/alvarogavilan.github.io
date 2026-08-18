#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const FREEZE=`${ROOT}/data/research/metapleno-v318-validation-freeze.json`;
const AMEND=`${ROOT}/data/research/metapleno-v318-preexecution-amendment.json`;
const STAGE1=`${ROOT}/data/research/metapleno-v318-stage1-development.json`;
const OUT=`${ROOT}/data/research/metapleno-v318-stage2-validation.json`;
const freezeRaw=fs.readFileSync(FREEZE,'utf8');
const freeze=JSON.parse(freezeRaw),amend=JSON.parse(fs.readFileSync(AMEND,'utf8')),stage1=JSON.parse(fs.readFileSync(STAGE1,'utf8'));
if(freeze.status!=='FROZEN_BEFORE_VALIDATION_READ'||freeze.version!=='v318-validation-freeze-v1')throw new Error('validation freeze invalid');
if(amend.status!=='BINDING_PRE_EXECUTION_CORRECTION')throw new Error('binding amendment missing');
if(stage1.status!=='DEVELOPMENT_SIGNAL_CANDIDATES_FROZEN_FOR_VALIDATION')throw new Error('stage1 did not authorize validation');
if(freeze.temporalCustody?.validationReadBeforeFreeze!==false||freeze.temporalCustody?.blindOosReadBeforeFreeze!==false)throw new Error('custody drift');
if(freeze.guards?.retuningAllowed!==false||freeze.guards?.realMoneyPass!==false||Number(freeze.guards?.realStakeEUR)!==0)throw new Error('safety drift');

const START='2019-01-01',END='2022-12-31',p0=6/49;
const GAMES=['bonoloto','primitiva'];
function choose(n,k){if(k<0||k>n)return 0;k=Math.min(k,n-k);let x=1;for(let i=1;i<=k;i++)x=x*(n-k+i)/i;return x;}
const P5PLUS=(choose(6,5)*choose(43,3)+choose(6,6)*choose(43,2))/choose(49,8),P6=choose(43,2)/choose(49,8);

function loadThrough2022(game){
  const dir=`${ROOT}/data/archive/${game}`;
  const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)&&Number(f.slice(0,4))<=2022).sort();
  let rows=[];const opened=[];
  for(const file of files){
    if(Number(file.slice(0,4))>2022)throw new Error('blind OOS file touched');
    const doc=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));opened.push(file);
    for(const r of (Array.isArray(doc)?doc:(doc.records||[]))){
      const date=String(r.drawDate||'').slice(0,10),main=(r.result?.main||[]).map(Number);
      if(date&&date<=END&&main.length===6&&new Set(main).size===6&&main.every(n=>Number.isInteger(n)&&n>=1&&n<=49))rows.push({date,main:main.slice().sort((a,b)=>a-b)});
    }
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));return{rows,opened};
}
const data=Object.fromEntries(GAMES.map(g=>[g,loadThrough2022(g)]));

function idxBefore(rows,date){let lo=0,hi=rows.length;while(lo<hi){const m=(lo+hi)>>1;if(rows[m].date<date)lo=m+1;else hi=m;}return lo;}
function counts(rows,endExclusive,window){if(endExclusive<window)return null;const c=new Int32Array(50);for(let i=endExclusive-window;i<endExclusive;i++)for(const n of rows[i].main)c[n]++;return c;}
function poolFor(own,other,window,prior,crossWeight){
  const denom=window+prior,se=Math.sqrt(p0*(1-p0)/denom),scored=[];
  for(let n=1;n<=49;n++){
    const ownZ=(((own[n]+prior*p0)/denom)-p0)/se;
    const otherZ=(((other[n]+prior*p0)/denom)-p0)/se;
    scored.push({n,s:ownZ+crossWeight*otherZ});
  }
  scored.sort((a,b)=>b.s-a.s||a.n-b.n);return scored.slice(0,8).map(x=>x.n).sort((a,b)=>a-b);
}
function hit(pool,win){const s=new Set(pool);return win.reduce((n,x)=>n+s.has(x),0);}
function evaluate(game,window,prior,crossWeight){
  const own=data[game].rows,other=data[game==='bonoloto'?'primitiva':'bonoloto'].rows;
  let evaluated=0,fivePlus=0,fullSix=0,sumHits=0;const events=[];const bh=crypto.createHash('sha256');
  for(const target of own){
    if(target.date<START||target.date>END)continue;
    const oi=idxBefore(own,target.date),xi=idxBefore(other,target.date);
    if(oi<window||xi<window)continue;
    const oc=counts(own,oi,window),xc=counts(other,xi,window),pool=poolFor(oc,xc,window,prior,crossWeight),h=hit(pool,target.main);
    evaluated++;sumHits+=h;bh.update(`${target.date}:${pool.join(',')}\n`);
    if(h>=5){fivePlus++;events.push({date:target.date,hits:h,pool,winning:target.main});}
    if(h===6)fullSix++;
  }
  return {game,window,priorStrength:prior,crossWeight,evaluatedDraws:evaluated,fivePlusPoolHits:fivePlus,fullSixPoolHits:fullSix,meanPoolHits:evaluated?sumHits/evaluated:0,matchedRandomExpectedFivePlus:evaluated*P5PLUS,matchedRandomExpectedFullSix:evaluated*P6,validationBehaviorHash:bh.digest('hex'),events};
}

const frozenCandidates=freeze.candidates;
const stage1Keys=new Set(Object.values(stage1.selectedByGame||{}).flat().map(x=>`${x.game}|${x.window}|${x.priorStrength}|${x.crossWeight}|${x.behaviorHash}`));
for(const c of frozenCandidates){if(!stage1Keys.has(`${c.game}|${c.window}|${c.priorStrength}|${c.crossWeight}|${c.developmentBehaviorHash}`))throw new Error(`candidate ${c.id} not traceable to frozen Stage1 selection`);}

const results=[];
for(const c of frozenCandidates){
  const cand=evaluate(c.game,Number(c.window),Number(c.priorStrength),Number(c.crossWeight));
  const nested=evaluate(c.game,Number(c.window),Number(c.priorStrength),0);
  const eventDates=[...new Set(cand.events.map(e=>e.date))];
  const result={id:c.id,...cand,nestedSameGame:{fivePlusPoolHits:nested.fivePlusPoolHits,fullSixPoolHits:nested.fullSixPoolHits,meanPoolHits:nested.meanPoolHits,validationBehaviorHash:nested.validationBehaviorHash},fivePlusExcessOverNested:cand.fivePlusPoolHits-nested.fivePlusPoolHits,fivePlusExcessOverRandom:cand.fivePlusPoolHits-cand.matchedRandomExpectedFivePlus,distinctFivePlusDates:eventDates,validationGatePass:(cand.fivePlusPoolHits-nested.fivePlusPoolHits)>0&&(cand.fivePlusPoolHits-cand.matchedRandomExpectedFivePlus)>0&&eventDates.length>=2};
  results.push(result);
}
const survivors=results.filter(x=>x.validationGatePass).map(({events,...x})=>({...x,eventDetails:events}));
const out={generatedAt:new Date().toISOString(),version:'v318-stage2-validation',family:freeze.family,status:survivors.length?'VALIDATION_SURVIVORS_READY_FOR_BLIND_OOS_FREEZE':'CLOSED_VALIDATION_FAILED',freezeSha256:crypto.createHash('sha256').update(freezeRaw).digest('hex'),temporalIsolation:{validationWindow:`${START}/${END}`,openedFiles:Object.fromEntries(GAMES.map(g=>[g,data[g].opened])),blindOosTouched:false,postFreezeTouched:false},exactMatchedNull:{poolSize:8,fivePlusProbability:P5PLUS,fullSixProbability:P6},candidateCount:frozenCandidates.length,results:results.map(({events,...x})=>({...x,eventDates:events.map(e=>e.date)})),survivors,survivorCount:survivors.length,guards:{parametersChangedAfterFreeze:false,retuningPerformed:false,realMoneyPass:false,realStakeEUR:0,maximumTheoreticalCostEURPerGameDraw:14},next:survivors.length?'freeze exact survivors before reading any 2023+ draw':'archive v318; do not read 2023+ OOS'};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({status:out.status,survivorCount:out.survivorCount,survivors:survivors.map(x=>({id:x.id,game:x.game,fivePlus:x.fivePlusPoolHits,nested:x.nestedSameGame.fivePlusPoolHits,randomExpected:x.matchedRandomExpectedFivePlus,dates:x.distinctFivePlusDates,fullSix:x.fullSixPoolHits})),blindOosTouched:false,realMoneyPass:false},null,2));
