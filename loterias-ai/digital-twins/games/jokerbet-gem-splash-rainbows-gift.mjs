import {simulateBernoulli} from '../core/monte-carlo.mjs';

export const STATUS=Object.freeze({
  VERIFIED_OPERATOR_PAGE:'VERIFIED_OPERATOR_PAGE',
  VERIFIED_LIVE_VISUAL:'VERIFIED_LIVE_VISUAL',
  CROSS_OPERATOR_PROVIDER_RULE:'CROSS_OPERATOR_PROVIDER_RULE',
  DERIVED:'DERIVED',
  UNKNOWN:'UNKNOWN'
});

export const CONTRACT=Object.freeze({
  operator:{value:'JOKERBET España',status:STATUS.VERIFIED_OPERATOR_PAGE},
  game:{value:'Gem Splash: Rainbows Gift',status:STATUS.VERIFIED_OPERATOR_PAGE},
  provider:{value:'Playtech',status:STATUS.VERIFIED_OPERATOR_PAGE},
  providerGameCode:{value:'gpas_rgift_pop',status:STATUS.CROSS_OPERATOR_PROVIDER_RULE},
  minStakeEUR:{value:0.10,status:STATUS.VERIFIED_OPERATOR_PAGE},
  maxStakeEUR:{value:100,status:STATUS.VERIFIED_OPERATOR_PAGE},
  displayedRtpPct:{value:96.43,status:STATUS.VERIFIED_OPERATOR_PAGE},
  jackpotContributionPct:{value:3.96,status:STATUS.CROSS_OPERATOR_PROVIDER_RULE},
  separatedBaseRtpPct:{value:92.47,status:STATUS.DERIVED},
  tiers:{value:['Grand','Major','Minor'],status:STATUS.CROSS_OPERATOR_PROVIDER_RULE},
  majorMustAwardBeforePaysBy:{value:true,status:STATUS.CROSS_OPERATOR_PROVIDER_RULE},
  minorMustAwardBeforePaysBy:{value:true,status:STATUS.CROSS_OPERATOR_PROVIDER_RULE},
  anyStakeCanActivate:{value:true,status:STATUS.CROSS_OPERATOR_PROVIDER_RULE},
  higherStakeHigherJackpotChance:{value:true,status:STATUS.CROSS_OPERATOR_PROVIDER_RULE},
  liveMajorAmountEUR:{value:null,status:STATUS.UNKNOWN},
  liveMajorPaysByEUR:{value:null,status:STATUS.UNKNOWN},
  liveMinorAmountEUR:{value:null,status:STATUS.UNKNOWN},
  liveMinorPaysByEUR:{value:null,status:STATUS.UNKNOWN},
  netCaptureProbabilityLowerBound:{value:null,status:STATUS.UNKNOWN},
  displayFreshnessBoundMs:{value:null,status:STATUS.UNKNOWN}
});

export function separatedBaseRatio(){return CONTRACT.separatedBaseRtpPct.value/100;}
export function baseLossRatio(){return 1-separatedBaseRatio();}
export function requiredNetCaptureProbability({stakeEUR,jackpotAwardEUR}){
  if(!(stakeEUR>=CONTRACT.minStakeEUR.value&&stakeEUR<=CONTRACT.maxStakeEUR.value)) throw new Error('STAKE_OUTSIDE_JOKERBET_PAGE_BOUNDS');
  if(!(jackpotAwardEUR>0)) throw new Error('POSITIVE_JACKPOT_REQUIRED');
  return stakeEUR*baseLossRatio()/jackpotAwardEUR;
}
export function distanceToPaysBy({amountEUR,paysByEUR}){
  if(!(amountEUR>=0&&paysByEUR>amountEUR)) throw new Error('VALID_LIVE_PAYS_BY_REQUIRED');
  return {gapEUR:paysByEUR-amountEUR,fractionRemaining:(paysByEUR-amountEUR)/paysByEUR};
}
export function conditionalReturnRatio({stakeEUR,jackpotAwardEUR,netCaptureProbability}){
  if(!(netCaptureProbability>=0&&netCaptureProbability<=1)) throw new Error('PROBABILITY_RANGE');
  return separatedBaseRatio()+netCaptureProbability*jackpotAwardEUR/stakeEUR;
}
export function monteCarloConditional({stakeEUR,jackpotAwardEUR,netCaptureProbability,trials=5_000_000,seed=20260903,confidence=0.99}){
  const mc=simulateBernoulli({probability:netCaptureProbability,trials,seed,confidence});
  const ev=p=>conditionalReturnRatio({stakeEUR,jackpotAwardEUR,netCaptureProbability:p});
  return {...mc,centralReturnRatio:ev(mc.observedProbability),lowerReturnRatio:ev(mc.interval.lower),upperReturnRatio:ev(mc.interval.upper),scope:'PARAMETRIC_CONDITIONAL_ONLY',execution:'NO_PLAY'};
}
export function executionGate(state={}){
  const required=['stakeEUR','tier','liveAmountEUR','paysByEUR','netCaptureProbabilityLowerBound','runtimeBinding','displayFreshnessMs'];
  const missing=required.filter(k=>state[k]===null||state[k]===undefined);
  if(missing.length)return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'LIVE_INPUTS_MISSING',missing};
  if(state.runtimeBinding!==STATUS.VERIFIED_LIVE_VISUAL)return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'JOKERBET_LIVE_VISUAL_BINDING_REQUIRED'};
  if(!['Major','Minor'].includes(state.tier))return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'MHB_TIER_REQUIRED'};
  const distance=distanceToPaysBy({amountEUR:state.liveAmountEUR,paysByEUR:state.paysByEUR});
  const requiredP=requiredNetCaptureProbability({stakeEUR:state.stakeEUR,jackpotAwardEUR:state.liveAmountEUR});
  const lower=conditionalReturnRatio({stakeEUR:state.stakeEUR,jackpotAwardEUR:state.liveAmountEUR,netCaptureProbability:state.netCaptureProbabilityLowerBound});
  if(!(lower>1))return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'LOWER_BOUND_NOT_POSITIVE_EV',requiredNetCaptureProbability:requiredP,lowerReturnRatio:lower,...distance};
  return {decision:'MATH_CANDIDATE_REQUIRES_FRESH_ACCEPTANCE_CHECK',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,requiredNetCaptureProbability:requiredP,lowerReturnRatio:lower,...distance};
}
