#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const OUT='loterias-ai/casino/lightning/evidence/economic-timing-number-combo-oos-v1.json';
const TOTAL_STAKE=15;
const NORMAL_GROSS_X=30;
const GAP_TRIGGER=8;
const HORIZON=7;
const WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const POS=new Map(WHEEL.map((n,i)=>[n,i]));
const LOOKBACKS=[5,8,10,12,15,20,30,50,80,120,200];
const MODES=['hot','cold','recent','notRecent','transition','wheelLast'];
const COVERAGES=[3,4];

function parseTs(r){const t=Date.parse(r.ts??r.timestamp??r.observedAt??r.createdAt);return Number.isFinite(t)?t:null;}
function luckyPairs(r){
  if(Array.isArray(r.lightning))return r.lightning.map(x=>({number:Number(x?.number),multiplier:Number(x?.multiplier)})).filter(x=>Number.isInteger(x.number));
  const nums=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers:(Array.isArray(r.luckyNumbers)?r.luckyNumbers:[]);
  const mults=Array.isArray(r.allLuckyMultipliers)?r.allLuckyMultipliers:[];
  return nums.map((n,i)=>({number:Number(n),multiplier:Number(mults[i])})).filter(x=>Number.isInteger(x.number));
}
function winnerInfo(r){const winner=Number(r.winner);const pairs=luckyPairs(r);const p=pairs.find(x=>x.number===winner);const explicit=Number(r.winnerMultiplier);const multiplier=Number.isFinite(explicit)&&explicit>0?explicit:(Number.isFinite(p?.multiplier)&&p.multiplier>0?p.multiplier:null);return {winner,pairs,winnerLightning:Boolean(r.winnerIsLightning??p),winnerMultiplier:multiplier};}
function round(v,d=6){return Number.isFinite(v)?Number(v.toFixed(d)):null;}
function maxDrawdown(pnls){let equity=0,peak=0,max=0;for(const x of pnls){equity+=x;peak=Math.max(peak,equity);max=Math.max(max,peak-equity);}return max;}
function freqRank(hist,asc=false){const c=Array(37).fill(0);for(const r of hist)c[r.winner]++;return [...Array(37).keys()].sort((a,b)=>asc?(c[a]-c[b]||a-b):(c[b]-c[a]||a-b));}
function recentDistinct(hist){const out=[];for(let i=hist.length-1;i>=0;i--){const n=hist[i].winner;if(!out.includes(n))out.push(n);}return out;}
function transitionRank(hist){const last=hist.at(-1)?.winner,c=Array(37).fill(0);for(let i=1;i<hist.length;i++)if(hist[i-1].winner===last)c[hist[i].winner]++;return [...Array(37).keys()].sort((a,b)=>c[b]-c[a]||a-b);}
function wheelAround(n){const p=POS.get(n);return [...Array(37).keys()].sort((a,b)=>{const da=Math.min((POS.get(a)-p+37)%37,(p-POS.get(a)+37)%37),db=Math.min((POS.get(b)-p+37)%37,(p-POS.get(b)+37)%37);return da-db||a-b;});}
function picksAt(rows,i,c){const hist=rows.slice(Math.max(0,i-c.lookback),i);if(!hist.length)return[];let rank;if(c.mode==='hot')rank=freqRank(hist,false);else if(c.mode==='cold')rank=freqRank(hist,true);else if(c.mode==='recent')rank=[...recentDistinct(hist),...Array(37).keys()].filter((x,k,a)=>a.indexOf(x)===k);else if(c.mode==='notRecent'){const seen=new Set(hist.map(r=>r.winner));rank=[...Array(37).keys()].sort((a,b)=>Number(seen.has(a))-Number(seen.has(b))||a-b);}else if(c.mode==='transition')rank=transitionRank(hist);else rank=wheelAround(hist.at(-1).winner);return rank.slice(0,c.pickCount);}

const raw=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map((s,i)=>({...JSON.parse(s),_rawIndex:i}));
let rows=raw.filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))&&Number(r.winner)>=0&&Number(r.winner)<=36).map(r=>({...r,...winnerInfo(r),_ts:parseTs(r)}));
if(!rows.every(r=>r._ts!=null))throw new Error('All eligible rows need timestamps');
rows.sort((a,b)=>a._ts-b._ts||a._rawIndex-b._rawIndex);
if(rows.length<1000)throw new Error('Need >=1000 rounds');

const gaps=[];let lastLightning=null;
for(let i=0;i<rows.length;i++){if(rows[i].winnerLightning)lastLightning=i;gaps[i]=lastLightning==null?null:i-lastLightning;}
const N=rows.length,C1=Math.floor(N*.6),C2=Math.floor(N*.8);
const SPLITS={discovery:[0,C1],validation:[C1,C2],holdout:[C2,N]};

function timedEpisodes(from,to){
  const episodes=[];let i=Math.max(from,1);
  while(i<to-1){
    if(gaps[i]!=null&&gaps[i]>=GAP_TRIGGER){
      const rounds=[];
      for(let j=i+1;j<to&&rounds.length<HORIZON;j++){
        rounds.push(j);
        if(rows[j].winnerLightning)break;
      }
      if(rounds.length){episodes.push({anchor:i,rounds,closedByWinningLightning:rows[rounds.at(-1)].winnerLightning});i=rounds.at(-1)+1;continue;}
    }
    i++;
  }
  return episodes;
}
const EPISODES=Object.fromEntries(Object.entries(SPLITS).map(([k,[a,b]])=>[k,timedEpisodes(a,b)]));

function evaluateTimed(c,splitName){
  const episodes=EPISODES[splitName],stakePerNumber=TOTAL_STAKE/c.pickCount;
  let roundsBet=0,hits=0,winningLightningEvents=0,capturedLightning=0,gross=0,totalStake=0;
  const roundPnls=[],sessionPnls=[];let normalCovered=0;
  for(const ep of episodes){
    let spnl=0;
    for(const idx of ep.rounds){
      const p=picksAt(rows,idx,c);if(p.length!==c.pickCount)continue;
      roundsBet++;totalStake+=TOTAL_STAKE;
      const row=rows[idx],hit=p.includes(row.winner);let g=0;
      if(row.winnerLightning)winningLightningEvents++;
      if(hit){hits++;if(row.winnerLightning){capturedLightning++;const m=Number.isFinite(row.winnerMultiplier)?row.winnerMultiplier:NORMAL_GROSS_X;g=stakePerNumber*m;}else{normalCovered++;g=stakePerNumber*NORMAL_GROSS_X;}}
      gross+=g;const pnl=g-TOTAL_STAKE;roundPnls.push(pnl);spnl+=pnl;
    }
    sessionPnls.push(spnl);
  }
  const baseline=c.pickCount/37,rate=hits/Math.max(1,roundsBet),se=Math.sqrt(baseline*(1-baseline)/Math.max(1,roundsBet));
  const pnl=gross-totalStake;
  return {episodes:episodes.length,roundsBet,hits,hitRate:round(rate),uniformNullRate:round(baseline),hitExcess:round(rate-baseline),zVsUniform:round(se?(rate-baseline)/se:null),normalCoveredHits:normalCovered,winningLightningEvents,capturedLightning,captureRateConditionalOnWinningLightning:round(capturedLightning/Math.max(1,winningLightningEvents)),captureNullRate:round(baseline),totalStakeEUR:round(totalStake,2),grossReturnEUR:round(gross,2),netPnlEUR:round(pnl,2),roi:round(pnl/Math.max(1,totalStake)),profitableSessions:sessionPnls.filter(x=>x>0).length,profitableSessionRate:round(sessionPnls.filter(x=>x>0).length/Math.max(1,sessionPnls.length)),breakEvenSessions:sessionPnls.filter(x=>x===0).length,maxDrawdownEUR:round(maxDrawdown(roundPnls),2)};
}
function evaluateAll(c,from,to){let n=0,hits=0;for(let i=Math.max(from,c.lookback);i<to;i++){const p=picksAt(rows,i,c);if(p.length!==c.pickCount)continue;n++;if(p.includes(rows[i].winner))hits++;}const baseline=c.pickCount/37,rate=hits/Math.max(1,n),se=Math.sqrt(baseline*(1-baseline)/Math.max(1,n));return {rounds:n,hits,hitRate:round(rate),uniformNullRate:round(baseline),hitExcess:round(rate-baseline),zVsUniform:round(se?(rate-baseline)/se:null)};}

const allCandidates=[];
for(const pickCount of COVERAGES)for(const lookback of LOOKBACKS)for(const mode of MODES){const c={pickCount,lookback,mode};const disc=evaluateTimed(c,'discovery');if(disc.roundsBet>=100)allCandidates.push({c,discovery:disc});}
const chosen={};
for(const k of COVERAGES){const candidates=allCandidates.filter(x=>x.c.pickCount===k).sort((a,b)=>b.discovery.zVsUniform-a.discovery.zVsUniform||b.discovery.hitExcess-a.discovery.hitExcess||a.c.lookback-b.c.lookback||a.c.mode.localeCompare(b.c.mode));const x=candidates[0];chosen[k]={config:x.c,discovery:x.discovery,validation:evaluateTimed(x.c,'validation'),holdout:evaluateTimed(x.c,'holdout'),allRoundContext:{discovery:evaluateAll(x.c,...SPLITS.discovery),validation:evaluateAll(x.c,...SPLITS.validation),holdout:evaluateAll(x.c,...SPLITS.holdout)},rankedDiscoveryTop5:candidates.slice(0,5).map(y=>({config:y.c,z:y.discovery.zVsUniform,hitRate:y.discovery.hitRate,roi:y.discovery.roi}))};}

const gates={};
for(const k of COVERAGES){const x=chosen[k];gates[k]={validationHitExcessPositive:x.validation.hitExcess>0,holdoutHitExcessPositive:x.holdout.hitExcess>0,validationRoiPositive:x.validation.roi>0,holdoutRoiPositive:x.holdout.roi>0,captureAboveNullValidation:x.validation.captureRateConditionalOnWinningLightning>x.validation.captureNullRate,captureAboveNullHoldout:x.holdout.captureRateConditionalOnWinningLightning>x.holdout.captureNullRate,replicatedHitDirection:x.validation.hitExcess>0&&x.holdout.hitExcess>0,replicatedEconomicDirection:x.validation.roi>0&&x.holdout.roi>0};}

const result={version:'economic-timing-number-combo-oos-v1',generatedAt:new Date().toISOString(),mode:'PAPER_ONLY',source:{file:DATA,rounds:N,chronological:true},frozenTiming:{gapSinceLastWinningLightningAtLeast:GAP_TRIGGER,horizonRounds:HORIZON,episodePolicy:'non-overlapping; session closes at first winning-Lightning event or after 7 future rounds'},split:SPLITS,timedEpisodeCounts:Object.fromEntries(Object.entries(EPISODES).map(([k,v])=>[k,v.length])),selection:{numberModelChosenSeparatelyFor3And4:'discovery timed-round hit z-score vs uniform only',lookbacks:LOOKBACKS,modes:MODES,monetaryOutcomeNotUsedForSelection:true,currentRoundLuckyFeaturesUsed:false},chosen,gates,guards:{exploratoryCombinedStudy:true,noFutureLeakage:true,timingRuleAlreadyFrozenFromPriorOOSStudy:true,numberRuleSelectedOnDiscoveryOnly:true,noRetuningInValidationOrHoldout:true,multiplicityCorrectionStillRequired:true,prospectiveCombinedFreezeOnlyIfReplicated:true,realMoneyAllowed:false},interpretation:'This study asks whether a frozen timing gate and a past-only 3/4-number selector can jointly beat uniform hit rate and produce positive paper economics OOS. Positive PnL alone is insufficient because rare multipliers can dominate monetary results.'};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');console.log('TIMING_NUMBER_COMBO_JSON_START');console.log(JSON.stringify(result,null,2));console.log('TIMING_NUMBER_COMBO_JSON_END');
