const VERSION='slot-bet-ladder-practice-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=6)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const execution=()=>({...EXECUTION});

export function normalizeSchedule(schedule=[]){
  if(!Array.isArray(schedule)) return [];
  return schedule.map((x,i)=>({step:i+1,stakeEUR:num(x?.stakeEUR),spins:Math.floor(num(x?.spins)??0)})).filter(x=>x.stakeEUR>0&&x.spins>0);
}

export function evaluateBetLadder(input={}){
  const schedule=normalizeSchedule(input.schedule);
  const rtpPct=num(input.rtpPct);
  if(!schedule.length||rtpPct===null||rtpPct<0||rtpPct>100) return {version:VERSION,ok:false,reason:'VALID_SCHEDULE_AND_RTP_REQUIRED',execution:execution()};
  const totalSpins=schedule.reduce((a,x)=>a+x.spins,0);
  const totalStakeEUR=schedule.reduce((a,x)=>a+x.stakeEUR*x.spins,0);
  const sameDistribution=input.sameOutcomeDistributionAcrossStakes===true;
  const proportional=input.payoutsScaleProportionallyWithStake===true;
  const exactStakeDependentRuleVerified=input.exactStakeDependentRuleVerified===true;
  const expectedReturnEUR=totalStakeEUR*(rtpPct/100);
  const expectedLossEUR=totalStakeEUR-expectedReturnEUR;
  let practiceVerdict='GAME_SPECIFIC_MODEL_REQUIRED';
  let invariantExpectedRtp=null;
  if(sameDistribution&&proportional&&!exactStakeDependentRuleVerified){
    practiceVerdict='BET_LADDER_DOES_NOT_CREATE_EDGE';
    invariantExpectedRtp=true;
  } else if(exactStakeDependentRuleVerified){
    practiceVerdict='STAKE_DEPENDENT_MECHANIC_REQUIRES_EXACT_RULE_MODEL';
    invariantExpectedRtp=false;
  }
  return {version:VERSION,ok:true,schedule,totalSpins,totalStakeEUR:round(totalStakeEUR),rtpPct,expectedReturnEUR:round(expectedReturnEUR),expectedLossEUR:round(expectedLossEUR),practiceVerdict,invariantExpectedRtp,
    exceptionClasses:['different RTP by denomination/configuration','stake-dependent jackpot eligibility','stake-dependent jackpot trigger probability','separate persistent state by denomination/bet level','feature/side-bet purchase that changes math','non-proportional jackpot award or cap'],
    execution:execution(),hardGuards:{videoPatternIsNotMechanicProof:true,spinCountRitualCannotChangeIidRngByItself:true,exactGameRulesOverrideGenericModel:true,syntheticSimulationCannotAuthorizePlay:true}};
}

function mulberry32(seed){let a=(seed>>>0)||0x6d2b79f5;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

export function simulateBetLadder(input={}){
  const base=evaluateBetLadder(input);
  if(!base.ok) return base;
  const trials=Math.max(1,Math.min(2_000_000,Math.floor(num(input.trials)??100000)));
  const hitProbability=num(input.hitProbability);
  const payoutMultiplierOnHit=num(input.payoutMultiplierOnHit);
  if(hitProbability===null||hitProbability<0||hitProbability>1||payoutMultiplierOnHit===null||payoutMultiplierOnHit<0) return {...base,ok:false,reason:'HIT_MODEL_REQUIRED'};
  const impliedRtp=hitProbability*payoutMultiplierOnHit*100;
  const rng=mulberry32(Math.floor(num(input.seed)??1));
  let totalReturn=0,totalStake=0,wins=0;
  for(let t=0;t<trials;t++){
    for(const step of base.schedule){
      for(let i=0;i<step.spins;i++){
        totalStake+=step.stakeEUR;
        if(rng()<hitProbability){wins++;totalReturn+=step.stakeEUR*payoutMultiplierOnHit;}
      }
    }
  }
  return {...base,simulation:{trials,totalSpins:trials*base.totalSpins,wins,totalStakeEUR:round(totalStake),totalReturnEUR:round(totalReturn),observedRtpPct:round(totalStake?100*totalReturn/totalStake:null),impliedModelRtpPct:round(impliedRtp),profitEUR:round(totalReturn-totalStake),seed:Math.floor(num(input.seed)??1)},execution:execution()};
}

export function compareSchedules(input={}){
  const schedules=Array.isArray(input.schedules)?input.schedules:[];
  const rows=schedules.map((schedule,i)=>evaluateBetLadder({...input,schedule})).map((r,i)=>({id:input.ids?.[i]??`schedule-${i+1}`,ok:r.ok,totalStakeEUR:r.totalStakeEUR,totalSpins:r.totalSpins,expectedLossEUR:r.expectedLossEUR,practiceVerdict:r.practiceVerdict}));
  return {version:VERSION,rows,execution:execution(),interpretation:'For identical independent per-euro math, schedule order and stake ladder do not change expected RTP; only total amount wagered changes expected loss.'};
}
