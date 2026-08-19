#!/usr/bin/env node
import fs from 'node:fs';

const ROOT='loterias-ai/casino/lightning';
const DATA=`${ROOT}/data/casinoorg-lightningroulette-segment-v2.jsonl`;
const FREEZE=`${ROOT}/evidence/timing-replication-v4-freeze.json`;
const V3=`${ROOT}/evidence/timing-replication-v3-status.json`;
const OUT=`${ROOT}/evidence/timing-replication-v4-status.json`;

const f=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const p=f.protocol||{};
const threshold=8,horizon=7,boundary=200,p0=Number(p.primaryNull),p1=Number(p.secondaryNull),alpha=Number(p.alpha);
if(f.version!=='timing-replication-v4-freeze-v1'||f.sourceSegment!=='authoritative-v2'||f.activation?.condition!=='V3_FIXED_200_COMPLETE'||f.activation?.usesPreBoundaryState!==false||p.rule!=='gap >= 8 completed rounds; event within next 7 chronological rounds'||p.episodesNonOverlapping!==true||p.fixedClosedEpisodes!==boundary||p.noInterimPerformanceRead!==true||p.first200Only!==true||p.noRetuning!==true||p.noOptionalStopping!==true||p.postBoundaryCannotRescue!==true||p0!==0.384823||p1!==0.376573||alpha!==0.01||f.custody?.preRegisteredBeforeV3Final!==true||f.guards?.realMoneyAllowed!==false)throw new Error('timing v4 frozen protocol drift');

const v3=JSON.parse(fs.readFileSync(V3,'utf8'));
const v3Ready=Number(v3?.progress?.closedEpisodes)===200&&v3?.final?.closedEpisodes===200&&Boolean(v3?.final?.finalBoundaryClosedAt);
const anchor=v3Ready?String(v3.final.finalBoundaryClosedAt):null;
const anchorMs=anchor?Date.parse(anchor):null;
if(v3Ready&&!Number.isFinite(anchorMs))throw new Error('invalid V3 final boundary anchor');

const parseTs=r=>{const v=Date.parse(r.timestamp??r.ts);return Number.isFinite(v)?v:null};
const event=r=>{if(typeof r.winnerIsLightning==='boolean')return r.winnerIsLightning;const a=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers:[];return a.map(Number).includes(Number(r.winner));};
const allRows=fs.existsSync(DATA)?fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map((x,i)=>({...JSON.parse(x),_i:i})).filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))&&Number(r.winner)>=0&&Number(r.winner)<=36).map(r=>({...r,_ts:parseTs(r),_event:event(r)})).filter(r=>r._ts!=null).sort((a,b)=>a._ts-b._ts||a._i-b._i):[];
const rows=v3Ready?allRows.filter(r=>r._ts>anchorMs):[];
if(v3Ready&&rows.some(r=>r._ts<=anchorMs))throw new Error('V4 pre-boundary row leakage');

let firstPostBoundaryEventSeen=false,lastEvent=null,active=null;const closed=[];
for(let i=0;i<rows.length;i++){
  const r=rows[i];
  if(!firstPostBoundaryEventSeen){
    if(r._event){firstPostBoundaryEventSeen=true;lastEvent=i;}
    continue;
  }
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

const finalReady=v3Ready&&closed.length>=boundary,used=closed.slice(0,boundary);
function wilson(k,n,z=1.96){if(!n)return{lower:null,upper:null};const rate=k/n,zz=z*z,den=1+zz/n,center=(rate+zz/(2*n))/den,half=z*Math.sqrt(Math.max(1e-15,(rate*(1-rate)+zz/(4*n))/n))/den;return{lower:center-half,upper:center+half};}
function binomUpper(k,n,prob){let q=Math.pow(1-prob,n),sum=k===0?q:0;for(let x=1;x<=n;x++){q*=((n-x+1)/x)*(prob/(1-prob));if(x>=k)sum+=q;}return Math.min(1,Math.max(0,sum));}

const out={
  version:'timing-replication-v4-status-v1',
  freezeVersion:f.version,
  sourceSegment:f.sourceSegment,
  activation:{v3FixedBoundaryComplete:v3Ready,anchorV3FinalBoundaryClosedAt:anchor,strictlyPostAnchor:true,preBoundaryStateUsed:false},
  state:!v3Ready?'WAITING_FOR_V3_FIXED_BOUNDARY':finalReady?'FIXED_FINAL_AVAILABLE':'BLINDED_ACCUMULATING',
  progress:{eligiblePostBoundaryRows:rows.length,closedEpisodes:Math.min(closed.length,boundary),fixedBoundaryClosedEpisodes:boundary,remainingClosedEpisodes:Math.max(0,boundary-closed.length)},
  disclosure:{policy:finalReady?'FIXED_FINAL_AVAILABLE':'ADMINISTRATIVE_COUNTS_ONLY',performanceHidden:!finalReady,successesHidden:!finalReady,pValueHidden:!finalReady},
  final:null,
  guards:{preRegisteredBeforeV3Final:true,activationIndependentOfV3Outcome:true,sameRuleAsV3:true,postBoundaryStateOnly:true,episodesNonOverlapping:true,first200Only:true,noRetuning:true,noOptionalStopping:true,postBoundaryCannotRescue:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}
};
if(finalReady){
  const successes=used.filter(x=>x.success).length,failures=boundary-successes,rate=successes/boundary,ci=wilson(successes,boundary),pv=binomUpper(successes,boundary,p0),pass=pv<alpha&&ci.lower>p0&&rate>p0&&rate>p1;
  out.final={closedEpisodes:boundary,successes,failures,successRate:rate,wilson95:ci,primaryNull:p0,secondaryNull:p1,oneSidedExactBinomialP:pv,alpha,finalBoundaryTriggerAt:used.at(-1)?.triggerAt||null,finalBoundaryClosedAt:used.at(-1)?.closedAt||null,criteria:{pBelowAlpha:pv<alpha,wilsonLowerAbovePrimary:ci.lower>p0,rateAbovePrimary:rate>p0,rateAboveSecondary:rate>p1},replicationPass:pass,interpretation:pass?'INDEPENDENT_TIMING_V4_REPLICATION_PASSED':'INDEPENDENT_TIMING_V4_REPLICATION_DID_NOT_PASS',claimAllowed:false,realMoneyAllowed:false};
}

const semantic=JSON.stringify(out);let oldCore=null;if(fs.existsSync(OUT)){const old=JSON.parse(fs.readFileSync(OUT,'utf8'));delete old.generatedAt;oldCore=JSON.stringify(old);}if(oldCore===semantic){console.log(JSON.stringify({changed:false,state:out.state,...out.progress}));process.exit(0);}fs.writeFileSync(OUT,JSON.stringify({...out,generatedAt:new Date().toISOString()},null,2)+'\n');console.log(JSON.stringify({changed:true,state:out.state,...out.progress,replicationPass:out.final?.replicationPass??null},null,2));
