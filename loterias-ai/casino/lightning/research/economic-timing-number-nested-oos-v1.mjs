#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/economic-multiplier-window-prospective-freeze-v1.json';
const OUT='loterias-ai/casino/lightning/evidence/economic-timing-number-nested-oos-v1.json';
const TOTAL_STAKE=15;
const NORMAL_GROSS_X=30;
const ALPHA=0.05;
const MIN_TIMED_ROUNDS=60;
const LOOKBACKS=[5,8,10,12,15,20,30,50,80,120,200];
const MODES=['hot','cold','recent','notRecent','transition','wheelLast'];
const COVERAGES=[3,4];
const WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const POS=new Map(WHEEL.map((n,i)=>[n,i]));

function parseTs(r){const t=Date.parse(r.ts??r.timestamp??r.observedAt??r.createdAt);return Number.isFinite(t)?t:null;}
function luckyPairs(r){
  if(Array.isArray(r.lightning))return r.lightning.map(x=>({number:Number(x?.number),multiplier:Number(x?.multiplier)})).filter(x=>Number.isInteger(x.number));
  const nums=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers:(Array.isArray(r.luckyNumbers)?r.luckyNumbers:[]);
  const mults=Array.isArray(r.allLuckyMultipliers)?r.allLuckyMultipliers:[];
  return nums.map((n,i)=>({number:Number(n),multiplier:Number(mults[i])})).filter(x=>Number.isInteger(x.number));
}
function winnerInfo(r){
  const winner=Number(r.winner),pairs=luckyPairs(r),p=pairs.find(x=>x.number===winner),explicit=Number(r.winnerMultiplier);
  const multiplier=Number.isFinite(explicit)&&explicit>0?explicit:(Number.isFinite(p?.multiplier)&&p.multiplier>0?p.multiplier:null);
  return {winner,pairs,winnerLightning:Boolean(r.winnerIsLightning??p),winnerMultiplier:multiplier};
}
function round(v,d=6){return Number.isFinite(v)?Number(v.toFixed(d)):null;}
function logFactTable(n){const a=[0];for(let i=1;i<=n;i++)a[i]=a[i-1]+Math.log(i);return a;}
function binomialUpperTail(n,k,p,lf){
  if(k<=0)return 1;if(k>n)return 0;if(p<=0)return 0;if(p>=1)return 1;
  let s=0;
  for(let x=k;x<=n;x++){
    const lp=lf[n]-lf[x]-lf[n-x]+x*Math.log(p)+(n-x)*Math.log(1-p);
    s+=Math.exp(lp);
  }
  return Math.min(1,s);
}
function maxDrawdown(pnls){let equity=0,peak=0,max=0;for(const x of pnls){equity+=x;peak=Math.max(peak,equity);max=Math.max(max,peak-equity);}return max;}
function freqRank(hist,asc=false){const c=Array(37).fill(0);for(const r of hist)c[r.winner]++;return [...Array(37).keys()].sort((a,b)=>asc?(c[a]-c[b]||a-b):(c[b]-c[a]||a-b));}
function recentDistinct(hist){const out=[];for(let i=hist.length-1;i>=0;i--){const n=hist[i].winner;if(!out.includes(n))out.push(n);}return out;}
function transitionRank(hist){const last=hist.at(-1)?.winner,c=Array(37).fill(0);for(let i=1;i<hist.length;i++)if(hist[i-1].winner===last)c[hist[i].winner]++;return [...Array(37).keys()].sort((a,b)=>c[b]-c[a]||a-b);}
function wheelAround(n){const p=POS.get(n);return [...Array(37).keys()].sort((a,b)=>{const da=Math.min((POS.get(a)-p+37)%37,(p-POS.get(a)+37)%37),db=Math.min((POS.get(b)-p+37)%37,(p-POS.get(b)+37)%37);return da-db||a-b;});}
function picksAt(rows,i,c){
  const hist=rows.slice(Math.max(0,i-c.lookback),i);if(!hist.length)return[];
  let rank;
  if(c.mode==='hot')rank=freqRank(hist,false);
  else if(c.mode==='cold')rank=freqRank(hist,true);
  else if(c.mode==='recent')rank=[...recentDistinct(hist),...Array(37).keys()].filter((x,k,a)=>a.indexOf(x)===k);
  else if(c.mode==='notRecent'){const seen=new Set(hist.map(r=>r.winner));rank=[...Array(37).keys()].sort((a,b)=>Number(seen.has(a))-Number(seen.has(b))||a-b);}
  else if(c.mode==='transition')rank=transitionRank(hist);
  else rank=wheelAround(hist.at(-1).winner);
  return rank.slice(0,c.pickCount);
}
function randomPicks(roundIndex,k){
  let x=(0x9e3779b9 ^ Math.imul(roundIndex+1,0x85ebca6b) ^ Math.imul(k,0xc2b2ae35))>>>0;
  const out=[];
  while(out.length<k){
    x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;
    const n=x%37;if(!out.includes(n))out.push(n);
  }
  return out;
}

const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(freeze?.frozenRule?.noRetuning!==true)throw new Error('Immutable timing freeze required');
const GAP_TRIGGER=Number(freeze.frozenRule.roundsSinceLastWinningLightningAtLeast);
const HORIZON=Number(freeze.frozenRule.predictNextRounds);
if(!Number.isInteger(GAP_TRIGGER)||!Number.isInteger(HORIZON))throw new Error('Invalid frozen timing rule');

const raw=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map((s,i)=>({...JSON.parse(s),_rawIndex:i}));
let rows=raw.filter(r=>r.trainingEligible!==false&&Number.isInteger(Number(r.winner))&&Number(r.winner)>=0&&Number(r.winner)<=36)
  .map(r=>({...r,...winnerInfo(r),_ts:parseTs(r)}));
if(!rows.every(r=>r._ts!=null))throw new Error('All eligible rows need timestamps');
rows.sort((a,b)=>a._ts-b._ts||a._rawIndex-b._rawIndex);
if(rows.length<1200)throw new Error('Need >=1200 rounds for nested temporal evaluation');
const N=rows.length,LF=logFactTable(N);

const gaps=[];let lastLightning=null;
for(let i=0;i<N;i++){if(rows[i].winnerLightning)lastLightning=i;gaps[i]=lastLightning==null?null:i-lastLightning;}

const B1=Math.floor(N*.45),B2=Math.floor(N*.60),B3=Math.floor(N*.80);
const SPLITS={
  innerDiscovery:[0,B1],
  innerValidation:[B1,B2],
  outerValidation:[B2,B3],
  outerHoldout:[B3,N]
};

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

function evaluateTimed(c,splitName,kind='model'){
  const episodes=EPISODES[splitName],stakePerNumber=TOTAL_STAKE/c.pickCount,baseline=c.pickCount/37;
  let roundsBet=0,hits=0,winningLightningEvents=0,capturedLightning=0,gross=0,totalStake=0,normalCovered=0;
  const roundPnls=[],sessionPnls=[];
  for(const ep of episodes){
    let spnl=0;
    for(const idx of ep.rounds){
      const p=kind==='random'?randomPicks(idx,c.pickCount):picksAt(rows,idx,c);
      if(p.length!==c.pickCount)continue;
      roundsBet++;totalStake+=TOTAL_STAKE;
      const row=rows[idx],hit=p.includes(row.winner);let g=0;
      if(row.winnerLightning)winningLightningEvents++;
      if(hit){
        hits++;
        if(row.winnerLightning){capturedLightning++;const m=Number.isFinite(row.winnerMultiplier)?row.winnerMultiplier:NORMAL_GROSS_X;g=stakePerNumber*m;}
        else{normalCovered++;g=stakePerNumber*NORMAL_GROSS_X;}
      }
      gross+=g;const pnl=g-TOTAL_STAKE;roundPnls.push(pnl);spnl+=pnl;
    }
    sessionPnls.push(spnl);
  }
  const rate=hits/Math.max(1,roundsBet),pOne=binomialUpperTail(roundsBet,hits,baseline,LF),pnl=gross-totalStake;
  return {
    episodes:episodes.length,roundsBet,hits,hitRate:round(rate),uniformNullRate:round(baseline),hitExcess:round(rate-baseline),
    oneSidedExactBinomialP:round(pOne,9),normalCoveredHits:normalCovered,winningLightningEvents,capturedLightning,
    captureRateConditionalOnWinningLightning:round(capturedLightning/Math.max(1,winningLightningEvents)),captureNullRate:round(baseline),
    totalStakeEUR:round(totalStake,2),grossReturnEUR:round(gross,2),netPnlEUR:round(pnl,2),roi:round(pnl/Math.max(1,totalStake)),
    profitableSessions:sessionPnls.filter(x=>x>0).length,profitableSessionRate:round(sessionPnls.filter(x=>x>0).length/Math.max(1,sessionPnls.length)),
    maxDrawdownEUR:round(maxDrawdown(roundPnls),2)
  };
}

const resultByCoverage={};
for(const pickCount of COVERAGES){
  const configs=[];
  for(const lookback of LOOKBACKS)for(const mode of MODES){
    const c={pickCount,lookback,mode},d=evaluateTimed(c,'innerDiscovery'),v=evaluateTimed(c,'innerValidation');
    if(d.roundsBet<MIN_TIMED_ROUNDS||v.roundsBet<MIN_TIMED_ROUNDS)continue;
    configs.push({config:c,innerDiscovery:d,innerValidation:v});
  }
  const m=configs.length;
  for(const x of configs)x.development={
    comparisons:m,
    bonferroniP:round(Math.min(1,x.innerValidation.oneSidedExactBinomialP*m),9),
    positiveBoth:x.innerDiscovery.hitExcess>0&&x.innerValidation.hitExcess>0
  };
  configs.sort((a,b)=>
    Number(b.development.positiveBoth)-Number(a.development.positiveBoth)||
    a.development.bonferroniP-b.development.bonferroniP||
    b.innerValidation.hitExcess-a.innerValidation.hitExcess||
    b.innerDiscovery.hitExcess-a.innerDiscovery.hitExcess||
    a.config.lookback-b.config.lookback||
    a.config.mode.localeCompare(b.config.mode)
  );
  const multiplicityPass=configs.find(x=>x.development.positiveBoth&&x.development.bonferroniP<=ALPHA)||null;
  const selected=multiplicityPass||configs[0]||null;
  if(!selected){resultByCoverage[pickCount]={status:'NO_ELIGIBLE_CONFIG'};continue;}
  const ov=evaluateTimed(selected.config,'outerValidation'),oh=evaluateTimed(selected.config,'outerHoldout');
  const rv=evaluateTimed({pickCount},'outerValidation','random'),rh=evaluateTimed({pickCount},'outerHoldout','random');
  const formalDevelopmentPass=Boolean(multiplicityPass);
  const outerValidationPass=formalDevelopmentPass&&ov.hitExcess>0&&ov.oneSidedExactBinomialP<=ALPHA;
  const outerHoldoutPass=outerValidationPass&&oh.hitExcess>0&&oh.oneSidedExactBinomialP<=ALPHA;
  const economicDirectionPass=outerValidationPass&&outerHoldoutPass&&ov.roi>0&&oh.roi>0;
  resultByCoverage[pickCount]={
    status:formalDevelopmentPass?'DEVELOPMENT_MULTIPLICITY_PASS':'EXPLORATORY_ONLY_NO_MULTIPLICITY_PASS',
    selectedConfig:selected.config,
    selectionUsedOuterData:false,
    development:{
      innerDiscovery:selected.innerDiscovery,
      innerValidation:selected.innerValidation,
      comparisons:m,
      bonferroniP:selected.development.bonferroniP,
      positiveBoth:selected.development.positiveBoth,
      multiplicityPass:formalDevelopmentPass,
      top5:configs.slice(0,5).map(x=>({config:x.config,innerDiscoveryHitExcess:x.innerDiscovery.hitExcess,innerValidationHitExcess:x.innerValidation.hitExcess,innerValidationRawP:x.innerValidation.oneSidedExactBinomialP,bonferroniP:x.development.bonferroniP,positiveBoth:x.development.positiveBoth}))
    },
    outerValidation:ov,
    outerHoldout:oh,
    deterministicRandomNull:{outerValidation:rv,outerHoldout:rh},
    gates:{
      developmentMultiplicityPass:formalDevelopmentPass,
      outerValidationExactPass:outerValidationPass,
      outerHoldoutExactPass:outerHoldoutPass,
      positiveEconomicDirectionBoth:economicDirectionPass,
      candidateMayEnterNewProspectiveFreeze:economicDirectionPass
    }
  };
}

const anyProspectiveCandidate=COVERAGES.some(k=>resultByCoverage[k]?.gates?.candidateMayEnterNewProspectiveFreeze===true);
const result={
  version:'economic-timing-number-nested-oos-v1',
  generatedAt:new Date().toISOString(),
  mode:'PAPER_ONLY',
  source:{file:DATA,rounds:N,chronological:true},
  frozenTiming:{freezeVersion:freeze.version,frozenAt:freeze.frozenAt,gapSinceLastWinningLightningAtLeast:GAP_TRIGGER,horizonRounds:HORIZON,immutable:true},
  split:SPLITS,
  splitPolicy:'45% inner discovery / 15% inner validation for model development; 20% outer validation; 20% untouched outer holdout',
  timedEpisodeCounts:Object.fromEntries(Object.entries(EPISODES).map(([k,v])=>[k,v.length])),
  candidateFamily:{lookbacks:LOOKBACKS,modes:MODES,coverages:COVERAGES,minimumTimedRoundsPerDevelopmentSplit:MIN_TIMED_ROUNDS},
  multiplicity:{method:'Bonferroni on exact one-sided binomial p-values in inner validation',alpha:ALPHA,appliedBeforeOuterValidation:true},
  results:resultByCoverage,
  gates:{anyProspectiveCandidate,automaticProspectiveFreezeCreated:false,realMoneyAllowed:false},
  guards:{
    noFutureLeakage:true,
    timingRuleReadFromImmutableFreeze:true,
    numberModelSelectionUsesOnlyFirst60Percent:true,
    outerValidationNotUsedForSelection:true,
    outerHoldoutNotUsedForSelection:true,
    monetaryOutcomeNotUsedForSelection:true,
    exactBinomialNull:'pickCount/37',
    deterministicRandomEmpiricalNullIncluded:true,
    multiplicityCorrectionRequired:true,
    failedPriorSelectorNotRetunedOnItsHoldout:true,
    anyNewProspectiveFreezeRequiresSeparateVersionAndFreshFutureRounds:true,
    realMoneyAllowed:false
  },
  interpretation:anyProspectiveCandidate
    ?'At least one nested-development selector survived multiplicity plus both outer temporal gates and paper-economic direction. It is still not a real-money edge: a separately versioned prospective freeze on fresh future rounds is required.'
    :'No selector is authorized for prospective promotion by this nested tournament. The timing lane may remain independently alive, but number selection remains unproven.'
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log('NESTED_TIMING_NUMBER_JSON_START');
console.log(JSON.stringify(result,null,2));
console.log('NESTED_TIMING_NUMBER_JSON_END');
