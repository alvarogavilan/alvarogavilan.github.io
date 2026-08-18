#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const FREEZE=`${ROOT}/data/research/metapleno-v319-validation-freeze.json`;
const SPEC=`${ROOT}/data/research/metapleno-v319-preregister.json`;
const OUT=`${ROOT}/data/research/metapleno-v319-stage3-validation.json`;
if(!fs.existsSync(FREEZE))throw new Error('v319 validation freeze not yet persisted');
const raw=fs.readFileSync(FREEZE,'utf8'),freeze=JSON.parse(raw),spec=JSON.parse(fs.readFileSync(SPEC,'utf8'));
if(freeze.status!=='FROZEN_BEFORE_VALIDATION_READ'||freeze.temporalCustody?.validationReadBeforeFreeze!==false||freeze.temporalCustody?.blindOosReadBeforeFreeze!==false)throw new Error('validation custody invalid');
const {manifestHash,generatedAt,...core}=freeze;
if(crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex')!==manifestHash)throw new Error('freeze manifest mismatch');
if(freeze.guards?.parametersFrozen!==true||freeze.guards?.retuningAllowed!==false||freeze.guards?.realMoneyPass!==false||Number(freeze.guards?.realStakeEUR)!==0)throw new Error('freeze safety drift');

const START='2019-01-01',END='2022-12-31';
function choose(n,k){if(k<0||k>n)return 0;k=Math.min(k,n-k);let x=1;for(let i=1;i<=k;i++)x=x*(n-k+i)/i;return x;}
const P5=(choose(6,5)*choose(43,3)+choose(6,6)*choose(43,2))/choose(49,8),P6=choose(43,2)/choose(49,8);
function load(game){
  const dir=`${ROOT}/data/archive/${game}`;
  const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)&&Number(f.slice(0,4))<=2022).sort();
  let rows=[];
  for(const f of files){
    if(Number(f.slice(0,4))>2022)throw new Error('2023+ file opened');
    const d=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
    for(const r of (Array.isArray(d)?d:(d.records||[]))){
      const date=String(r.drawDate||'').slice(0,10),m=(r.result?.main||[]).map(Number);
      if(date&&date<=END&&m.length===6&&new Set(m).size===6&&m.every(n=>Number.isInteger(n)&&n>=1&&n<=49))rows.push({date,main:m});
    }
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));return{rows,openedFiles:files};
}
const games=[...new Set(freeze.candidates.map(c=>c.game))];
const cache=Object.fromEntries(games.map(g=>[g,load(g)]));
const bitsCache={};
function bitsFrom(rows){const b=Array.from({length:50},()=>new Uint8Array(rows.length));for(let i=0;i<rows.length;i++)for(const n of rows[i].main)b[n][i]=1;return b;}
for(const g of games)bitsCache[g]=bitsFrom(cache[g].rows);
function ctx(bits,n,y,d){let c=0;for(let j=y-d;j<y;j++)c=(c<<1)|bits[n][j];return c;}
function weights(D){const w=[];let s=0;for(let d=0;d<=D;d++){const x=2**(-d);w.push(x);s+=x;}return w.map(x=>x/s);}
function top8(scores){return scores.slice(1).map((s,i)=>({n:i+1,s})).sort((a,b)=>b.s-a.s||a.n-b.n).slice(0,8).map(x=>x.n).sort((a,b)=>a-b);}
function hit(pool,win){const s=new Set(pool);return win.reduce((z,n)=>z+s.has(n),0);}
function makeCounts(bits,W,maxD,t){
  const counts=Array.from({length:maxD+1},(_,d)=>Array.from({length:50},()=>new Uint32Array((1<<d)*2)));
  for(let d=0;d<=maxD;d++)for(let y=Math.max(d,t-W);y<t;y++)for(let n=1;n<=49;n++){const c=d?ctx(bits,n,y,d):0,o=bits[n][y];counts[d][n][c*2+o]++;}
  return counts;
}
function rollCounts(counts,bits,W,maxD,previousTarget){
  const rem=previousTarget-W,add=previousTarget;
  for(let d=0;d<=maxD;d++)for(let n=1;n<=49;n++){
    if(rem>=d){const c=d?ctx(bits,n,rem,d):0,o=bits[n][rem],a=counts[d][n];if(!a[c*2+o])throw new Error('rolling context underflow');a[c*2+o]--;}
    if(add>=d){const c=d?ctx(bits,n,add,d):0,o=bits[n][add];counts[d][n][c*2+o]++;}
  }
}
function metric(){return{evaluated:0,five:0,six:0,sum:0,events:[],hash:crypto.createHash('sha256')};}
function record(m,date,pool,h,winning){m.evaluated++;m.sum+=h;m.hash.update(`${date}:${pool.join(',')}\n`);if(h>=5){m.five++;m.events.push({date,hits:h,pool,winning});}if(h===6)m.six++;}
function finish(m){return{evaluatedDraws:m.evaluated,fivePlusPoolHits:m.five,fullSixPoolHits:m.six,meanPoolHits:m.evaluated?m.sum/m.evaluated:0,behaviorHash:m.hash.digest('hex'),events:m.events,matchedRandomExpectedFivePlus:m.evaluated*P5,matchedRandomExpectedFullSix:m.evaluated*P6};}

const grouped=new Map();
for(const c of freeze.candidates){const key=`${c.game}|${c.window}`;if(!grouped.has(key))grouped.set(key,{game:c.game,window:Number(c.window),candidates:[]});grouped.get(key).candidates.push(c);}
const evaluatedByKey=new Map();
for(const group of grouped.values()){
  const {game,window:W,candidates}=group,rows=cache[game].rows,bits=bitsCache[game],maxD=Math.max(...candidates.map(c=>Number(c.maxOrder)));
  if(rows.length<=W)throw new Error(`insufficient history ${game} W${W}`);
  let counts=makeCounts(bits,W,maxD,W);const base=metric(),cms=new Map(candidates.map(c=>[Number(c.maxOrder),metric()]));
  const weightCache=new Map(candidates.map(c=>[Number(c.maxOrder),weights(Number(c.maxOrder))]));
  for(let t=W;t<rows.length;t++){
    if(t>W)rollCounts(counts,bits,W,maxD,t-1);
    const date=rows[t].date;if(date<START||date>END)continue;
    const depthP=Array.from({length:50},()=>Array(maxD+1).fill(.5));
    for(let n=1;n<=49;n++)for(let d=0;d<=maxD;d++){
      if(t<d)continue;const c=d?ctx(bits,n,t,d):0,a=counts[d][n],z=a[c*2]+a[c*2+1];depthP[n][d]=(a[c*2+1]+.5)/(z+1);
    }
    const bs=Array(50).fill(0);for(let n=1;n<=49;n++)bs[n]=depthP[n][0];const bp=top8(bs),bh=hit(bp,rows[t].main);record(base,date,bp,bh,rows[t].main);
    for(const D of cms.keys()){
      const w=weightCache.get(D),scores=Array(50).fill(0);for(let n=1;n<=49;n++){let p=0;for(let d=0;d<=D;d++)p+=w[d]*depthP[n][d];scores[n]=p;}
      const pool=top8(scores),h=hit(pool,rows[t].main);record(cms.get(D),date,pool,h,rows[t].main);
    }
  }
  const baseDone=finish(base);
  for(const c of candidates)evaluatedByKey.set(`${c.game}|${c.window}|${c.maxOrder}`,{candidate:finish(cms.get(Number(c.maxOrder))),base:baseDone});
}
const results=[];
for(const c of freeze.candidates){
  const e=evaluatedByKey.get(`${c.game}|${c.window}|${c.maxOrder}`),cand=e.candidate,base=e.base,dates=[...new Set(cand.events.map(x=>x.date))];
  const excess0=cand.fivePlusPoolHits-base.fivePlusPoolHits,excessRnd=cand.fivePlusPoolHits-cand.matchedRandomExpectedFivePlus;
  const pass=excess0>0&&excessRnd>0&&dates.length>=Number(spec.validationGate.minimumDistinctFivePlusDates);
  results.push({game:c.game,window:Number(c.window),maxOrder:Number(c.maxOrder),developmentBehaviorHash:c.developmentBehaviorHash,...cand,order0:{fivePlusPoolHits:base.fivePlusPoolHits,fullSixPoolHits:base.fullSixPoolHits,meanPoolHits:base.meanPoolHits,behaviorHash:base.behaviorHash},fivePlusExcessOverOrder0:excess0,fivePlusExcessOverRandom:excessRnd,distinctFivePlusDates:dates,validationGatePass:pass});
}
const survivors=results.filter(r=>r.validationGatePass).map(({events,...r})=>({...r,eventDetails:events}));
const out={generatedAt:new Date().toISOString(),version:'v319-stage3-validation',family:freeze.family,status:survivors.length?'VALIDATION_SURVIVORS_READY_FOR_BLIND_OOS_FREEZE':'CLOSED_VALIDATION_FAILED',freezeManifestHash:freeze.manifestHash,temporalIsolation:{validationWindow:`${START}/${END}`,openedFiles:Object.fromEntries(Object.entries(cache).map(([g,v])=>[g,v.openedFiles])),blindOosTouched:false,postFreezeTouched:false},exactMatchedNull:{fivePlusProbability:P5,fullSixProbability:P6},candidateCount:freeze.candidates.length,results:results.map(({events,...r})=>({...r,eventDates:events.map(e=>e.date)})),survivors,survivorCount:survivors.length,guards:{parametersChangedAfterFreeze:false,retuningPerformed:false,realMoneyPass:false,realStakeEUR:0,maximumTheoreticalCostEURPerGameDraw:14},next:survivors.length?'freeze survivors before reading 2023+':'archive v319; do not read 2023+ OOS'};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({status:out.status,survivorCount:out.survivorCount,survivors:survivors.map(x=>({game:x.game,window:x.window,maxOrder:x.maxOrder,fivePlus:x.fivePlusPoolHits,order0:x.order0.fivePlusPoolHits,randomExpected:x.matchedRandomExpectedFivePlus,dates:x.distinctFivePlusDates,fullSix:x.fullSixPoolHits})),blindOosTouched:false,realMoneyPass:false},null,2));
