import {wilsonInterval} from './confidence-bounds.mjs';

const TIERS=['mega','peak','mini'];

function finite(x){return Number.isFinite(Number(x));}
function tsMs(x){
  if(typeof x==='number'&&Number.isFinite(x)) return x;
  const n=Date.parse(x); if(!Number.isFinite(n)) throw new Error('VALID_TIMESTAMP_REQUIRED');
  return n;
}
function normalize(s){
  if(!s||!finite(s.mega)||!finite(s.peak)||!finite(s.mini)) throw new Error('VALID_METERS_REQUIRED');
  return {t:tsMs(s.t),mega:Number(s.mega),peak:Number(s.peak),mini:Number(s.mini)};
}

export function analyzeMeterSeries(rawSnapshots,{jackpotContributionRate=0.0299,currentPotFundingShare=0.3866}={}){
  if(!Array.isArray(rawSnapshots)||rawSnapshots.length<2) throw new Error('AT_LEAST_TWO_SNAPSHOTS_REQUIRED');
  if(!(jackpotContributionRate>0&&jackpotContributionRate<1&&currentPotFundingShare>0&&currentPotFundingShare<=1)) throw new Error('VALID_FUNDING_RATES_REQUIRED');
  const snapshots=rawSnapshots.map(normalize).sort((a,b)=>a.t-b.t);
  const intervals=[]; const resets=[];
  for(let i=1;i<snapshots.length;i++){
    const a=snapshots[i-1],b=snapshots[i],dtMs=b.t-a.t;
    if(!(dtMs>0)) throw new Error('STRICTLY_INCREASING_TIMESTAMPS_REQUIRED');
    const delta={}; let positiveTotal=0; let hasReset=false;
    for(const tier of TIERS){
      delta[tier]=b[tier]-a[tier];
      if(delta[tier]<0){hasReset=true;resets.push({tier,at:b.t,previous:a[tier],current:b[tier],drop:a[tier]-b[tier]});}
      else positiveTotal+=delta[tier];
    }
    const cleanFundingInterval=!hasReset&&positiveTotal>0;
    const turnoverEUR=cleanFundingInterval?positiveTotal/(jackpotContributionRate*currentPotFundingShare):null;
    const allocationShares=cleanFundingInterval?Object.fromEntries(TIERS.map(t=>[t,delta[t]/positiveTotal])):null;
    intervals.push({from:a.t,to:b.t,seconds:dtMs/1000,delta,positiveTotalEUR:positiveTotal,cleanFundingInterval,turnoverEUR,turnoverPerMinuteEUR:turnoverEUR===null?null:turnoverEUR/(dtMs/60000),allocationShares});
  }
  const clean=intervals.filter(x=>x.cleanFundingInterval);
  const weightedDelta=Object.fromEntries(TIERS.map(t=>[t,clean.reduce((s,x)=>s+x.delta[t],0)]));
  const allDelta=TIERS.reduce((s,t)=>s+weightedDelta[t],0);
  const aggregateAllocationShares=allDelta>0?Object.fromEntries(TIERS.map(t=>[t,weightedDelta[t]/allDelta])):null;
  const totalTurnoverEUR=clean.reduce((s,x)=>s+x.turnoverEUR,0);
  const totalSeconds=clean.reduce((s,x)=>s+x.seconds,0);
  return {snapshots,intervals,resets,cleanFundingIntervals:clean.length,aggregateAllocationShares,totalTurnoverEUR,totalSeconds,turnoverPerMinuteEUR:totalSeconds>0?totalTurnoverEUR/(totalSeconds/60):null,scope:'PASSIVE_METER_OBSERVATION_ONLY',execution:'NO_PLAY'};
}

export function summarizeCompletedCycles(cycles,{boundaryEUR,minCyclesForEmpiricalShape=30,confidence=0.99}={}){
  if(!Array.isArray(cycles)) throw new Error('CYCLES_ARRAY_REQUIRED');
  if(!(boundaryEUR>0)) throw new Error('POSITIVE_BOUNDARY_REQUIRED');
  const valid=cycles.filter(c=>finite(c.hitEUR)&&Number(c.hitEUR)>0&&Number(c.hitEUR)<boundaryEUR).map(c=>Number(c.hitEUR));
  const n=valid.length;
  const mean=n?valid.reduce((a,b)=>a+b,0)/n:null;
  return {completedCycles:n,meanHitEUR:mean,minHitEUR:n?Math.min(...valid):null,maxHitEUR:n?Math.max(...valid):null,boundaryEUR,empiricalShapeEligible:n>=minCyclesForEmpiricalShape,minCyclesForEmpiricalShape,warning:'HIT_AMOUNT_DISTRIBUTION_IS_NOT_NEXT_SPIN_HAZARD'};
}

export function empiricalHitBefore(cycles,amountEUR,{boundaryEUR,confidence=0.99,minCycles=30}={}){
  if(!(amountEUR>0&&boundaryEUR>amountEUR)) throw new Error('AMOUNT_INSIDE_BOUNDARY_REQUIRED');
  const valid=(cycles||[]).filter(c=>finite(c.hitEUR)&&Number(c.hitEUR)>0&&Number(c.hitEUR)<boundaryEUR).map(c=>Number(c.hitEUR));
  if(valid.length<minCycles) return {usable:false,reason:'INSUFFICIENT_OPERATOR_CYCLES',cycles:valid.length,minCycles,execution:'NO_PLAY'};
  const hits=valid.filter(x=>x<=amountEUR).length;
  return {usable:true,cycles:valid.length,hitsAtOrBelowAmount:hits,interval:wilsonInterval(hits,valid.length,confidence),warning:'CDF_ONLY_NOT_NEXT_SPIN_HAZARD',execution:'NO_PLAY'};
}

export function empiricalExecutionGate({operatorCycles=0,minimumOperatorCycles=30,stakeToHazardModelBinding='UNKNOWN',nextSpinHazardLowerBound=null}={}){
  if(operatorCycles<minimumOperatorCycles) return {decision:'NO_PLAY',reason:'INSUFFICIENT_OPERATOR_CYCLES',realMoneyAllowed:false,realStakeEUR:0};
  if(stakeToHazardModelBinding!=='VERIFIED_OPERATOR_BOUND'&&stakeToHazardModelBinding!=='VERIFIED_PROVIDER_BOUND') return {decision:'NO_PLAY',reason:'STAKE_TO_HAZARD_MODEL_NOT_BOUND',realMoneyAllowed:false,realStakeEUR:0};
  if(!(Number.isFinite(nextSpinHazardLowerBound)&&nextSpinHazardLowerBound>0)) return {decision:'NO_PLAY',reason:'POSITIVE_NEXT_SPIN_HAZARD_LOWER_BOUND_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  return {decision:'MODEL_INPUTS_READY_FOR_GAME_EV_GATE',reason:'STILL_REQUIRES_GAME_SPECIFIC_CONSERVATIVE_EV_GT_1',realMoneyAllowed:false,realStakeEUR:0};
}
