import {simulateBernoulli} from '../core/monte-carlo.mjs';

export const STATUS=Object.freeze({
  VERIFIED_OPERATOR_BOUND:'VERIFIED_OPERATOR_BOUND',
  VERIFIED_PROVIDER_BOUND:'VERIFIED_PROVIDER_BOUND',
  CROSS_OPERATOR_ONLY:'CROSS_OPERATOR_ONLY',
  UNKNOWN:'UNKNOWN'
});

export const TICKER_CODES=Object.freeze({
  'aognjp-3':{tier:'Extra',status:STATUS.VERIFIED_PROVIDER_BOUND},
  'aognjp-7':{tier:'Instant',status:STATUS.VERIFIED_PROVIDER_BOUND},
  'aognjp-2':{tier:'Daily',status:STATUS.VERIFIED_PROVIDER_BOUND}
});

export const CONTRACTS=Object.freeze({
  bookOfDwarves:{
    game:'Age of the Gods Norse: Book of Dwarves',
    operator:'JOKERBET España',provider:'Playtech',
    separatedBaseRtpPct:94.11,rtpIncludingJackpotPct:95.66,jackpotContributionPct:1.55,
    minStakeEUR:0.10,maxStakeEUR:40,
    activeTiers:['Ultimate','Extra','Instant'],
    extraMhb:true,instantMhb:true,hotSignal:true,
    anyStakeCanActivate:true,higherStakeIncreasesChance:true,mainGameOnly:true,
    linkedAcrossNorseGames:true,status:STATUS.VERIFIED_OPERATOR_BOUND
  },
  kingOfAsgard:{
    game:'Age of the Gods Norse: King of Asgard',
    operator:'JOKERBET España',provider:'Playtech',
    separatedBaseRtpPct:94.56,rtpIncludingJackpotPct:95.11,jackpotContributionPct:0.55,
    minStakeEUR:0.10,maxStakeEUR:60,
    activeTiers:['Ultimate','Extra'],
    extraMhb:true,instantMhb:false,hotSignal:true,
    anyStakeCanActivate:true,higherStakeIncreasesChance:true,mainGameOnly:true,
    linkedAcrossNorseGames:true,status:STATUS.VERIFIED_OPERATOR_BOUND
  },
  waysOfThunder:{
    game:'Age of the Gods Norse: Ways of Thunder',
    operator:'JOKERBET España',provider:'Playtech',
    separatedBaseRtpPct:94.50,rtpIncludingJackpotPct:95.05,jackpotContributionPct:0.55,
    minStakeEUR:0.20,maxStakeEUR:4,
    activeTiers:['Ultimate','Extra','Instant'],
    extraMhb:true,instantMhb:true,hotSignal:true,
    anyStakeCanActivate:true,higherStakeIncreasesChance:true,mainGameOnly:true,
    linkedAcrossNorseGames:true,status:STATUS.VERIFIED_OPERATOR_BOUND
  },
  godsAndGiants:{
    game:'Age of the Gods Norse: Gods and Giants',
    operator:'JOKERBET España',provider:'Playtech',
    separatedBaseRtpPct:94.38,rtpIncludingJackpotPct:94.93,jackpotContributionPct:0.55,
    minStakeEUR:0.20,maxStakeEUR:50,
    activeTiers:['Ultimate','Extra','Instant'],
    extraMhb:true,instantMhb:true,hotSignal:true,
    anyStakeCanActivate:true,higherStakeIncreasesChance:true,mainGameOnly:true,
    linkedAcrossNorseGames:true,status:STATUS.VERIFIED_OPERATOR_BOUND
  },
  norseLegends:{
    game:'Age of the Gods Norse: Norse Legends',
    operator:'JOKERBET España',provider:'Playtech',
    separatedBaseRtpPct:94.20,rtpIncludingJackpotPct:94.75,jackpotContributionPct:0.55,
    minStakeEUR:0.20,maxStakeEUR:5,
    activeTiers:['Ultimate','Extra','Instant'],
    extraMhb:true,instantMhb:true,hotSignal:true,
    anyStakeCanActivate:true,higherStakeIncreasesChance:true,mainGameOnly:true,
    linkedAcrossNorseGames:true,status:STATUS.VERIFIED_OPERATOR_BOUND
  }
});

export function contract(gameId){const c=CONTRACTS[gameId];if(!c)throw new Error('UNKNOWN_NORSE_GAME');return c;}
export function baseRatio(gameId){return contract(gameId).separatedBaseRtpPct/100;}
export function baseLossRatio(gameId){return 1-baseRatio(gameId);}
export function requiredJackpotComponentMultiplier(gameId){const c=contract(gameId);return (100-c.separatedBaseRtpPct)/c.jackpotContributionPct;}
export function requiredNetCaptureProbability({gameId,stakeEUR,jackpotAwardEUR}){
  const c=contract(gameId);
  if(!(stakeEUR>=c.minStakeEUR&&stakeEUR<=c.maxStakeEUR))throw new Error('STAKE_OUTSIDE_OPERATOR_BOUNDS');
  if(!(jackpotAwardEUR>0))throw new Error('POSITIVE_JACKPOT_REQUIRED');
  return stakeEUR*baseLossRatio(gameId)/jackpotAwardEUR;
}
export function rankByRequiredJackpotUplift(){return Object.entries(CONTRACTS).map(([gameId,c])=>({gameId,game:c.game,separatedBaseRtpPct:c.separatedBaseRtpPct,jackpotContributionPct:c.jackpotContributionPct,requiredJackpotComponentMultiplier:requiredJackpotComponentMultiplier(gameId),minStakeEUR:c.minStakeEUR,activeTiers:c.activeTiers})).sort((a,b)=>a.requiredJackpotComponentMultiplier-b.requiredJackpotComponentMultiplier);}
export function hotSignalGate({gameId,tier,isHot,liveAmountEUR,displayedBoundaryEUR,stakeEUR,netCaptureProbabilityLowerBound=null,runtimeBinding=STATUS.UNKNOWN}={}){
  const c=contract(gameId);
  if(!c.activeTiers.includes(tier))return {decision:'NO_PLAY',reason:'TIER_NOT_ACTIVE_IN_EXACT_OPERATOR_CONTRACT',realMoneyAllowed:false,realStakeEUR:0};
  if(runtimeBinding!==STATUS.VERIFIED_OPERATOR_BOUND)return {decision:'NO_PLAY',reason:'LIVE_OPERATOR_BINDING_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  if(!(liveAmountEUR>0&&displayedBoundaryEUR>liveAmountEUR))return {decision:'NO_PLAY',reason:'LIVE_AMOUNT_AND_BOUNDARY_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  if(!(stakeEUR>=c.minStakeEUR&&stakeEUR<=c.maxStakeEUR))return {decision:'NO_PLAY',reason:'STAKE_OUTSIDE_OPERATOR_BOUNDS',realMoneyAllowed:false,realStakeEUR:0};
  if(isHot!==true)return {decision:'NO_PLAY',reason:'HOT_SIGNAL_ABSENT',realMoneyAllowed:false,realStakeEUR:0};
  if(!(Number.isFinite(netCaptureProbabilityLowerBound)&&netCaptureProbabilityLowerBound>0))return {decision:'NO_PLAY',reason:'HOT_IS_QUALITATIVE_NOT_A_NUMERIC_HAZARD_LOWER_BOUND',realMoneyAllowed:false,realStakeEUR:0};
  const lower=baseRatio(gameId)+netCaptureProbabilityLowerBound*liveAmountEUR/stakeEUR;
  if(!(lower>1))return {decision:'NO_PLAY',reason:'LOWER_BOUND_NOT_POSITIVE_EV',lowerReturnRatio:lower,realMoneyAllowed:false,realStakeEUR:0};
  return {decision:'GREEN_MATH_ONLY_REQUIRES_FRESHNESS_AND_ACCEPTANCE_CHECK',lowerReturnRatio:lower,realMoneyAllowed:false,realStakeEUR:0};
}
export function monteCarloConditional({gameId,stakeEUR,jackpotAwardEUR,netCaptureProbability,trials=5_000_000,seed=20260903,confidence=0.99}){
  if(!(netCaptureProbability>=0&&netCaptureProbability<=1))throw new Error('PROBABILITY_RANGE');
  const mc=simulateBernoulli({probability:netCaptureProbability,trials,seed,confidence});
  const ev=p=>baseRatio(gameId)+p*jackpotAwardEUR/stakeEUR;
  return {...mc,gameId,centralReturnRatio:ev(mc.observedProbability),lowerReturnRatio:ev(mc.interval.lower),upperReturnRatio:ev(mc.interval.upper),scope:'PARAMETRIC_CONDITIONAL_ONLY',execution:'NO_PLAY'};
}
