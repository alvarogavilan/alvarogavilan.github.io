const VERSION='aotg-live-roulette-stake-scaling-gate-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const execution=()=>({...EXECUTION});
const VALID_MODELS=new Set(['INDEPENDENT_OF_STAKE','PROPORTIONAL_TO_STAKE','PROPORTIONAL_TO_CONTRIBUTION','UNKNOWN']);

export function contributionCapThreshold({contributionRatePct,contributionCapEUR}={}){
  const rate=num(contributionRatePct),cap=num(contributionCapEUR);
  if(!(rate>0&&cap>=0))return null;
  return cap/(rate/100);
}

export function classifyStakeScalingEvidence(observations=[]){
  const rows=(Array.isArray(observations)?observations:[]).map(o=>({
    sourceClass:String(o?.sourceClass||'UNKNOWN'),
    source:String(o?.source||''),
    exactProductBinding:o?.exactProductBinding===true,
    model:VALID_MODELS.has(String(o?.model||'UNKNOWN'))?String(o?.model||'UNKNOWN'):'UNKNOWN',
    note:String(o?.note||'')
  }));
  const exact=rows.filter(r=>r.exactProductBinding&&r.model!=='UNKNOWN');
  const exactModels=[...new Set(exact.map(r=>r.model))];
  const allModels=[...new Set(rows.filter(r=>r.model!=='UNKNOWN').map(r=>r.model))];
  if(exactModels.length>1)return {version:VERSION,status:'EXACT_CONFLICT_FAIL_CLOSED',models:exactModels,observations:rows,execution:execution()};
  if(exactModels.length===1)return {version:VERSION,status:'EXACT_MODEL_RESEARCH_VERIFIED',model:exactModels[0],observations:rows,execution:execution(),executionAllowed:false};
  if(allModels.length>1)return {version:VERSION,status:'CROSS_SOURCE_CONFLICT_REQUIRES_EXACT_RULE',models:allModels,observations:rows,execution:execution()};
  if(allModels.length===1)return {version:VERSION,status:'SINGLE_CROSS_SOURCE_HYPOTHESIS_ONLY',model:allModels[0],observations:rows,execution:execution()};
  return {version:VERSION,status:'NO_STAKE_SCALING_EVIDENCE',observations:rows,execution:execution()};
}

export function compareStakeScalingHypotheses(input={}){
  const rate=num(input.contributionRatePct),cap=num(input.contributionCapEUR),minStake=num(input.minimumStakeEUR),maxStake=num(input.maximumStakeEUR),steps=Math.max(2,Math.min(1000,Math.floor(num(input.steps)??51)));
  if(!(rate>0&&rate<100&&cap>=0&&minStake>0&&maxStake>=minStake))return {version:VERSION,ok:false,reason:'VALID_RATE_CAP_AND_STAKE_RANGE_REQUIRED',execution:execution()};
  const threshold=contributionCapThreshold({contributionRatePct:rate,contributionCapEUR:cap});
  const stakes=[];
  for(let i=0;i<steps;i++)stakes.push(minStake+(maxStake-minStake)*(i/(steps-1)));
  const baselineStake=minStake;
  const baselineContribution=Math.min(baselineStake*rate/100,cap);
  const rows=stakes.map(stake=>{
    const contribution=Math.min(stake*rate/100,cap);
    const independentWeight=1;
    const proportionalStakeWeight=stake/baselineStake;
    const proportionalContributionWeight=baselineContribution>0?contribution/baselineContribution:null;
    return {stakeEUR:round(stake),contributionEUR:round(contribution),relativeJackpotWeight:{INDEPENDENT_OF_STAKE:round(independentWeight),PROPORTIONAL_TO_STAKE:round(proportionalStakeWeight),PROPORTIONAL_TO_CONTRIBUTION:round(proportionalContributionWeight)},relativeWeightPerStakeEUR:{INDEPENDENT_OF_STAKE:round(independentWeight/stake),PROPORTIONAL_TO_STAKE:round(proportionalStakeWeight/stake),PROPORTIONAL_TO_CONTRIBUTION:round(proportionalContributionWeight/stake)}};
  });
  const bestByModel={};
  for(const model of ['INDEPENDENT_OF_STAKE','PROPORTIONAL_TO_STAKE','PROPORTIONAL_TO_CONTRIBUTION']){
    bestByModel[model]=rows.reduce((best,row)=>!best||row.relativeWeightPerStakeEUR[model]>best.relativeWeightPerStakeEUR[model]?row:best,null);
  }
  return {version:VERSION,ok:true,inputs:{contributionRatePct:rate,contributionCapEUR:cap,minimumStakeEUR:minStake,maximumStakeEUR:maxStake},metrics:{contributionCapThresholdStakeEUR:round(threshold)},rows,bestByModel,practiceVerdict:'MODEL_DISCRIMINATION_REQUIRED_BEFORE_ANY_ECONOMIC_USE',execution:execution(),hardGuards:{relativeWeightIsNotProbability:true,noModelCanBeSelectedFromThisSimulation:true,exactCurrentLiveProductRuleRequired:true,crossSlotScalingCannotBindLiveRoulette:true,editorialClaimCannotAuthorizeExecution:true,noAutomaticBetting:true}};
}

export function evaluateAotgLiveRouletteStakeScaling(bundle={}){
  return {version:VERSION,evidence:classifyStakeScalingEvidence(bundle.observations||[]),hypotheses:compareStakeScalingHypotheses(bundle),execution:execution()};
}
