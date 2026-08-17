#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const IN='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const OUT='loterias-ai/casino/lightning/evidence/economic-multiplier-window-oos-v1.json';
const HORIZONS=[4,5,6,7,8,9,10],THRESHOLDS=[4,8,12,16,20,24];
const raw=fs.readFileSync(IN,'utf8').split(/\r?\n/).filter(Boolean).map((x,i)=>({...JSON.parse(x),_i:i}));
function ts(r){const t=Date.parse(r.ts??r.timestamp??r.observedAt??r.createdAt);return Number.isFinite(t)?t:null}
function pairs(r){const ns=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers:[];const ms=Array.isArray(r.allLuckyMultipliers)?r.allLuckyMultipliers:[];return ns.map((n,i)=>({n:Number(n),m:Number(ms[i])}));}
let rows=raw.filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))).map(r=>{const p=pairs(r),w=Number(r.winner),wp=p.find(x=>x.n===w);const wm=Number(r.winnerMultiplier);return {...r,winner:w,_ts:ts(r),event:Boolean(r.winnerIsLightning??wp),mult:Number.isFinite(wm)&&wm>0?wm:(Number.isFinite(wp?.m)&&wp.m>0?wp.m:null)}});
if(rows.every(r=>r._ts!=null))rows.sort((a,b)=>a._ts-b._ts||a._i-b._i);const n=rows.length;if(n<1000)throw new Error('Need >=1000 chronological rounds');
const events=rows.map(r=>r.event);const gaps=[];let last=null;for(let i=0;i<n;i++){if(events[i])last=i;gaps[i]=last==null?null:i-last;}
const cuts={discovery:[0,Math.floor(n*.60)],validation:[Math.floor(n*.60),Math.floor(n*.80)],holdout:[Math.floor(n*.80),n]};
function evalRule(start,end,t,h){let sel=0,selHit=0,other=0,otherHit=0;for(let i=start;i<end-h;i++){const future=events.slice(i+1,i+1+h).some(Boolean);if(gaps[i]!=null&&gaps[i]>=t){sel++;if(future)selHit++;}else{other++;if(future)otherHit++;}}const ps=selHit/Math.max(1,sel),po=otherHit/Math.max(1,other);return {selected:sel,selectedHits:selHit,selectedRate:ps,other,otherHits:otherHit,otherRate:po,absoluteLift:ps-po,relativeLift:po?ps/po-1:null};}
const candidates=[];for(const t of THRESHOLDS)for(const h of HORIZONS){const x=evalRule(...cuts.discovery,t,h);if(x.selected>=100&&x.other>=100)candidates.push({threshold:t,horizon:h,...x});}
candidates.sort((a,b)=>b.absoluteLift-a.absoluteLift||b.selected-a.selected);const chosen=candidates[0];if(!chosen)throw new Error('No eligible discovery rule');
const validation=evalRule(...cuts.validation,chosen.threshold,chosen.horizon);const holdout=evalRule(...cuts.holdout,chosen.threshold,chosen.horizon);
function r(v,d=6){return Number.isFinite(v)?Number(v.toFixed(d)):null}
function clean(x){return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='number'?r(v):v]));}
const result={version:'economic-multiplier-window-oos-v1',generatedAt:new Date().toISOString(),mode:'PAPER_ONLY',rounds:n,split:{discovery:cuts.discovery,validation:cuts.validation,holdout:cuts.holdout},selection:{candidateThresholds:THRESHOLDS,candidateHorizons:HORIZONS,minSelectedAnchors:100,metric:'absolute difference in future-winning-Lightning rate vs complement, discovery only'},frozenRule:{roundsSinceLastWinningLightningAtLeast:chosen.threshold,nextRounds:chosen.horizon,discovery:clean(chosen)},validation:clean(validation),holdout:clean(holdout),gates:{validationPositiveLift:validation.absoluteLift>0,holdoutPositiveLift:holdout.absoluteLift>0,replicatedDirection:validation.absoluteLift>0&&holdout.absoluteLift>0,prospectiveStillRequired:true,realMoneyAllowed:false},interpretation:'La regla se eligió exclusivamente con el 60% más antiguo y se evaluó sin retocar en validación y holdout cronológicos. Las ventanas solapadas generan dependencia, por lo que una dirección positiva no equivale por sí sola a significación ni a ventaja monetizable.'};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');console.log('OOS_TIMING_JSON_START');console.log(JSON.stringify(result,null,2));console.log('OOS_TIMING_JSON_END');
