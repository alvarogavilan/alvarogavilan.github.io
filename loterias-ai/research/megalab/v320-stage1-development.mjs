#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const SPEC=`${ROOT}/data/research/metapleno-v320-preregister.json`;
const OUT=`${ROOT}/data/research/metapleno-v320-stage1-development.json`;
const spec=JSON.parse(fs.readFileSync(SPEC,'utf8'));
if(spec.version!=='v320'||spec.status!=='PREREGISTERED_BEFORE_EXECUTION')throw new Error('v320 preregistration drift');
if(spec.temporalProtocol?.developmentEnd!=='2018-12-31')throw new Error('development boundary drift');
if(spec.guards?.realMoneyPass!==false||Number(spec.guards?.realStakeEUR)!==0)throw new Error('real-money gate drift');

const GAMES=['bonoloto','primitiva'];
const END='2018-12-31';
const WINDOWS=spec.frozenGrid.windows.map(Number);
const ALPHAS=spec.frozenGrid.dirichletAlpha.map(Number);
const MIN_EVAL=Number(spec.developmentGate.minimumEvaluatedDraws);
const MIN_EXCESS=Number(spec.developmentGate.minimumAbsoluteFivePlusExcessOverFrequencyBaseline);

function choose(n,k){if(k<0||k>n)return 0;k=Math.min(k,n-k);let x=1;for(let i=1;i<=k;i++)x=x*(n-k+i)/i;return x;}
const P5PLUS=(choose(6,5)*choose(43,3)+choose(6,6)*choose(43,2))/choose(49,8);
const P6=choose(43,2)/choose(49,8);

function gapVector(main){
  const x=[...main].map(Number).sort((a,b)=>a-b);
  if(x.length!==6||new Set(x).size!==6||x.some(n=>!Number.isInteger(n)||n<1||n>49))throw new Error('invalid 6of49 row');
  const g=[x[0]-1];
  for(let i=1;i<6;i++)g.push(x[i]-x[i-1]-1);
  g.push(49-x[5]);
  if(g.length!==7||g.some(v=>v<0)||g.reduce((a,b)=>a+b,0)!==43)throw new Error('gap bijection failure');
  return g;
}
function loadDevelopment(game){
  const dir=`${ROOT}/data/archive/${game}`;
  const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)&&Number(f.slice(0,4))<=2018).sort();
  const opened=[];let rows=[];
  for(const f of files){
    if(Number(f.slice(0,4))>2018)throw new Error('validation file touched');
    const d=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));opened.push(f);
    for(const r of (Array.isArray(d)?d:(d.records||[]))){
      const date=String(r.drawDate||'').slice(0,10),main=(r.result?.main||[]).map(Number).sort((a,b)=>a-b);
      if(date&&date<=END&&main.length===6&&new Set(main).size===6&&main.every(n=>Number.isInteger(n)&&n>=1&&n<=49))rows.push({date,main,gaps:gapVector(main)});
    }
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));return{rows,opened};
}
function initCounts(rows,W){
  const gap=Array.from({length:7},()=>new Int32Array(44)),num=new Int32Array(50);
  for(let i=0;i<W;i++){for(let p=0;p<7;p++)gap[p][rows[i].gaps[p]]++;for(const n of rows[i].main)num[n]++;}
  return{gap,num};
}
function rollCounts(state,remove,add){
  for(let p=0;p<7;p++){
    const a=state.gap[p],rg=remove.gaps[p],ag=add.gaps[p];if(a[rg]<=0)throw new Error('gap rolling underflow');a[rg]--;a[ag]++;
  }
  for(const n of remove.main){if(state.num[n]<=0)throw new Error('number rolling underflow');state.num[n]--;}
  for(const n of add.main)state.num[n]++;
}
function gapMarginals(gapCounts,W,alpha){
  const q=Array.from({length:7},()=>new Float64Array(44));
  const den=W+44*alpha;
  for(let p=0;p<7;p++)for(let g=0;g<=43;g++)q[p][g]=(gapCounts[p][g]+alpha)/den;
  const F=Array.from({length:8},()=>new Float64Array(44));F[0][0]=1;
  for(let p=0;p<7;p++)for(let s=0;s<=43;s++)if(F[p][s])for(let g=0;g+s<=43;g++)F[p+1][s+g]+=F[p][s]*q[p][g];
  const B=Array.from({length:8},()=>new Float64Array(44));B[7][0]=1;
  for(let p=6;p>=0;p--)for(let s=0;s<=43;s++)for(let g=0;g+s<=43;g++)B[p][s+g]+=q[p][g]*B[p+1][s];
  const Z=F[7][43];if(!(Z>0))throw new Error('composition normalizer zero');
  const inclusion=new Float64Array(50);
  for(let n=1;n<=49;n++){
    let w=0;
    for(let j=1;j<=6;j++){
      const s=n-j;if(s<0||s>43)continue;
      w+=F[j][s]*B[j][43-s];
    }
    inclusion[n]=w/Z;
  }
  const total=[...inclusion].reduce((a,b)=>a+b,0);if(Math.abs(total-6)>1e-7)throw new Error(`marginal sum ${total} != 6`);
  return inclusion;
}
function top8(scores){const a=[];for(let n=1;n<=49;n++)a.push({n,s:Number(scores[n])});a.sort((x,y)=>y.s-x.s||x.n-y.n);return a.slice(0,8).map(x=>x.n).sort((a,b)=>a-b);}
function hit(pool,winning){const s=new Set(pool);let h=0;for(const n of winning)if(s.has(n))h++;return h;}
function freshMetric(){return{evaluated:0,fivePlus:0,fullSix:0,sumHits:0,events:[],hash:crypto.createHash('sha256')};}
function record(m,date,pool,h,winning){m.evaluated++;m.sumHits+=h;m.hash.update(`${date}:${pool.join(',')}\n`);if(h>=5){m.fivePlus++;m.events.push({date,hits:h,pool,winning});}if(h===6)m.fullSix++;}
function finish(m){return{evaluatedDraws:m.evaluated,fivePlusPoolHits:m.fivePlus,fullSixPoolHits:m.fullSix,meanPoolHits:m.evaluated?m.sumHits/m.evaluated:0,behaviorHash:m.hash.digest('hex'),eventDates:m.events.map(e=>e.date),events:m.events,matchedRandomExpectedFivePlus:m.evaluated*P5PLUS,matchedRandomExpectedFullSix:m.evaluated*P6};}

function runGame(game){
  const {rows,opened}=loadDevelopment(game),windows=[];
  for(const W of WINDOWS){
    if(rows.length<=W)continue;
    const state=initCounts(rows,W),baseline=freshMetric(),metrics=new Map(ALPHAS.map(a=>[a,freshMetric()]));
    for(let t=W;t<rows.length;t++){
      const target=rows[t];
      const freq=new Float64Array(50);for(let n=1;n<=49;n++)freq[n]=(state.num[n]+1)/(W+2);
      const basePool=top8(freq),baseHits=hit(basePool,target.main);record(baseline,target.date,basePool,baseHits,target.main);
      for(const alpha of ALPHAS){const p=gapMarginals(state.gap,W,alpha),pool=top8(p),h=hit(pool,target.main);record(metrics.get(alpha),target.date,pool,h,target.main);}
      if(t+1<rows.length)rollCounts(state,rows[t-W],rows[t]);
    }
    const base=finish(baseline),candidates=[];
    for(const alpha of ALPHAS){
      const r=finish(metrics.get(alpha));
      const c={game,window:W,alpha,...r,frequencyBaseline:{fivePlusPoolHits:base.fivePlusPoolHits,fullSixPoolHits:base.fullSixPoolHits,meanPoolHits:base.meanPoolHits,behaviorHash:base.behaviorHash},fivePlusExcessOverFrequency:r.fivePlusPoolHits-base.fivePlusPoolHits,fivePlusExcessOverRandom:r.fivePlusPoolHits-r.matchedRandomExpectedFivePlus};
      c.developmentGatePass=c.evaluatedDraws>=MIN_EVAL&&c.fivePlusExcessOverFrequency>=MIN_EXCESS&&c.fivePlusExcessOverRandom>0;
      candidates.push(c);
    }
    windows.push({window:W,baseline:{...base,events:undefined},candidates});
  }
  const all=windows.flatMap(w=>w.candidates),eligible=all.filter(c=>c.developmentGatePass).sort((a,b)=>b.fivePlusExcessOverFrequency-a.fivePlusExcessOverFrequency||b.fivePlusPoolHits-a.fivePlusPoolHits||b.fullSixPoolHits-a.fullSixPoolHits||b.meanPoolHits-a.meanPoolHits||a.window-b.window||a.alpha-b.alpha);
  const seen=new Set(),selected=[];
  for(const c of eligible){if(seen.has(c.behaviorHash))continue;seen.add(c.behaviorHash);const {events,...safe}=c;selected.push({...safe,eventDetails:events});if(selected.length>=Number(spec.frozenGrid.maximumDevelopmentSurvivorsPerGame))break;}
  const top=all.sort((a,b)=>b.fivePlusExcessOverFrequency-a.fivePlusExcessOverFrequency||b.fivePlusPoolHits-a.fivePlusPoolHits||b.meanPoolHits-a.meanPoolHits).slice(0,8).map(({events,...c})=>({...c,eventDetails:events}));
  return{game,drawsRead:rows.length,lastDrawRead:rows.at(-1)?.date||null,openedFiles:opened,selected,topDevelopment:top};
}

const games=GAMES.map(runGame),selectedTotal=games.reduce((s,g)=>s+g.selected.length,0);
const out={generatedAt:new Date().toISOString(),version:'v320-stage1-development',family:spec.family,status:selectedTotal?'DEVELOPMENT_SURVIVORS_READY_FOR_VALIDATION_FREEZE':'CLOSED_NO_DEVELOPMENT_SIGNAL',temporalIsolation:{developmentEnd:END,validationTouched:false,blindOosTouched:false,postFreezeTouched:false,openedFiles:Object.fromEntries(games.map(g=>[g.game,g.openedFiles]))},exactMatchedNull:{poolSize:8,fivePlusProbability:P5PLUS,fullSixProbability:P6},grid:{windows:WINDOWS,dirichletAlpha:ALPHAS,logicalConfigurations:WINDOWS.length*ALPHAS.length*GAMES.length},games:games.map(({openedFiles,...g})=>g),selectedTotal,guards:{retuningPerformed:false,realMoneyPass:false,realStakeEUR:0,maximumTheoreticalCostEURPerGameDraw:14},next:selectedTotal?'freeze exact development survivors before opening 2019-2022':'archive v320; do not read validation or OOS'};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({status:out.status,selectedTotal,selected:Object.fromEntries(games.map(g=>[g.game,g.selected.map(x=>({window:x.window,alpha:x.alpha,fivePlus:x.fivePlusPoolHits,frequency:x.frequencyBaseline.fivePlusPoolHits,randomExpected:x.matchedRandomExpectedFivePlus,fullSix:x.fullSixPoolHits,dates:x.eventDates}))])),validationTouched:false,realMoneyPass:false},null,2));
