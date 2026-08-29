const VERSION='aotg-live-roulette-ev-screen-v1';
const EXECUTION=Object.freeze({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=8)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const clamp01=x=>Math.max(0,Math.min(1,x));
const execution=()=>({...EXECUTION});
const MODES=new Set(['JACKPOT_SURCHARGE_ADDED_TO_TABLE_STAKE','CONTRIBUTION_WITHIN_TABLE_STAKE_BASE_RTP_EXCLUDES_JACKPOT','RTP_ALREADY_INCLUDES_JACKPOT_EXPECTATION']);
function fail(reason,extra={}){return{version:VERSION,ok:false,reason,...extra,execution:execution()};}
function weightedAward(tiers=[]){
  const rows=(Array.isArray(tiers)?tiers:[]).map(t=>({tier:String(t?.tier||''),amountEUR:num(t?.amountEUR),conditionalProbability:num(t?.conditionalProbability)}));
  if(!rows.length||rows.some(r=>!r.tier||r.amountEUR===null||r.amountEUR<0||r.conditionalProbability===null||r.conditionalProbability<0||r.conditionalProbability>1))return null;
  const sumP=rows.reduce((a,r)=>a+r.conditionalProbability,0);
  if(Math.abs(sumP-1)>1e-9)return null;
  return{rows,weightedAwardEUR:rows.reduce((a,r)=>a+r.amountEUR*r.conditionalProbability,0)};
}
export function screenAotgLiveRoulette(input={}){
  const accountingMode=String(input.accountingMode||'');
  if(!MODES.has(accountingMode))return fail('EXACT_ACCOUNTING_MODE_REQUIRED',{allowedAccountingModes:[...MODES]});
  if(input.accountingModeVerified!==true)return fail('ACCOUNTING_MODE_NOT_VERIFIED');
  const tableStakeEUR=num(input.tableStakeEUR),baseRtpPct=num(input.baseRouletteRtpPct),triggerProbabilityPerRound=num(input.triggerProbabilityPerRound);
  if(!(tableStakeEUR>0)||!(baseRtpPct>=0&&baseRtpPct<=100))return fail('VALID_TABLE_STAKE_AND_BASE_RTP_REQUIRED');
  const wa=weightedAward(input.tiers);
  if(!wa)return fail('VALID_TIER_AMOUNTS_AND_CONDITIONAL_PROBABILITIES_REQUIRED');
  const surchargeRatePct=num(input.jackpotSurchargeRatePct),contributionRatePct=num(input.jackpotContributionRatePct);
  const triggerKnown=triggerProbabilityPerRound!==null&&triggerProbabilityPerRound>=0&&triggerProbabilityPerRound<=1;
  let totalCostEUR=tableStakeEUR,baseExpectedReturnEUR=tableStakeEUR*(baseRtpPct/100),jackpotCostEUR=0;
  if(accountingMode==='JACKPOT_SURCHARGE_ADDED_TO_TABLE_STAKE'){
    if(!(surchargeRatePct>=0&&surchargeRatePct<100))return fail('EXACT_SURCHARGE_RATE_REQUIRED');
    jackpotCostEUR=tableStakeEUR*surchargeRatePct/100; totalCostEUR+=jackpotCostEUR;
  } else if(accountingMode==='CONTRIBUTION_WITHIN_TABLE_STAKE_BASE_RTP_EXCLUDES_JACKPOT'){
    if(!(contributionRatePct>=0&&contributionRatePct<100))return fail('EXACT_CONTRIBUTION_RATE_REQUIRED');
    jackpotCostEUR=tableStakeEUR*contributionRatePct/100;
  } else {
    if(input.rtpIncludesJackpotExpectationVerified!==true)return fail('RTP_INCLUSION_NOT_VERIFIED');
  }
  const weightedAwardEUR=wa.weightedAwardEUR;
  const requiredJackpotEvEUR=Math.max(0,totalCostEUR-baseExpectedReturnEUR);
  const breakEvenTriggerProbability=weightedAwardEUR>0?requiredJackpotEvEUR/weightedAwardEUR:null;
  const jackpotExpectedReturnEUR=triggerKnown?triggerProbabilityPerRound*weightedAwardEUR:null;
  const totalExpectedReturnEUR=jackpotExpectedReturnEUR===null?null:baseExpectedReturnEUR+jackpotExpectedReturnEUR;
  const netEvEUR=totalExpectedReturnEUR===null?null:totalExpectedReturnEUR-totalCostEUR;
  const totalRtpOnCostPct=totalExpectedReturnEUR===null?null:100*totalExpectedReturnEUR/totalCostEUR;
  const observedHazardReady=triggerKnown&&input.triggerProbabilityVerified===true;
  let practiceVerdict='TRIGGER_PROBABILITY_REQUIRED';
  if(accountingMode==='RTP_ALREADY_INCLUDES_JACKPOT_EXPECTATION')practiceVerdict='NO_OVERLAY_MODEL_ALLOWED_RTP_ALREADY_INCLUDES_JACKPOT';
  else if(triggerKnown&&!input.triggerProbabilityVerified)practiceVerdict='UNVERIFIED_TRIGGER_PROBABILITY';
  else if(observedHazardReady)practiceVerdict=netEvEUR>0?'POSITIVE_IN_PRACTICE_REQUIRES_PROSPECTIVE_HOLDOUT':'NON_POSITIVE_IN_PRACTICE';
  return{version:VERSION,ok:true,accountingMode,practiceVerdict,inputs:{tableStakeEUR,baseRouletteRtpPct:baseRtpPct,jackpotSurchargeRatePct:surchargeRatePct,jackpotContributionRatePct:contributionRatePct,triggerProbabilityPerRound,triggerProbabilityVerified:input.triggerProbabilityVerified===true},tiers:wa.rows,metrics:{weightedConditionalJackpotAwardEUR:round(weightedAwardEUR,6),baseExpectedReturnEUR:round(baseExpectedReturnEUR,6),jackpotCostEUR:round(jackpotCostEUR,6),totalCostEUR:round(totalCostEUR,6),requiredJackpotEvEURToBreakEven:round(requiredJackpotEvEUR,6),breakEvenTriggerProbabilityPerRound:round(breakEvenTriggerProbability,12),jackpotExpectedReturnEUR:round(jackpotExpectedReturnEUR,6),totalExpectedReturnEUR:round(totalExpectedReturnEUR,6),netEvEUR:round(netEvEUR,6),totalRtpOnCostPct:round(totalRtpOnCostPct,6)},execution:execution(),hardGuards:{tierProbabilitiesMustBeExactOrConservativelyBounded:true,currentTierAmountsMustBeSynchronized:true,accountingModeMustBeExact:true,triggerProbabilityMustBeProspectiveOrIndependentlyVerified:true,crossSlotContributionCannotPopulateLiveAutomatically:true,noWagerProbe:true,noAutomaticBetting:true}};
}
export function requiredWeightedAwardForHazard(input={}){
  const stake=num(input.tableStakeEUR),baseRtpPct=num(input.baseRouletteRtpPct),p=num(input.triggerProbabilityPerRound),surchargePct=num(input.jackpotSurchargeRatePct)??0;
  if(!(stake>0)||!(baseRtpPct>=0&&baseRtpPct<=100)||!(p>0&&p<=1)||!(surchargePct>=0))return fail('VALID_STAKE_RTP_HAZARD_REQUIRED');
  const totalCost=stake*(1+surchargePct/100),baseReturn=stake*baseRtpPct/100,needed=totalCost-baseReturn;
  return{version:VERSION,ok:true,metrics:{requiredWeightedConditionalJackpotAwardEUR:round(needed/p,6),requiredJackpotEvEURPerRound:round(needed,6)},execution:execution(),hardGuards:{hazardMustBeExactOrConservative:true,accountingMustMatchTarget:true}};
}
export function requiredHazardForWeightedAward(input={}){
  const stake=num(input.tableStakeEUR),baseRtpPct=num(input.baseRouletteRtpPct),award=num(input.weightedConditionalJackpotAwardEUR),surchargePct=num(input.jackpotSurchargeRatePct)??0;
  if(!(stake>0)||!(baseRtpPct>=0&&baseRtpPct<=100)||!(award>0)||!(surchargePct>=0))return fail('VALID_STAKE_RTP_AWARD_REQUIRED');
  const needed=stake*(1+surchargePct/100)-stake*baseRtpPct/100;
  return{version:VERSION,ok:true,metrics:{requiredTriggerProbabilityPerRound:round(clamp01(needed/award),12),rawRequiredTriggerProbabilityPerRound:round(needed/award,12),requiredJackpotEvEURPerRound:round(needed,6)},execution:execution(),hardGuards:{weightedAwardMustUseExactCurrentTiersAndExactTierProbabilities:true,accountingMustMatchTarget:true}};
}
