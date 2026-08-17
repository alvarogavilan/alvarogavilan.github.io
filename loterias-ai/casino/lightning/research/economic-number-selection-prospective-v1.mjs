#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/economic-number-selection-prospective-freeze-v1.json';
const OUT='loterias-ai/casino/lightning/evidence/economic-number-selection-prospective-status-v1.json';
const TOTAL_STAKE=15;
const NORMAL_GROSS_X=30;
const WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const POS=new Map(WHEEL.map((n,i)=>[n,i]));

const f=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const startMs=Date.parse(f.prospectiveStartsAt);
const phaseARounds=Number(f.twoPhaseProtocol?.phaseA?.rounds);
const phaseBRounds=Number(f.twoPhaseProtocol?.phaseB?.rounds);
const finalBoundary=Number(f.twoPhaseProtocol?.fixedFinalBoundary);
const alphaPerFinalist=Number(f.twoPhaseProtocol?.phaseB?.alphaPerFinalist);
const coverages=f.candidateFamily?.coverages?.map(Number)??[];
const modes=f.candidateFamily?.modes??[];
const lookbacks=f.candidateFamily?.lookbacks?.map(Number)??[];

if(!Number.isFinite(startMs))throw new Error('Invalid prospectiveStartsAt');
if(phaseARounds+phaseBRounds!==finalBoundary)throw new Error('Two-phase boundary mismatch');
if(finalBoundary!==10000)throw new Error('v1 fixed final boundary must remain 10000');
if(alphaPerFinalist!==0.025)throw new Error('v1 finalist alpha changed');
if(JSON.stringify(coverages)!==JSON.stringify([3,4]))throw new Error('v1 coverages changed');
if(modes.length!==6||lookbacks.length!==11)throw new Error('v1 candidate family changed');
if(f.guards?.all132CandidatesFrozenBeforeEligibleFuture!==true||f.guards?.optionalStoppingBlocked!==true)throw new Error('Required freeze guards missing');

function parseTs(r){const t=Date.parse(r.ts??r.timestamp??r.observedAt??r.createdAt);return Number.isFinite(t)?t:null;}
function luckyPairs(r){
  if(Array.isArray(r.lightning))return r.lightning.map(x=>({number:Number(x?.number),multiplier:Number(x?.multiplier)})).filter(x=>Number.isInteger(x.number));
  const nums=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers:(Array.isArray(r.luckyNumbers)?r.luckyNumbers:[]);
  const mults=Array.isArray(r.allLuckyMultipliers)?r.allLuckyMultipliers:[];
  return nums.map((n,i)=>({number:Number(n),multiplier:Number(mults[i])})).filter(x=>Number.isInteger(x.number));
}
function enrich(r){
  const winner=Number(r.winner),pairs=luckyPairs(r),p=pairs.find(x=>x.number===winner),explicit=Number(r.winnerMultiplier);
  const winnerMultiplier=Number.isFinite(explicit)&&explicit>0?explicit:(Number.isFinite(p?.multiplier)&&p.multiplier>0?p.multiplier:null);
  return {...r,winner,pairs,winnerIsLightning:Boolean(r.winnerIsLightning??p),winnerMultiplier,_ts:parseTs(r)};
}
function round(v,d=6){return Number.isFinite(v)?Number(v.toFixed(d)):null;}
function logFacts(n){const a=[0];for(let i=1;i<=n;i++)a[i]=a[i-1]+Math.log(i);return a;}
function binomialUpperTail(n,k,p,lf){
  if(n<=0)return null;if(k<=0)return 1;if(k>n)return 0;
  let s=0;for(let x=k;x<=n;x++)s+=Math.exp(lf[n]-lf[x]-lf[n-x]+x*Math.log(p)+(n-x)*Math.log(1-p));
  return Math.min(1,s);
}
function maxDrawdown(pnls){let eq=0,peak=0,m=0;for(const x of pnls){eq+=x;peak=Math.max(peak,eq);m=Math.max(m,peak-eq)}return m;}
function freqRank(hist,asc=false){const c=Array(37).fill(0);for(const r of hist)c[r.winner]++;return [...Array(37).keys()].sort((a,b)=>asc?(c[a]-c[b]||a-b):(c[b]-c[a]||a-b));}
function recentDistinct(hist){const out=[];for(let i=hist.length-1;i>=0;i--){const n=hist[i].winner;if(!out.includes(n))out.push(n)}return out;}
function transitionRank(hist){const last=hist.at(-1)?.winner,c=Array(37).fill(0);for(let i=1;i<hist.length;i++)if(hist[i-1].winner===last)c[hist[i].winner]++;return [...Array(37).keys()].sort((a,b)=>c[b]-c[a]||a-b);}
function wheelAround(n){const p=POS.get(n);return [...Array(37).keys()].sort((a,b)=>{const pa=POS.get(a),pb=POS.get(b),da=Math.min((pa-p+37)%37,(p-pa+37)%37),db=Math.min((pb-p+37)%37,(p-pb+37)%37);return da-db||a-b;});}
function picksAt(rows,i,c){
  const hist=rows.slice(Math.max(0,i-c.lookback),i);if(!hist.length)return[];
  let rank;
  if(c.mode==='hot')rank=freqRank(hist,false);
  else if(c.mode==='cold')rank=freqRank(hist,true);
  else if(c.mode==='recent')rank=[...recentDistinct(hist),...Array(37).keys()].filter((x,k,a)=>a.indexOf(x)===k);
  else if(c.mode==='notRecent'){const seen=new Set(hist.map(r=>r.winner));rank=[...Array(37).keys()].sort((a,b)=>Number(seen.has(a))-Number(seen.has(b))||a-b);}
  else if(c.mode==='transition')rank=transitionRank(hist);
  else if(c.mode==='wheelLast')rank=wheelAround(hist.at(-1).winner);
  else throw new Error(`Unknown mode ${c.mode}`);
  return rank.slice(0,c.pickCount);
}

const raw=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map((s,i)=>({...JSON.parse(s),_rawIndex:i}));
const rows=raw.filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))&&Number(r.winner)>=0&&Number(r.winner)<=36)
  .map(enrich).sort((a,b)=>a._ts-b._ts||a._rawIndex-b._rawIndex);
if(!rows.length||!rows.every(r=>r._ts!=null))throw new Error('All eligible rows require timestamps');
const LF=logFacts(Math.max(rows.length,finalBoundary));
const eligibleIndices=[];for(let i=0;i<rows.length;i++)if(rows[i]._ts>=startMs)eligibleIndices.push(i);
const fixed=eligibleIndices.slice(0,finalBoundary);
const phaseA=fixed.slice(0,phaseARounds),phaseB=fixed.slice(phaseARounds,finalBoundary);
const configs=[];for(const pickCount of coverages)for(const mode of modes)for(const lookback of lookbacks)configs.push({pickCount,mode,lookback});
if(configs.length!==132)throw new Error(`Expected 132 frozen configs, got ${configs.length}`);

function evaluate(c,indices){
  const baseline=c.pickCount/37,stakePerNumber=TOTAL_STAKE/c.pickCount,pnls=[];
  let hits=0,gross=0,winningLightningEvents=0,capturedWinningLightning=0;
  for(const i of indices){
    const p=picksAt(rows,i,c);if(p.length!==c.pickCount)continue;
    const row=rows[i],hit=p.includes(row.winner);let g=0;
    if(row.winnerIsLightning)winningLightningEvents++;
    if(hit){hits++;if(row.winnerIsLightning){capturedWinningLightning++;g=stakePerNumber*(Number.isFinite(row.winnerMultiplier)?row.winnerMultiplier:NORMAL_GROSS_X)}else g=stakePerNumber*NORMAL_GROSS_X;}
    gross+=g;pnls.push(g-TOTAL_STAKE);
  }
  const n=pnls.length,rate=n?hits/n:null,p=binomialUpperTail(n,hits,baseline,LF),stake=n*TOTAL_STAKE,pnl=gross-stake;
  return {rounds:n,hits,hitRate:round(rate),uniformNullRate:round(baseline),hitExcess:rate==null?null:round(rate-baseline),exactOneSidedP:round(p,9),winningLightningEvents,capturedWinningLightning,captureRate:winningLightningEvents?round(capturedWinningLightning/winningLightningEvents):null,totalStakeEUR:round(stake,2),grossReturnEUR:round(gross,2),netPnlEUR:round(pnl,2),roi:n?round(pnl/stake):null,maxDrawdownEUR:round(maxDrawdown(pnls),2)};
}
function selectWinner(k){
  const candidates=configs.filter(c=>c.pickCount===k).map(c=>({config:c,result:evaluate(c,phaseA)}));
  candidates.sort((a,b)=>(b.result.hitExcess??-Infinity)-(a.result.hitExcess??-Infinity)||(a.result.exactOneSidedP??Infinity)-(b.result.exactOneSidedP??Infinity)||a.config.lookback-b.config.lookback||a.config.mode.localeCompare(b.config.mode));
  return candidates[0];
}

const eligibleCount=eligibleIndices.length,phaseAComplete=eligibleCount>=phaseARounds,finalComplete=eligibleCount>=finalBoundary;
let phase='WAITING_FOR_PROSPECTIVE_START';
if(eligibleCount>0)phase='ACCUMULATING_PHASE_A_BLINDED';
if(phaseAComplete&&!finalComplete)phase='PHASE_A_LOCKED_PHASE_B_BLINDED';
if(finalComplete)phase='FIXED_FINAL_AVAILABLE';

const phaseAWinners={};
if(phaseAComplete){for(const k of coverages){const w=selectWinner(k);phaseAWinners[k]={config:w.config,phaseA:w.result,selectedAtFixedBoundaryRound:phaseARounds};}}
const confirmation={};
let anyNumberEdge=false;
if(finalComplete){
  for(const k of coverages){
    const w=phaseAWinners[k],r=evaluate(w.config,phaseB),pass=r.hitExcess>0&&r.exactOneSidedP!=null&&r.exactOneSidedP<=alphaPerFinalist;
    confirmation[k]={config:w.config,phaseB:r,bonferroniAlpha:alphaPerFinalist,pass};if(pass)anyNumberEdge=true;
  }
}

const result={
  version:'economic-number-selection-prospective-status-v1',
  generatedAt:new Date().toISOString(),
  freezeVersion:f.version,
  prospectiveStartsAt:f.prospectiveStartsAt,
  source:{file:DATA,currentEligibleCorpusRows:rows.length,currentMaxTimestamp:new Date(rows.at(-1)._ts).toISOString()},
  frozenFamily:{coverages,modes,lookbacks,totalCandidates:configs.length},
  progress:{eligibleFutureRounds:eligibleCount,fixedBoundaryUsedRounds:fixed.length,phaseARoundsRequired:phaseARounds,phaseBRoundsRequired:phaseBRounds,fixedFinalBoundary:finalBoundary,roundsUntilPhaseA:Math.max(0,phaseARounds-eligibleCount),roundsUntilFixedFinal:Math.max(0,finalBoundary-eligibleCount),postBoundaryRowsIgnoredForV1:Math.max(0,eligibleCount-finalBoundary)},
  phase,
  disclosure:eligibleCount<phaseARounds?{candidatePerformanceHidden:true,reason:f.readPolicy.before5000}:eligibleCount<finalBoundary?{candidatePerformanceHidden:false,phaseAWinnersVisible:true,phaseBPerformanceHidden:true,reason:f.readPolicy.from5000To9999}:{candidatePerformanceHidden:false,phaseBPerformanceHidden:false,reason:f.readPolicy.at10000},
  phaseAWinners:phaseAComplete?phaseAWinners:null,
  confirmation:finalComplete?confirmation:null,
  gates:{phaseAComplete,fixedFinalComplete:finalComplete,numberSelectionProspectiveEdge:anyNumberEdge,separateTimingGateStillRequired:true,automaticBettingAllowed:false,realMoneyAllowed:false},
  guards:{noHistoricalModelSelection:true,all132CandidatesFrozenBeforeStart:true,phaseAUsesOnlyFirst5000EligibleFutureRounds:true,phaseBUsesOnlyNext5000EligibleFutureRounds:true,phaseBSelectorDeterministicFromPhaseA:true,bonferroniAcrossTwoFinalists:true,optionalStoppingBlocked:true,post10000RowsIgnoredForV1:true,realMoneyAllowed:false},
  interpretation:!phaseAComplete?'No selector ranking is disclosed before the fixed 5000-round prospective selection boundary.':!finalComplete?'The two phase-A winners are fixed deterministically. Phase-B outcomes remain blinded until the 10000-round fixed final boundary.':anyNumberEdge?'At least one coverage finalist beat k/37 at the preregistered Bonferroni threshold on the independent phase-B window. This is a separate prospective number-selection signal, not permission for real-money play and not proof that the timing hypothesis passes.':'Neither finalist confirmed above k/37 at the preregistered Bonferroni threshold. v1 is a prospective failure and later rows cannot rescue it.'
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log('NUMBER_PROSPECTIVE_JSON_START');console.log(JSON.stringify(result,null,2));console.log('NUMBER_PROSPECTIVE_JSON_END');
