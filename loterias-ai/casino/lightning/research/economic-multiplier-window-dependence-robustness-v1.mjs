#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/economic-multiplier-window-prospective-freeze-v1.json';
const PROVENANCE='loterias-ai/casino/lightning/evidence/economic-multiplier-window-freeze-provenance-v1.json';
const OUT='loterias-ai/casino/lightning/evidence/economic-multiplier-window-dependence-robustness-v1.json';
const BLOCK_SIZES=[7,14,28,56];
const PERMUTATIONS=5000;
const ALPHA=0.05;

function parseTs(r){const t=Date.parse(r.ts??r.timestamp??r.observedAt??r.createdAt);return Number.isFinite(t)?t:null;}
function event(r){
  if(typeof r.winnerIsLightning==='boolean')return r.winnerIsLightning;
  const ns=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers.map(Number):(Array.isArray(r.luckyNumbers)?r.luckyNumbers.map(Number):[]);
  return ns.includes(Number(r.winner));
}
function round(v,d=6){return Number.isFinite(v)?Number(v.toFixed(d)):null;}
function logFactTable(n){const a=[0];for(let i=1;i<=n;i++)a[i]=a[i-1]+Math.log(i);return a;}
function binomialUpperTail(n,k,p,lf){
  if(k<=0)return 1;if(k>n)return 0;if(p<=0)return 0;if(p>=1)return 1;
  let s=0;
  for(let x=k;x<=n;x++)s+=Math.exp(lf[n]-lf[x]-lf[n-x]+x*Math.log(p)+(n-x)*Math.log(1-p));
  return Math.min(1,s);
}
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
function shuffle(a,rand){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function blockPermute(segment,size,rand){
  const blocks=[];for(let i=0;i<segment.length;i+=size)blocks.push(segment.slice(i,i+size));
  return shuffle(blocks,rand).flat();
}
function hashSeed(s){
  let h=2166136261>>>0;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;
}

const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const provenance=JSON.parse(fs.readFileSync(PROVENANCE,'utf8'));
if(provenance.verdict!=='CHAIN_OF_CUSTODY_VERIFIED')throw new Error('Verified provenance required');
const sourceCommit=provenance.auditedArtifacts?.oosEvidence?.commit;
if(!sourceCommit)throw new Error('Missing audited OOS commit');
const sourceRounds=Number(freeze.origin?.sourceRoundsAtFreeze);
const threshold=Number(freeze.frozenRule?.roundsSinceLastWinningLightningAtLeast);
const horizon=Number(freeze.frozenRule?.predictNextRounds);
const p0=Number(freeze.frozenNull?.iidProbabilityAtLeastOneIn7);
const p1=Number(freeze.frozenNull?.empiricalAllAnchor7RoundRateAtFreeze);
if(!Number.isInteger(sourceRounds)||!Number.isInteger(threshold)||!Number.isInteger(horizon))throw new Error('Invalid freeze metadata');

let historical;
try{historical=execFileSync('git',['show',`${sourceCommit}:${DATA}`],{encoding:'utf8',maxBuffer:20*1024*1024});}
catch(e){throw new Error(`Unable to read exact frozen corpus from ${sourceCommit}: ${e.message}`);}
const raw=historical.split(/\r?\n/).filter(Boolean).map((s,i)=>({...JSON.parse(s),_rawIndex:i}));
const rows=raw.filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))&&Number(r.winner)>=0&&Number(r.winner)<=36)
  .map(r=>({...r,_ts:parseTs(r),_event:event(r)}))
  .sort((a,b)=>a._ts-b._ts||a._rawIndex-b._rawIndex);
if(!rows.every(r=>r._ts!=null))throw new Error('Frozen corpus contains missing timestamps');
if(rows.length!==sourceRounds)throw new Error(`Frozen corpus boundary mismatch: expected ${sourceRounds}, got ${rows.length}`);

const events=rows.map(r=>r._event);
const N=events.length,LF=logFactTable(N),C1=Math.floor(N*.6),C2=Math.floor(N*.8);
const SPLITS={validation:[C1,C2],holdout:[C2,N]};

function gapsFor(ev){
  const gaps=[];let last=null;
  for(let i=0;i<ev.length;i++){if(ev[i])last=i;gaps[i]=last==null?null:i-last;}
  return gaps;
}
function episodesFor(ev,from,to){
  const gaps=gapsFor(ev),episodes=[];let i=Math.max(from,1);
  while(i<to-1){
    if(gaps[i]!=null&&gaps[i]>=threshold){
      const future=[];let success=false;
      for(let j=i+1;j<to&&future.length<horizon;j++){
        future.push(j);
        if(ev[j]){success=true;break;}
      }
      if(future.length){
        episodes.push({anchor:i,gapAtTrigger:gaps[i],futureRounds:future.length,success});
        i=future.at(-1)+1;continue;
      }
    }
    i++;
  }
  return episodes;
}
function summarize(ev,from,to){
  const eps=episodesFor(ev,from,to),successes=eps.filter(x=>x.success).length,n=eps.length,rate=successes/Math.max(1,n);
  return {episodes:n,successes,failures:n-successes,successRate:round(rate),liftVsPrimary:round(rate-p0),liftVsSecondary:round(rate-p1),exactBinomialPVsPrimary:round(binomialUpperTail(n,successes,p0,LF),9)};
}
function permutationAudit(splitName,from,to,observed){
  const seg=events.slice(from,to),audits={};
  for(const blockSize of BLOCK_SIZES){
    let ge=0;const rates=[];
    for(let p=0;p<PERMUTATIONS;p++){
      const rand=rng((hashSeed(`${splitName}:${blockSize}`)+Math.imul(p+1,2654435761))>>>0);
      const perm=blockPermute(seg,blockSize,rand);
      const ev=[...events];for(let j=0;j<perm.length;j++)ev[from+j]=perm[j];
      const s=summarize(ev,from,to),rate=s.successRate??0;
      rates.push(rate);if(rate>=observed.successRate-1e-12)ge++;
    }
    rates.sort((a,b)=>a-b);
    const q=x=>rates[Math.min(rates.length-1,Math.max(0,Math.floor(x*(rates.length-1))))];
    audits[blockSize]={
      permutations:PERMUTATIONS,
      empiricalOneSidedP:round((ge+1)/(PERMUTATIONS+1),9),
      nullRateMean:round(rates.reduce((a,b)=>a+b,0)/rates.length),
      nullRateP05:round(q(.05)),nullRateP50:round(q(.50)),nullRateP95:round(q(.95)),
      observedAboveP95:observed.successRate>q(.95)
    };
  }
  return audits;
}

const results={};
for(const [name,[from,to]] of Object.entries(SPLITS)){
  const observed=summarize(events,from,to),blockPermutation=permutationAudit(name,from,to,observed);
  const significantBlocks=Object.values(blockPermutation).filter(x=>x.empiricalOneSidedP<=ALPHA).length;
  results[name]={
    range:[from,to],
    observed,
    blockPermutation,
    gates:{
      positiveVsBothFrozenNulls:observed.successRate>p0&&observed.successRate>p1,
      exactBinomialPrimaryPLe05:observed.exactBinomialPVsPrimary<=ALPHA,
      significantBlockSizesAt05:significantBlocks,
      dependenceRobustDirection:observed.successRate>p0&&significantBlocks>=3
    }
  };
}
const robustBoth=results.validation.gates.dependenceRobustDirection&&results.holdout.gates.dependenceRobustDirection;
const result={
  version:'economic-multiplier-window-dependence-robustness-v1',
  generatedAt:new Date().toISOString(),
  mode:'PAPER_ONLY',
  source:{
    immutableGitCommit:sourceCommit,
    file:DATA,
    rounds:N,
    expectedRoundsAtFreeze:sourceRounds,
    exactFrozenCorpusRecoveredWithGitShow:true
  },
  frozenRule:{threshold,horizon,frozenAt:freeze.frozenAt,noRetuning:true},
  frozenNull:{primary:p0,secondary:p1},
  split:{discoveryNotReanalysed:[0,C1],...SPLITS},
  method:{
    episodePolicy:'non-overlapping; trigger on completed-round gap >= threshold; close at first winning-Lightning or after frozen horizon',
    blockPermutationSizes:BLOCK_SIZES,
    permutationsPerBlockSize:PERMUTATIONS,
    permutationPurpose:'preserve within-block local dependence while disrupting block order; sensitivity analysis, not fresh independent confirmation',
    exactBinomialReportedAsSecondaryCheck:true
  },
  results,
  gates:{
    directionDependenceRobustInValidationAndHoldout:robustBoth,
    freshIndependentConfirmation:false,
    prospectiveFreezeStillAuthoritative:true,
    realMoneyAllowed:false
  },
  guards:{
    exactHistoricalCorpusFromPreFreezeCommit:true,
    ruleNotRetuned:true,
    discoveryNotUsedForThisRobustnessGate:true,
    noCurrentPostFreezeRoundsUsed:true,
    noFutureLeakage:true,
    retrospectiveSensitivityCannotUpgradeEvidenceTier:true,
    prospectiveEvidenceStillRequired:true,
    realMoneyAllowed:false
  },
  interpretation:robustBoth
    ?'The frozen timing direction survives this non-overlapping, block-permutation sensitivity analysis in both validation and holdout. Because this is retrospective reuse of already-seen OOS data, it strengthens robustness but is not a new independent confirmation; the frozen prospective remains decisive.'
    :'The frozen timing direction does not survive the full dependence-aware sensitivity gate in both validation and holdout. This weakens the retrospective timing case; the prospective freeze remains the only route to a stronger claim.'
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log('TIMING_DEPENDENCE_ROBUSTNESS_JSON_START');
console.log(JSON.stringify(result,null,2));
console.log('TIMING_DEPENDENCE_ROBUSTNESS_JSON_END');
