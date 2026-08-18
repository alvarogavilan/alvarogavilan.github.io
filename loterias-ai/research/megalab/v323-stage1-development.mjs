#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const SPEC=`${ROOT}/data/research/metapleno-v323-preregister.json`;
const OUT=`${ROOT}/data/research/metapleno-v323-stage1-development.json`;
const spec=JSON.parse(fs.readFileSync(SPEC,'utf8'));
if(spec.version!=='v323'||spec.status!=='PREREGISTERED_BEFORE_EXECUTION')throw new Error('v323 preregistration drift');
if(spec.temporalProtocol?.developmentEvaluationStart!=='2010-01-01'||spec.temporalProtocol?.developmentEnd!=='2018-12-31')throw new Error('v323 temporal boundary drift');
if(spec.guards?.realMoneyPass!==false||Number(spec.guards?.realStakeEUR)!==0)throw new Error('v323 real-money guard drift');

const GAMES=['bonoloto','primitiva'];
const START='2010-01-01',END='2018-12-31';
const SCALESETS=spec.frozenGrid.scaleSets.map(a=>a.map(Number));
const WEIGHTS=spec.frozenGrid.weightVectors.map(a=>a.map(Number));
const MIN_EVAL=Number(spec.developmentGate.minimumEvaluatedDraws);
const MIN_EXCESS=Number(spec.developmentGate.mustBeatSameWindowFrequencyByAtLeast);
const MIN_DATES=Number(spec.developmentGate.minimumDistinctFivePlusDates);

function choose(n,k){if(k<0||k>n)return 0;k=Math.min(k,n-k);let x=1;for(let i=1;i<=k;i++)x=x*(n-k+i)/i;return x;}
const P5PLUS=(choose(6,5)*choose(43,3)+choose(6,6)*choose(43,2))/choose(49,8);
const P6=choose(43,2)/choose(49,8);

function loadDevelopment(game){
  const dir=`${ROOT}/data/archive/${game}`;
  const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)&&Number(f.slice(0,4))<=2018).sort();
  const opened=[];let rows=[];
  for(const f of files){
    const y=Number(f.slice(0,4));if(y>2018)throw new Error('v323 attempted validation file');
    const doc=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));opened.push(f);
    for(const r of (Array.isArray(doc)?doc:(doc.records||[]))){
      const date=String(r.drawDate||'').slice(0,10),main=(r.result?.main||[]).map(Number).sort((a,b)=>a-b);
      if(date&&date<=END&&main.length===6&&new Set(main).size===6&&main.every(n=>Number.isInteger(n)&&n>=1&&n<=49))rows.push({date,main});
    }
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  return {rows,opened};
}
function top8(scores){const a=[];for(let n=1;n<=49;n++)a.push({n,s:Number(scores[n]||0)});a.sort((x,y)=>y.s-x.s||x.n-y.n);return a.slice(0,8).map(x=>x.n).sort((a,b)=>a-b);}
function hits(pool,winning){const s=new Set(pool);let h=0;for(const n of winning)if(s.has(n))h++;return h;}
function metric(){return{evaluated:0,fivePlus:0,fullSix:0,sumHits:0,events:[],hash:crypto.createHash('sha256')};}
function record(m,date,pool,h,winning){m.evaluated++;m.sumHits+=h;m.hash.update(`${date}:${pool.join(',')}\n`);if(h>=5){m.fivePlus++;m.events.push({date,hits:h,pool,winning});}if(h===6)m.fullSix++;}
function finish(m){return{evaluatedDraws:m.evaluated,fivePlusPoolHits:m.fivePlus,fullSixPoolHits:m.fullSix,meanPoolHits:m.evaluated?m.sumHits/m.evaluated:0,behaviorHash:m.hash.digest('hex'),eventDates:[...new Set(m.events.map(e=>e.date))],events:m.events,matchedRandomExpectedFivePlus:m.evaluated*P5PLUS,matchedRandomExpectedFullSix:m.evaluated*P6};}

function buildPrefix(rows){
  const p=Array.from({length:50},()=>new Int32Array(rows.length+1));
  for(let i=0;i<rows.length;i++){
    const set=new Set(rows[i].main);
    for(let n=1;n<=49;n++)p[n][i+1]=p[n][i]+(set.has(n)?1:0);
  }
  return p;
}
function rangeCount(pref,n,a,b){return pref[n][b]-pref[n][a];}
function haarPool(pref,t,scales,weights){
  const scores=new Float64Array(50);
  for(let n=1;n<=49;n++){
    let s=0;
    for(let k=0;k<scales.length;k++){
      const h=scales[k];
      const recent=rangeCount(pref,n,t-h,t),prev=rangeCount(pref,n,t-2*h,t-h),total=recent+prev;
      const c=recent/h-prev/h,p=total/(2*h);
      const variance=Math.max(1e-12,p*(1-p)*(2/h));
      s+=weights[k]*(c/Math.sqrt(variance));
    }
    scores[n]=s;
  }
  return top8(scores);
}
function frequencyPool(pref,t,window){const scores=new Float64Array(50);for(let n=1;n<=49;n++)scores[n]=rangeCount(pref,n,t-window,t);return top8(scores);}

function runGame(game){
  const {rows,opened}=loadDevelopment(game),pref=buildPrefix(rows);
  const candidates=[];
  for(let si=0;si<SCALESETS.length;si++)for(let wi=0;wi<WEIGHTS.length;wi++){
    const scales=SCALESETS[si],weights=WEIGHTS[wi],history=2*Math.max(...scales),m=metric(),b=metric();
    for(let t=history;t<rows.length;t++){
      const target=rows[t];if(target.date<START||target.date>END)continue;
      const pool=haarPool(pref,t,scales,weights),base=frequencyPool(pref,t,history);
      record(m,target.date,pool,hits(pool,target.main),target.main);record(b,target.date,base,hits(base,target.main),target.main);
    }
    const r=finish(m),fb=finish(b);
    const c={game,scaleSet:scales,weights,...r,frequencyBaseline:{window:history,fivePlusPoolHits:fb.fivePlusPoolHits,fullSixPoolHits:fb.fullSixPoolHits,meanPoolHits:fb.meanPoolHits,behaviorHash:fb.behaviorHash},fivePlusExcessOverFrequency:r.fivePlusPoolHits-fb.fivePlusPoolHits,fivePlusExcessOverRandom:r.fivePlusPoolHits-r.matchedRandomExpectedFivePlus,distinctFivePlusDates:r.eventDates.length};
    c.developmentGatePass=c.evaluatedDraws>=MIN_EVAL&&c.fivePlusExcessOverFrequency>=MIN_EXCESS&&c.fivePlusExcessOverRandom>0&&c.distinctFivePlusDates>=MIN_DATES;
    candidates.push(c);
  }
  candidates.sort((a,b)=>Number(b.developmentGatePass)-Number(a.developmentGatePass)||b.fivePlusExcessOverFrequency-a.fivePlusExcessOverFrequency||b.fivePlusExcessOverRandom-a.fivePlusExcessOverRandom||b.distinctFivePlusDates-a.distinctFivePlusDates||b.meanPoolHits-a.meanPoolHits||a.scaleSet.join(',').localeCompare(b.scaleSet.join(','))||a.weights.join(',').localeCompare(b.weights.join(',')));
  const selected=[],seen=new Set();
  for(const c of candidates){if(!c.developmentGatePass||seen.has(c.behaviorHash))continue;seen.add(c.behaviorHash);const {events,...safe}=c;selected.push({...safe,eventDetails:events});if(selected.length>=Number(spec.frozenGrid.maximumDevelopmentSurvivorsPerGame))break;}
  const topDevelopment=candidates.slice(0,10).map(({events,...safe})=>({...safe,eventDetails:events}));
  return{game,drawsRead:rows.length,lastDrawRead:rows.at(-1)?.date||null,openedFiles:opened,selected,topDevelopment};
}

const games=GAMES.map(runGame),selectedTotal=games.reduce((s,g)=>s+g.selected.length,0);
const out={generatedAt:new Date().toISOString(),version:'v323-stage1-development',family:spec.family,status:selectedTotal?'DEVELOPMENT_SURVIVORS_READY_FOR_VALIDATION_FREEZE':'CLOSED_NO_DEVELOPMENT_SIGNAL',preregisterSha256:crypto.createHash('sha256').update(fs.readFileSync(SPEC)).digest('hex'),temporalIsolation:{developmentEvaluationStart:START,developmentEnd:END,validationTouched:false,blindOosTouched:false,postFreezeTouched:false,openedFiles:Object.fromEntries(games.map(g=>[g.game,g.openedFiles]))},exactMatchedNull:{poolSize:8,fivePlusProbability:P5PLUS,fullSixProbability:P6},grid:{scaleSets:SCALESETS,weightVectors:WEIGHTS,logicalConfigurationsPerGame:SCALESETS.length*WEIGHTS.length},games:games.map(({openedFiles,...g})=>g),selectedTotal,guards:{retuningPerformed:false,targetLeakageUsed:false,validationTouched:false,blindOosTouched:false,realMoneyPass:false,realStakeEUR:0,maximumTheoreticalCostEURPerGameDraw:14},next:selectedTotal?'freeze exact behavioral survivors before opening 2019-2022 validation':'archive v323; do not read validation or OOS'};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,selectedTotal,games:Object.fromEntries(games.map(g=>[g.game,{selected:g.selected.map(x=>({scaleSet:x.scaleSet,weights:x.weights,fivePlus:x.fivePlusPoolHits,frequency:x.frequencyBaseline.fivePlusPoolHits,randomExpected:x.matchedRandomExpectedFivePlus,dates:x.eventDates}))}])),validationTouched:false,blindOosTouched:false,realMoneyPass:false},null,2));
