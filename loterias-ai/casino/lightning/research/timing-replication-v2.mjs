#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT='loterias-ai/casino/lightning';
const DATA=`${ROOT}/data/casinoorg-lightningroulette.jsonl`;
const FREEZE=`${ROOT}/evidence/timing-replication-v2-freeze.json`;
const OUT=`${ROOT}/evidence/timing-replication-v2-status.json`;
const f=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const startMs=Date.parse(f.prospectiveStartsAt),threshold=Number(f.rule.roundsSinceLastWinningLightningAtLeast),horizon=Number(f.rule.predictNextRounds),boundary=Number(f.fixedSample.closedEpisodes),p0=Number(f.frozenNull.primaryProbability),p1=Number(f.frozenNull.secondaryProbability),alpha=Number(f.inference.alpha);
if(f.version!=='timing-replication-v2-freeze'||!Number.isFinite(startMs))throw new Error('v2 freeze invalid');
if(threshold!==8||horizon!==7||boundary!==200||alpha!==0.01)throw new Error('v2 frozen rule/boundary drift');
if(f.rule.episodesNonOverlapping!==true||f.rule.noRetuning!==true||f.fixedSample.noInterimPerformanceRead!==true)throw new Error('v2 anti-bias guard drift');
if(f.guards?.noOptionalStopping!==true||f.guards?.realMoneyAllowed!==false)throw new Error('v2 safety guard drift');

function ts(r){const v=Date.parse(r.ts??r.timestamp??r.observedAt??r.createdAt);return Number.isFinite(v)?v:null;}
function event(r){if(typeof r.winnerIsLightning==='boolean')return r.winnerIsLightning;const a=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers:(Array.isArray(r.luckyNumbers)?r.luckyNumbers:[]);return a.map(Number).includes(Number(r.winner));}
let rows=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map((x,i)=>({...JSON.parse(x),_i:i})).filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))&&Number(r.winner)>=0&&Number(r.winner)<=36).map(r=>({...r,_ts:ts(r),_event:event(r)}));
if(!rows.every(r=>r._ts!=null))throw new Error('v2 requires timestamp on every eligible row');rows.sort((a,b)=>a._ts-b._ts||a._i-b._i);

let lastEvent=null,active=null;const closed=[];let eligiblePostStartRows=0;
for(let i=0;i<rows.length;i++){
  const r=rows[i],post=r._ts>startMs;if(post)eligiblePostStartRows++;
  if(active&&i>active.triggerIndex){
    active.futureRounds++;
    if(r._event){active.success=true;active.closedAt=new Date(r._ts).toISOString();closed.push(active);active=null;}
    else if(active.futureRounds>=horizon){active.success=false;active.closedAt=new Date(r._ts).toISOString();closed.push(active);active=null;}
    if(closed.length>=boundary)break;
  }
  if(r._event)lastEvent=i;
  const gap=lastEvent==null?null:i-lastEvent;
  if(post&&!active&&gap!=null&&gap>=threshold)active={triggerIndex:i,triggerAt:new Date(r._ts).toISOString(),gapAtTrigger:gap,futureRounds:0,success:null};
}
const finalReady=closed.length>=boundary,used=closed.slice(0,boundary);
function wilson(k,n,z=1.96){if(!n)return{lower:null,upper:null};const p=k/n,zz=z*z,den=1+zz/n,center=(p+zz/(2*n))/den,half=z*Math.sqrt((p*(1-p)+zz/(4*n))/n)/den;return{lower:center-half,upper:center+half};}
function binomUpper(k,n,p){let prob=Math.pow(1-p,n),sum=k===0?prob:0;for(let x=1;x<=n;x++){prob*=((n-x+1)/x)*(p/(1-p));if(x>=k)sum+=prob;}return Math.min(1,Math.max(0,sum));}
const semantic={version:'timing-replication-v2-status',freezeVersion:f.version,prospectiveStartsAt:f.prospectiveStartsAt,progress:{eligiblePostStartRows,closedEpisodes:Math.min(closed.length,boundary),fixedBoundaryClosedEpisodes:boundary,remainingClosedEpisodes:Math.max(0,boundary-closed.length)},disclosure:{policy:finalReady?'FIXED_FINAL_AVAILABLE':'ADMINISTRATIVE_COUNTS_ONLY',performanceHidden:!finalReady,successesHidden:!finalReady,pValueHidden:!finalReady},final:null,guards:{sameRuleAsV1:true,nonOverlappingEpisodes:true,first200Only:true,noRetuning:true,noOptionalStopping:true,postBoundaryCannotRescue:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
if(finalReady){const successes=used.filter(x=>x.success).length,failures=boundary-successes,rate=successes/boundary,ci=wilson(successes,boundary),p=binomUpper(successes,boundary,p0),pass=p<alpha&&ci.lower>p0&&rate>p0&&rate>p1;semantic.final={closedEpisodes:boundary,successes,failures,successRate:rate,wilson95:ci,primaryNull:p0,secondaryNull:p1,oneSidedExactBinomialP:p,alpha,criteria:{pBelowAlpha:p<alpha,wilsonLowerAbovePrimary:ci.lower>p0,rateAbovePrimary:rate>p0,rateAboveSecondary:rate>p1},replicationPass:pass,interpretation:pass?'REPLICATION_SIGNAL_SURVIVED_FIXED_V2_REQUIRES_FURTHER_INDEPENDENT_CONFIRMATION':'V2_DID_NOT_PASS_FIXED_REPLICATION_GATE',claimAllowed:false,realMoneyAllowed:false};}
const newCore=JSON.stringify(semantic);let oldRaw=null,oldCore=null;if(fs.existsSync(OUT)){oldRaw=fs.readFileSync(OUT,'utf8');const old=JSON.parse(oldRaw);delete old.generatedAt;oldCore=JSON.stringify(old);}if(oldCore===newCore){console.log(JSON.stringify({changed:false,...semantic.progress,finalReady,realMoneyAllowed:false}));process.exit(0);}fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({...semantic,generatedAt:new Date().toISOString()},null,2)+'\n');console.log(JSON.stringify({changed:true,...semantic.progress,finalReady,replicationPass:semantic.final?.replicationPass??null,realMoneyAllowed:false},null,2));
