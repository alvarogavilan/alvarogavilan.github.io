const VERSION='slot-stake-ladder-lab-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const n=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const execution=()=>({...EXECUTION});

function normalizeStages(stages=[]){
  return (Array.isArray(stages)?stages:[]).map((s,i)=>({index:i,stakeEUR:n(s?.stakeEUR),spins:Math.floor(n(s?.spins)??0),condition:s?.condition||'ALWAYS'})).filter(s=>s.stakeEUR>0&&s.spins>0);
}
export function evaluateFixedStakeLadder({rtpPct,stages=[]}={}){
  const rtp=n(rtpPct); const rows=normalizeStages(stages);
  if(!(rtp>=0&&rtp<=200)||!rows.length)return {version:VERSION,ok:false,reason:'VALID_RTP_AND_STAGES_REQUIRED',execution:execution()};
  const totalStake=rows.reduce((a,s)=>a+s.stakeEUR*s.spins,0);
  const expectedReturn=totalStake*(rtp/100);
  const expectedNet=expectedReturn-totalStake;
  return {version:VERSION,ok:true,model:'IID_SCALE_INVARIANT_NULL',stages:rows,totalSpins:rows.reduce((a,s)=>a+s.spins,0),totalStakeEUR:round(totalStake),expectedReturnEUR:round(expectedReturn),expectedNetEUR:round(expectedNet),expectedRoiPct:round((rtp/100-1)*100),theorem:'Changing stake order or denominations cannot change expected ROI when every spin is independent and the payout distribution scales linearly with stake.',execution:execution(),hardGuards:{doesNotApplyWhenExactRulesChangeRtpOrEligibilityByStake:true,doesNotProveAnySpecificSlotIsIidScaleInvariant:true,historyBasedStakeChangesDoNotCreateEdgeUnderNull:true}};
}
export function compareEqualTurnover({rtpPct,a=[],b=[]}={}){
  const A=evaluateFixedStakeLadder({rtpPct,stages:a}),B=evaluateFixedStakeLadder({rtpPct,stages:b});
  if(!A.ok||!B.ok)return {version:VERSION,ok:false,reason:'INVALID_SCHEDULE',execution:execution()};
  const equal=Math.abs(A.totalStakeEUR-B.totalStakeEUR)<1e-9;
  return {version:VERSION,ok:true,equalTurnover:equal,a:A,b:B,expectedNetDifferenceEUR:equal?0:round(A.expectedNetEUR-B.expectedNetEUR),execution:execution()};
}
export function evaluateAdaptiveHistoryStrategy({rtpPct,expectedTotalStakeEUR,usesOnlyPastOutcomes=true,currentSpinInformationLeak=false}={}){
  const rtp=n(rtpPct),stake=n(expectedTotalStakeEUR);
  if(!(rtp>=0&&rtp<=200&&stake>=0))return {version:VERSION,ok:false,reason:'VALID_RTP_AND_EXPECTED_STAKE_REQUIRED',execution:execution()};
  if(currentSpinInformationLeak)return {version:VERSION,ok:false,reason:'INVALID_MODEL_CURRENT_SPIN_INFORMATION',execution:execution()};
  const expectedNet=stake*(rtp/100-1);
  return {version:VERSION,ok:true,model:'PREDICTABLE_STAKE_OPTIONAL_STOPPING_NULL',usesOnlyPastOutcomes,expectedTotalStakeEUR:round(stake),expectedNetEUR:round(expectedNet),expectedRoiPct:round((rtp/100-1)*100),canTurnNegativeGamePositive:false,explanation:'A stake schedule chosen from previous wins/losses may change turnover and variance, but if each next spin retains the same conditional expected return per euro, expected profit remains (RTP-1) × expected total stake.',execution:execution()};
}
export function classifyStakeChangeClaim(input={}){
  const exact=input.exactCurrentRulesVerified===true;
  const changesEligibility=input.explicitStakeDependentEligibility===true;
  const changesProbability=input.explicitStakeDependentFeatureProbability===true;
  const persistentState=input.explicitPersistentStateByStakeLevel===true;
  const onlyCreator=input.creatorOrForumOnly===true;
  let status='NO_MECHANIC_EVIDENCE';
  if(exact&&(changesEligibility||changesProbability||persistentState))status='REAL_STAKE_DEPENDENT_MECHANIC_RESEARCH_CANDIDATE';
  else if(onlyCreator)status='DISCOVERY_ONLY_UNVERIFIED';
  return {version:VERSION,status,mechanics:{changesEligibility,changesProbability,persistentState},execution:execution(),hardGuards:{stakeLadderRitualCannotSelfProveMechanic:true,exactCurrentRulesRequired:true}};
}
export const EXAMPLE_040_060_100=Object.freeze([{stakeEUR:0.40,spins:15},{stakeEUR:0.60,spins:10},{stakeEUR:1.00,spins:5}]);
