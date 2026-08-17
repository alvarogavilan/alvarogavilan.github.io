#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';
const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/economic-multiplier-window-prospective-freeze-v1.json';
const OUT='loterias-ai/casino/lightning/evidence/economic-multiplier-window-prospective-status-v1.json';
const f=JSON.parse(fs.readFileSync(FREEZE,'utf8')),freezeMs=Date.parse(f.frozenAt),threshold=f.frozenRule.roundsSinceLastWinningLightningAtLeast,horizon=f.frozenRule.predictNextRounds;
function t(r){const x=Date.parse(r.ts??r.timestamp??r.observedAt??r.createdAt);return Number.isFinite(x)?x:null}
function event(r){if(typeof r.winnerIsLightning==='boolean')return r.winnerIsLightning;const ns=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers.map(Number):[];return ns.includes(Number(r.winner));}
function wilson(k,n,z=1.96){if(!n)return {lower:null,upper:null};const p=k/n,zz=z*z,d=1+zz/n,c=(p+zz/(2*n))/d,h=z*Math.sqrt((p*(1-p)+zz/(4*n))/n)/d;return {lower:Math.max(0,c-h),upper:Math.min(1,c+h)}}
function r(v){return Number.isFinite(v)?Number(v.toFixed(6)):null}
let rows=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map((x,i)=>({...JSON.parse(x),_i:i})).filter(x=>x.trainingEligible!==false&&Number.isInteger(Number(x.winner))).map(x=>({...x,_ts:t(x),_event:event(x)}));if(!rows.every(x=>x._ts!=null))throw new Error('Prospective evaluator requires timestamps for every eligible row');rows.sort((a,b)=>a._ts-b._ts||a._i-b._i);
let lastEvent=null,active=null;const closed=[];let postFreezeRounds=0;
for(let i=0;i<rows.length;i++){
  const row=rows[i],isPost=row._ts>freezeMs;if(isPost)postFreezeRounds++;
  if(active&&i>active.triggerIndex){active.futureRounds++;if(row._event){active.success=true;active.closedIndex=i;active.closedAt=new Date(row._ts).toISOString();closed.push(active);active=null;}else if(active.futureRounds>=horizon){active.success=false;active.closedIndex=i;active.closedAt=new Date(row._ts).toISOString();closed.push(active);active=null;}}
  if(row._event)lastEvent=i;
  const gap=lastEvent==null?null:i-lastEvent;
  if(isPost&&!active&&gap!=null&&gap>=threshold){active={triggerIndex:i,triggerAt:new Date(row._ts).toISOString(),gapAtTrigger:gap,futureRounds:0,success:null};}
}
const successes=closed.filter(x=>x.success).length,total=closed.length,rate=successes/Math.max(1,total),ci=wilson(successes,total),p0=f.frozenNull.iidProbabilityAtLeastOneIn7,p1=f.frozenNull.empiricalAllAnchor7RoundRateAtFreeze;
const status=total>=f.gates.minimumClosedEpisodesForFormalRead?'FORMAL_READ_AVAILABLE':total>=f.gates.minimumClosedEpisodesForDirectionalRead?'DIRECTIONAL_READ_ONLY':'ACCUMULATING';
const result={version:'economic-multiplier-window-prospective-status-v1',generatedAt:new Date().toISOString(),freezeVersion:f.version,frozenAt:f.frozenAt,rule:f.frozenRule,postFreezeRounds,closedEpisodes:total,successes,failures:total-successes,successRate:r(rate),wilson95:{lower:r(ci.lower),upper:r(ci.upper)},frozenNull:{primary:p0,secondary:p1},liftVsPrimary:r(rate-p0),relativeLiftVsPrimary:r(rate/p0-1),pendingEpisode:active?{triggerAt:active.triggerAt,gapAtTrigger:active.gapAtTrigger,futureRoundsObserved:active.futureRounds}:null,status,gates:{directionalSampleReached:total>=f.gates.minimumClosedEpisodesForDirectionalRead,formalSampleReached:total>=f.gates.minimumClosedEpisodesForFormalRead,lowerCiAbovePrimaryNull:ci.lower!=null&&ci.lower>p0,positiveVsSecondary:rate>p1,minimum10000ProspectiveRoundsReached:postFreezeRounds>=f.gates.minimumProspectivePaperRoundsBeforeAnyPromotion,formalTimingGatePass:total>=f.gates.minimumClosedEpisodesForFormalRead&&ci.lower>p0&&rate>p1&&postFreezeRounds>=f.gates.minimumProspectivePaperRoundsBeforeAnyPromotion,realMoneyAllowed:false},recentClosedEpisodes:closed.slice(-20).map(x=>({triggerAt:x.triggerAt,gapAtTrigger:x.gapAtTrigger,success:x.success,closedAt:x.closedAt,futureRounds:x.futureRounds}))};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');console.log('PROSPECTIVE_TIMING_JSON_START');console.log(JSON.stringify(result,null,2));console.log('PROSPECTIVE_TIMING_JSON_END');
