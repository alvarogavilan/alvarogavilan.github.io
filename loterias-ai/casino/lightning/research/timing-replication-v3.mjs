#!/usr/bin/env node
import fs from 'node:fs';

const ROOT='loterias-ai/casino/lightning';
const DATA=`${ROOT}/data/casinoorg-lightningroulette-segment-v2.jsonl`;
const FREEZE=`${ROOT}/evidence/authoritative-segment-v2-freeze.json`;
const OUT=`${ROOT}/evidence/timing-replication-v3-status.json`;
const f=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const spec=f.restartedExperiments?.timingReplicationV3;
const startMs=Date.parse(f.prospectiveStartsAt),threshold=8,horizon=7,boundary=200,p0=Number(spec?.primaryNull),p1=Number(spec?.secondaryNull),alpha=Number(spec?.alpha);
if(f.version!=='authoritative-segment-v2-freeze'||!Number.isFinite(startMs)||spec?.rule!=='gap >= 8 completed rounds; event within next 7 chronological rounds'||spec?.episodesNonOverlapping!==true||boundary!==spec?.fixedClosedEpisodes||spec?.noInterimPerformanceRead!==true||p0!==0.384823||p1!==0.376573||alpha!==0.01)throw new Error('timing v3 frozen protocol drift');

const parseTs=r=>{const v=Date.parse(r.timestamp??r.ts);return Number.isFinite(v)?v:null};
const event=r=>{if(typeof r.winnerIsLightning==='boolean')return r.winnerIsLightning;const a=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers:[];return a.map(Number).includes(Number(r.winner));};
const rows=fs.existsSync(DATA)?fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map((x,i)=>({...JSON.parse(x),_i:i})).filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))&&Number(r.winner)>=0&&Number(r.winner)<=36).map(r=>({...r,_ts:parseTs(r),_event:event(r)})).sort((a,b)=>a._ts-b._ts||a._i-b._i):[];
if(rows.some(r=>r._ts==null||r._ts<=startMs))throw new Error('timing v3 segment contains invalid/pre-barrier row');

let lastEvent=null,active=null;const closed=[];
for(let i=0;i<rows.length;i++){
  const r=rows[i];
  if(active&&i>active.triggerIndex){
    active.futureRounds++;
    if(r._event){active.success=true;active.closedAt=r.timestamp;closed.push(active);active=null;}
    else if(active.futureRounds>=horizon){active.success=false;active.closedAt=r.timestamp;closed.push(active);active=null;}
    if(closed.length>=boundary)break;
  }
  if(r._event)lastEvent=i;
  const gap=lastEvent==null?null:i-lastEvent;
  if(!active&&gap!=null&&gap>=threshold)active={triggerIndex:i,triggerAt:r.timestamp,gapAtTrigger:gap,futureRounds:0,success:null};
}
const finalReady=closed.length>=boundary,used=closed.slice(0,boundary);
function wilson(k,n,z=1.96){if(!n)return{lower:null,upper:null};const p=k/n,zz=z*z,den=1+zz/n,center=(p+zz/(2*n))/den,half=z*Math.sqrt(Math.max(1e-15,(p*(1-p)+zz/(4*n))/n))/den;return{lower:center-half,upper:center+half};}
function binomUpper(k,n,p){let prob=Math.pow(1-p,n),sum=k===0?prob:0;for(let x=1;x<=n;x++){prob*=((n-x+1)/x)*(p/(1-p));if(x>=k)sum+=prob;}return Math.min(1,Math.max(0,sum));}
const out={version:'timing-replication-v3-status',freezeVersion:f.version,prospectiveStartsAt:f.prospectiveStartsAt,sourceSegment:'authoritative-v2',progress:{eligibleRows:rows.length,closedEpisodes:Math.min(closed.length,boundary),fixedBoundaryClosedEpisodes:boundary,remainingClosedEpisodes:Math.max(0,boundary-closed.length)},disclosure:{policy:finalReady?'FIXED_FINAL_AVAILABLE':'ADMINISTRATIVE_COUNTS_ONLY',performanceHidden:!finalReady,successesHidden:!finalReady,pValueHidden:!finalReady},final:null,guards:{sameRuleAsV1:true,newCleanSegmentAfterSourceDiscontinuity:true,nonOverlappingEpisodes:true,first200Only:true,noRetuning:true,noOptionalStopping:true,postBoundaryCannotRescue:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
if(finalReady){const successes=used.filter(x=>x.success).length,failures=boundary-successes,rate=successes/boundary,ci=wilson(successes,boundary),p=binomUpper(successes,boundary,p0),pass=p<alpha&&ci.lower>p0&&rate>p0&&rate>p1;out.final={closedEpisodes:boundary,successes,failures,successRate:rate,wilson95:ci,primaryNull:p0,secondaryNull:p1,oneSidedExactBinomialP:p,alpha,finalBoundaryTriggerAt:used.at(-1)?.triggerAt||null,finalBoundaryClosedAt:used.at(-1)?.closedAt||null,criteria:{pBelowAlpha:p<alpha,wilsonLowerAbovePrimary:ci.lower>p0,rateAbovePrimary:rate>p0,rateAboveSecondary:rate>p1},replicationPass:pass,interpretation:pass?'CLEAN_SEGMENT_REPLICATION_PASSED_REQUIRES_FURTHER_CONFIRMATION':'CLEAN_SEGMENT_REPLICATION_DID_NOT_PASS',claimAllowed:false,realMoneyAllowed:false};}
const semantic=JSON.stringify(out);let oldCore=null;if(fs.existsSync(OUT)){const old=JSON.parse(fs.readFileSync(OUT,'utf8'));delete old.generatedAt;oldCore=JSON.stringify(old);}if(oldCore===semantic){console.log(JSON.stringify({changed:false,...out.progress,finalReady}));process.exit(0);}fs.writeFileSync(OUT,JSON.stringify({...out,generatedAt:new Date().toISOString()},null,2)+'\n');console.log(JSON.stringify({changed:true,...out.progress,finalReady,replicationPass:out.final?.replicationPass??null},null,2));
