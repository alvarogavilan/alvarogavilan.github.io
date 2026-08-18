#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const FREEZE=`${ROOT}/data/research/metapleno-v320-validation-freeze.json`;
const SPEC=`${ROOT}/data/research/metapleno-v320-preregister.json`;
const OUT=`${ROOT}/data/research/metapleno-v320-stage3-validation.json`;
if(!fs.existsSync(FREEZE))throw new Error('v320 validation freeze not yet persisted');
const raw=fs.readFileSync(FREEZE,'utf8'),freeze=JSON.parse(raw),spec=JSON.parse(fs.readFileSync(SPEC,'utf8'));
if(freeze.status!=='FROZEN_BEFORE_VALIDATION_READ'||freeze.temporalCustody?.validationReadBeforeFreeze!==false||freeze.temporalCustody?.blindOosReadBeforeFreeze!==false)throw new Error('validation custody invalid');
const {manifestHash,generatedAt,...core}=freeze;
if(crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex')!==manifestHash)throw new Error('freeze manifest mismatch');
if(freeze.guards?.parametersFrozen!==true||freeze.guards?.retuningAllowed!==false||freeze.guards?.realMoneyPass!==false||Number(freeze.guards?.realStakeEUR)!==0)throw new Error('freeze safety drift');

const START='2019-01-01',END='2022-12-31';
function choose(n,k){if(k<0||k>n)return 0;k=Math.min(k,n-k);let x=1;for(let i=1;i<=k;i++)x=x*(n-k+i)/i;return x;}
const P5=(choose(6,5)*choose(43,3)+choose(6,6)*choose(43,2))/choose(49,8),P6=choose(43,2)/choose(49,8);
function gaps(main){const x=[...main].sort((a,b)=>a-b),g=[x[0]-1];for(let i=1;i<6;i++)g.push(x[i]-x[i-1]-1);g.push(49-x[5]);if(g.reduce((a,b)=>a+b,0)!==43)throw new Error('gap bijection failure');return g;}
function load(game){
  const dir=`${ROOT}/data/archive/${game}`,files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)&&Number(f.slice(0,4))<=2022).sort();let rows=[];
  for(const f of files){if(Number(f.slice(0,4))>2022)throw new Error('2023+ file opened');const d=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));for(const r of (Array.isArray(d)?d:(d.records||[]))){const date=String(r.drawDate||'').slice(0,10),main=(r.result?.main||[]).map(Number).sort((a,b)=>a-b);if(date&&date<=END&&main.length===6&&new Set(main).size===6&&main.every(n=>Number.isInteger(n)&&n>=1&&n<=49))rows.push({date,main,gaps:gaps(main)});}}rows.sort((a,b)=>a.date.localeCompare(b.date));return{rows,openedFiles:files};
}
const games=[...new Set(freeze.candidates.map(c=>c.game))],cache=Object.fromEntries(games.map(g=>[g,load(g)]));
function init(rows,W){const gap=Array.from({length:7},()=>new Int32Array(44)),num=new Int32Array(50);for(let i=0;i<W;i++){for(let p=0;p<7;p++)gap[p][rows[i].gaps[p]]++;for(const n of rows[i].main)num[n]++;}return{gap,num};}
function roll(s,remove,add){for(let p=0;p<7;p++){const a=s.gap[p],r=remove.gaps[p],x=add.gaps[p];if(a[r]<=0)throw new Error('gap rolling underflow');a[r]--;a[x]++;}for(const n of remove.main){if(s.num[n]<=0)throw new Error('num rolling underflow');s.num[n]--;}for(const n of add.main)s.num[n]++;}
function marginal(gapCounts,W,alpha){const q=Array.from({length:7},()=>new Float64Array(44)),den=W+44*alpha;for(let p=0;p<7;p++)for(let g=0;g<=43;g++)q[p][g]=(gapCounts[p][g]+alpha)/den;const F=Array.from({length:8},()=>new Float64Array(44));F[0][0]=1;for(let p=0;p<7;p++)for(let s=0;s<=43;s++)if(F[p][s])for(let g=0;s+g<=43;g++)F[p+1][s+g]+=F[p][s]*q[p][g];const B=Array.from({length:8},()=>new Float64Array(44));B[7][0]=1;for(let p=6;p>=0;p--)for(let s=0;s<=43;s++)for(let g=0;s+g<=43;g++)B[p][s+g]+=q[p][g]*B[p+1][s];const Z=F[7][43];if(!(Z>0))throw new Error('normalizer zero');const inc=new Float64Array(50);for(let n=1;n<=49;n++){let w=0;for(let j=1;j<=6;j++){const s=n-j;if(s>=0&&s<=43)w+=F[j][s]*B[j][43-s];}inc[n]=w/Z;}const total=[...inc].reduce((a,b)=>a+b,0);if(Math.abs(total-6)>1e-7)throw new Error('marginal normalization drift');return inc;}
function top8(scores){const a=[];for(let n=1;n<=49;n++)a.push({n,s:Number(scores[n])});a.sort((x,y)=>y.s-x.s||x.n-y.n);return a.slice(0,8).map(x=>x.n).sort((a,b)=>a-b);}
function hit(pool,win){const s=new Set(pool);return win.reduce((z,n)=>z+s.has(n),0);}
function metric(){return{evaluated:0,five:0,six:0,sum:0,events:[],hash:crypto.createHash('sha256')};}
function record(m,date,pool,h,win){m.evaluated++;m.sum+=h;m.hash.update(`${date}:${pool.join(',')}\n`);if(h>=5){m.five++;m.events.push({date,hits:h,pool,winning:win});}if(h===6)m.six++;}
function finish(m){return{evaluatedDraws:m.evaluated,fivePlusPoolHits:m.five,fullSixPoolHits:m.six,meanPoolHits:m.evaluated?m.sum/m.evaluated:0,behaviorHash:m.hash.digest('hex'),events:m.events,matchedRandomExpectedFivePlus:m.evaluated*P5,matchedRandomExpectedFullSix:m.evaluated*P6};}

const groups=new Map();for(const c of freeze.candidates){const key=`${c.game}|${c.window}`;if(!groups.has(key))groups.set(key,{game:c.game,window:Number(c.window),candidates:[]});groups.get(key).candidates.push(c);}
const evalMap=new Map();
for(const g of groups.values()){
  const rows=cache[g.game].rows,W=g.window;if(rows.length<=W)throw new Error('insufficient history');const state=init(rows,W),base=metric(),cms=new Map(g.candidates.map(c=>[Number(c.alpha),metric()]));
  for(let t=W;t<rows.length;t++){
    const target=rows[t],inValidation=target.date>=START&&target.date<=END;
    if(inValidation){const freq=new Float64Array(50);for(let n=1;n<=49;n++)freq[n]=(state.num[n]+1)/(W+2);const bp=top8(freq),bh=hit(bp,target.main);record(base,target.date,bp,bh,target.main);for(const alpha of cms.keys()){const p=marginal(state.gap,W,alpha),pool=top8(p),h=hit(pool,target.main);record(cms.get(alpha),target.date,pool,h,target.main);}}
    if(t+1<rows.length)roll(state,rows[t-W],rows[t]);
  }
  const b=finish(base);for(const c of g.candidates)evalMap.set(`${c.game}|${c.window}|${c.alpha}`,{cand:finish(cms.get(Number(c.alpha))),base:b});
}
const results=[];
for(const c of freeze.candidates){const e=evalMap.get(`${c.game}|${c.window}|${c.alpha}`),cand=e.cand,base=e.base,dates=[...new Set(cand.events.map(x=>x.date))],excessBase=cand.fivePlusPoolHits-base.fivePlusPoolHits,excessRnd=cand.fivePlusPoolHits-cand.matchedRandomExpectedFivePlus,pass=excessBase>0&&excessRnd>0&&dates.length>=Number(spec.validationGate.minimumDistinctFivePlusDates);results.push({game:c.game,window:Number(c.window),alpha:Number(c.alpha),developmentBehaviorHash:c.developmentBehaviorHash,...cand,frequencyBaseline:{fivePlusPoolHits:base.fivePlusPoolHits,fullSixPoolHits:base.fullSixPoolHits,meanPoolHits:base.meanPoolHits,behaviorHash:base.behaviorHash},fivePlusExcessOverFrequency:excessBase,fivePlusExcessOverRandom:excessRnd,distinctFivePlusDates:dates,validationGatePass:pass});}
const survivors=results.filter(r=>r.validationGatePass).map(({events,...r})=>({...r,eventDetails:events}));
const out={generatedAt:new Date().toISOString(),version:'v320-stage3-validation',family:freeze.family,status:survivors.length?'VALIDATION_SURVIVORS_READY_FOR_BLIND_OOS_FREEZE':'CLOSED_VALIDATION_FAILED',freezeManifestHash:freeze.manifestHash,temporalIsolation:{validationWindow:`${START}/${END}`,openedFiles:Object.fromEntries(Object.entries(cache).map(([g,v])=>[g,v.openedFiles])),blindOosTouched:false,postFreezeTouched:false},exactMatchedNull:{fivePlusProbability:P5,fullSixProbability:P6},candidateCount:freeze.candidates.length,results:results.map(({events,...r})=>({...r,eventDates:events.map(e=>e.date)})),survivors,survivorCount:survivors.length,guards:{parametersChangedAfterFreeze:false,retuningPerformed:false,realMoneyPass:false,realStakeEUR:0,maximumTheoreticalCostEURPerGameDraw:14},next:survivors.length?'freeze survivors before reading 2023+':'archive v320; do not read 2023+ OOS'};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({status:out.status,survivorCount:out.survivorCount,survivors:survivors.map(x=>({game:x.game,window:x.window,alpha:x.alpha,fivePlus:x.fivePlusPoolHits,frequency:x.frequencyBaseline.fivePlusPoolHits,randomExpected:x.matchedRandomExpectedFivePlus,dates:x.distinctFivePlusDates,fullSix:x.fullSixPoolHits})),blindOosTouched:false,realMoneyPass:false},null,2));
