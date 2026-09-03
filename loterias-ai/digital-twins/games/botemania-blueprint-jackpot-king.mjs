export const STATUS=Object.freeze({VERIFIED_OPERATOR_BOUND:'VERIFIED_OPERATOR_BOUND',VERIFIED_PROVIDER_BOUND:'VERIFIED_PROVIDER_BOUND',CROSS_OPERATOR_ONLY:'CROSS_OPERATOR_ONLY',UNKNOWN:'UNKNOWN'});

export const MEGA_BARS=Object.freeze({
  operator:'Botemanía España',
  provider:'Blueprint Gaming',
  game:'Mega Bars Fortune Wheel: Jackpot King',
  baseRtpPct:95.50,
  jackpotCurrentPotContributionPct:0.38,
  jackpotReserveContributionPct:0.11,
  totalJackpotFundingPct:0.49,
  minStakeEUR:0.10,
  maxStakeEUR:10,
  anyStakeEligible:true,
  jackpotChanceProportionalToTotalBet:true,
  networkSharedAcrossBlueprintJackpotKingGames:true,
  royalMustBeWonBy:true,
  regalMustBeWonBy:true,
  jackpotChanceIncreasesWithPotValue:true,
  status:STATUS.VERIFIED_OPERATOR_BOUND
});

export const NETWORK=Object.freeze({
  operator:'Botemanía España',
  network:'Blueprint Jackpot King',
  tiers:['Royal','Regal','Jackpot King'],
  royalLiveAmountEUR:null,
  regalLiveAmountEUR:null,
  jackpotKingLiveAmountEUR:null,
  royalBoundaryEUR:null,
  regalBoundaryEUR:null,
  numericBoundaryStatus:STATUS.UNKNOWN,
  exactPotValueToHazardLaw:null,
  exactPotValueToHazardLawStatus:STATUS.UNKNOWN,
  crossGameHazardWeightEqualityBeyondStakeProportionality:null,
  crossGameHazardWeightEqualityStatus:STATUS.UNKNOWN
});

export function baseReturnRatio(){return MEGA_BARS.baseRtpPct/100;}
export function baseLossRatio(){return 1-baseReturnRatio();}
export function totalFundingRatio(){return MEGA_BARS.totalJackpotFundingPct/100;}
export function currentPotFundingRatio(){return MEGA_BARS.jackpotCurrentPotContributionPct/100;}
export function reserveFundingRatio(){return MEGA_BARS.jackpotReserveContributionPct/100;}

// Diagnostic only: how large the conditional jackpot-system return would need to be
// relative to its long-run funding rate to offset the base-game loss.
export function requiredJackpotReturnMultiplierVsTotalFunding(){return baseLossRatio()/totalFundingRatio();}
export function requiredJackpotReturnMultiplierVsCurrentPotFunding(){return baseLossRatio()/currentPotFundingRatio();}

// If a verified per-EUR hazard lower bound for ONE jackpot tier ever becomes available,
// this gives the conservative return contribution from that tier. Other jackpot/bonus
// returns are deliberately ignored, making this a lower-bound component.
export function conservativeReturnFromTier({stakeEUR,jackpotAwardEUR,hazardPerEURLowerBound}){
  if(!(stakeEUR>=MEGA_BARS.minStakeEUR&&stakeEUR<=MEGA_BARS.maxStakeEUR)) throw new Error('STAKE_OUTSIDE_OPERATOR_BOUNDS');
  if(!(jackpotAwardEUR>0)) throw new Error('POSITIVE_JACKPOT_REQUIRED');
  if(!(hazardPerEURLowerBound>=0)) throw new Error('NONNEGATIVE_HAZARD_PER_EUR_REQUIRED');
  const pLower=Math.min(1,hazardPerEURLowerBound*stakeEUR);
  return baseReturnRatio()+pLower*jackpotAwardEUR/stakeEUR;
}

// Because Botemanía explicitly states jackpot probability is proportional to Total Bet,
// EV per euro is stake-invariant ONLY for the jackpot-hazard component at a fixed game/network state.
// This does NOT prove identical proportionality constants across different Jackpot King titles.
export function stakeScalingDiagnostic({stakeEUR,hazardPerEUR}){
  if(!(stakeEUR>0&&hazardPerEUR>=0)) throw new Error('VALID_STAKE_AND_HAZARD_REQUIRED');
  return {stakeEUR,nextSpinProbability:Math.min(1,stakeEUR*hazardPerEUR),hazardPerEUR,scope:'WITHIN_BOUND_PROPORTIONAL_STAKE_MODEL_ONLY'};
}

export function executionGate(state={}){
  const required=['game','stakeEUR','royalAmountEUR','regalAmountEUR','royalBoundaryEUR','regalBoundaryEUR','hazardPerEURLowerBound','runtimeBinding','hazardLawBinding'];
  const missing=required.filter(k=>state[k]===null||state[k]===undefined);
  if(missing.length) return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'RUNTIME_OR_HAZARD_INPUTS_MISSING',missing};
  if(state.runtimeBinding!==STATUS.VERIFIED_OPERATOR_BOUND) return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'BOTEMANIA_RUNTIME_BINDING_REQUIRED'};
  if(state.hazardLawBinding!==STATUS.VERIFIED_OPERATOR_BOUND&&state.hazardLawBinding!==STATUS.VERIFIED_PROVIDER_BOUND) return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'POT_VALUE_TO_HAZARD_LAW_NOT_BOUND'};
  if(!(Number.isFinite(state.hazardPerEURLowerBound)&&state.hazardPerEURLowerBound>0)) return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'POSITIVE_HAZARD_PER_EUR_LOWER_BOUND_REQUIRED'};
  const stake=Number(state.stakeEUR);
  const conservative=baseReturnRatio()+Math.min(1,state.hazardPerEURLowerBound*stake)*(Number(state.royalAmountEUR)+Number(state.regalAmountEUR))/stake;
  if(!(conservative>1)) return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'LOWER_BOUND_NOT_POSITIVE_EV',lowerReturnRatio:conservative};
  return {decision:'GREEN_MATH_ONLY_REQUIRES_FRESH_ACCEPTANCE_CHECK',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,lowerReturnRatio:conservative,reason:'NO_AUTOMATIC_WAGER'};
}
