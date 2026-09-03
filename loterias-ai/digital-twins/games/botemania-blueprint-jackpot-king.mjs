export const STATUS=Object.freeze({VERIFIED_OPERATOR_BOUND:'VERIFIED_OPERATOR_BOUND',VERIFIED_PROVIDER_BOUND:'VERIFIED_PROVIDER_BOUND',CROSS_OPERATOR_ONLY:'CROSS_OPERATOR_ONLY',UNKNOWN:'UNKNOWN'});

export const MEGA_BARS=Object.freeze({
  operator:'Botemanía España',
  provider:'Blueprint Gaming',
  game:'Mega Bars Fortune Wheel: Jackpot King',
  baseRtpPct:95.50,
  jackpotCurrentPotContributionPct:0.38,
  jackpotReserveContributionPct:0.11,
  totalJackpotFundingPct:0.49,
  // Botemanía's public page binds coin value 0.10-10 EUR, not TOTAL BET bounds.
  // Several other Blueprint implementations expose a 0.10 total-bet floor, but
  // that cannot be promoted to Botemanía execution evidence without an operator
  // runtime/paytable binding.
  operatorCoinValueRangeEUR:[0.10,10],
  minStakeEUR:0.10,
  minStakeStatus:STATUS.CROSS_OPERATOR_ONLY,
  maxStakeEUR:10,
  maxStakeStatus:STATUS.UNKNOWN,
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
  // Historical direct Botemanía observations show the displayed EUR MBWB
  // values are not invariant: 2026-08-25 ~4078.97/40789.77 and 2026-08-30
  // ~4088.73/40887.38, always at a 1:10 Royal:Regal ratio. Treat boundaries
  // as live display inputs (consistent with currency-equivalent conversion),
  // never as permanent EUR constants.
  boundaryMode:'LIVE_OPERATOR_DISPLAY_REQUIRED_DYNAMIC_CURRENCY_EQUIVALENT',
  exactPotValueToHazardLaw:null,
  exactPotValueToHazardLawStatus:STATUS.UNKNOWN,
  tierSpecificCurrentPotFundingFraction:null,
  tierSpecificCurrentPotFundingStatus:STATUS.UNKNOWN,
  boundaryCrossingAwardOwnershipRule:null,
  boundaryCrossingAwardOwnershipStatus:STATUS.UNKNOWN,
  crossGameHazardWeightEqualityBeyondStakeProportionality:null,
  crossGameHazardWeightEqualityStatus:STATUS.UNKNOWN
});

export function baseReturnRatio(){return MEGA_BARS.baseRtpPct/100;}
export function baseLossRatio(){return 1-baseReturnRatio();}
export function totalFundingRatio(){return MEGA_BARS.totalJackpotFundingPct/100;}
export function currentPotFundingRatio(){return MEGA_BARS.jackpotCurrentPotContributionPct/100;}
export function reserveFundingRatio(){return MEGA_BARS.jackpotReserveContributionPct/100;}

export function requiredJackpotReturnMultiplierVsTotalFunding(){return baseLossRatio()/totalFundingRatio();}
export function requiredJackpotReturnMultiplierVsCurrentPotFunding(){return baseLossRatio()/currentPotFundingRatio();}

export function conservativeReturnFromTier({stakeEUR,jackpotAwardEUR,hazardPerEURLowerBound}){
  if(!(stakeEUR>0)) throw new Error('POSITIVE_STAKE_REQUIRED');
  if(!(jackpotAwardEUR>0)) throw new Error('POSITIVE_JACKPOT_REQUIRED');
  if(!(hazardPerEURLowerBound>=0)) throw new Error('NONNEGATIVE_HAZARD_PER_EUR_REQUIRED');
  const pLower=Math.min(1,hazardPerEURLowerBound*stakeEUR);
  return baseReturnRatio()+pLower*jackpotAwardEUR/stakeEUR;
}

// Botemanía explicitly binds jackpot probability to Total Bet, so the jackpot-hazard
// component is proportional to stake within this exact game/configuration. This does not
// prove equal proportionality constants across different Jackpot King titles.
export function stakeScalingDiagnostic({stakeEUR,hazardPerEUR}){
  if(!(stakeEUR>0&&hazardPerEUR>=0)) throw new Error('VALID_STAKE_AND_HAZARD_REQUIRED');
  return {stakeEUR,nextSpinProbability:Math.min(1,stakeEUR*hazardPerEUR),hazardPerEUR,scope:'WITHIN_BOUND_PROPORTIONAL_STAKE_MODEL_ONLY'};
}

// Model-free terminal route. This deliberately does NOT infer a trigger curve. It can
// only become informative if provider/operator evidence binds all mechanics needed to
// prove that OUR accepted wager necessarily owns an MHB-crossing award. Current Blueprint
// rules say the first player to trigger the jackpot wins, but do not bind meter crossing
// by our contribution as the trigger; therefore this route remains closed unless stronger
// provider/operator evidence appears.
export function terminalCrossingGate({
  tier,stakeEUR,liveAmountEUR,boundaryEUR,
  tierContributionPerEURLowerBound=null,
  runtimeBinding=STATUS.UNKNOWN,
  stakeBoundsBinding=STATUS.UNKNOWN,
  tierFundingBinding=STATUS.UNKNOWN,
  boundaryCrossingOwnershipBinding=STATUS.UNKNOWN,
  acceptedWagerOwnershipVerified=false,
  displayFreshnessVerified=false
}={}){
  if(!['Royal','Regal'].includes(tier)) return {decision:'NO_PLAY',reason:'ONLY_MHB_TIERS_SUPPORTED',realMoneyAllowed:false,realStakeEUR:0};
  if(!(stakeEUR>0)) return {decision:'NO_PLAY',reason:'POSITIVE_TOTAL_BET_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  if(stakeBoundsBinding!==STATUS.VERIFIED_OPERATOR_BOUND) return {decision:'NO_PLAY',reason:'BOTEMANIA_TOTAL_BET_BOUNDS_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  if(!(liveAmountEUR>0&&boundaryEUR>liveAmountEUR)) return {decision:'NO_PLAY',reason:'LIVE_AMOUNT_AND_BOUNDARY_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  if(runtimeBinding!==STATUS.VERIFIED_OPERATOR_BOUND) return {decision:'NO_PLAY',reason:'BOTEMANIA_RUNTIME_BINDING_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  if(tierFundingBinding!==STATUS.VERIFIED_OPERATOR_BOUND&&tierFundingBinding!==STATUS.VERIFIED_PROVIDER_BOUND) return {decision:'NO_PLAY',reason:'TIER_SPECIFIC_FUNDING_LOWER_BOUND_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  if(!(Number.isFinite(tierContributionPerEURLowerBound)&&tierContributionPerEURLowerBound>0)) return {decision:'NO_PLAY',reason:'POSITIVE_TIER_CONTRIBUTION_PER_EUR_REQUIRED',realMoneyAllowed:false,realStakeEUR:0};
  const guaranteedOwnIncrement=stakeEUR*tierContributionPerEURLowerBound;
  const gap=boundaryEUR-liveAmountEUR;
  if(gap>guaranteedOwnIncrement) return {decision:'NO_PLAY',reason:'OWN_WAGER_CANNOT_PROVE_BOUNDARY_CROSSING',gapEUR:gap,guaranteedOwnIncrementEUR:guaranteedOwnIncrement,realMoneyAllowed:false,realStakeEUR:0};
  if(boundaryCrossingOwnershipBinding!==STATUS.VERIFIED_OPERATOR_BOUND&&boundaryCrossingOwnershipBinding!==STATUS.VERIFIED_PROVIDER_BOUND) return {decision:'NO_PLAY',reason:'BOUNDARY_CROSSING_AWARD_OWNERSHIP_NOT_BOUND',gapEUR:gap,guaranteedOwnIncrementEUR:guaranteedOwnIncrement,realMoneyAllowed:false,realStakeEUR:0};
  if(!acceptedWagerOwnershipVerified) return {decision:'NO_PLAY',reason:'ACCEPTED_WAGER_RACE_OWNERSHIP_NOT_VERIFIED',realMoneyAllowed:false,realStakeEUR:0};
  if(!displayFreshnessVerified) return {decision:'NO_PLAY',reason:'LIVE_DISPLAY_FRESHNESS_NOT_VERIFIED',realMoneyAllowed:false,realStakeEUR:0};
  return {decision:'TERMINAL_CROSSING_MATH_CANDIDATE_ONLY',reason:'STILL_REQUIRES_EXACT_AWARD_AND_BASE_EV_CHECK',gapEUR:gap,guaranteedOwnIncrementEUR:guaranteedOwnIncrement,realMoneyAllowed:false,realStakeEUR:0};
}

export function executionGate(state={}){
  const required=['game','stakeEUR','royalAmountEUR','regalAmountEUR','royalBoundaryEUR','regalBoundaryEUR','hazardPerEURLowerBound','runtimeBinding','hazardLawBinding','stakeBoundsBinding'];
  const missing=required.filter(k=>state[k]===null||state[k]===undefined);
  if(missing.length) return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'RUNTIME_OR_HAZARD_INPUTS_MISSING',missing};
  if(state.runtimeBinding!==STATUS.VERIFIED_OPERATOR_BOUND) return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'BOTEMANIA_RUNTIME_BINDING_REQUIRED'};
  if(state.stakeBoundsBinding!==STATUS.VERIFIED_OPERATOR_BOUND) return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'BOTEMANIA_TOTAL_BET_BOUNDS_REQUIRED'};
  if(state.hazardLawBinding!==STATUS.VERIFIED_OPERATOR_BOUND&&state.hazardLawBinding!==STATUS.VERIFIED_PROVIDER_BOUND) return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'POT_VALUE_TO_HAZARD_LAW_NOT_BOUND'};
  if(!(Number.isFinite(state.hazardPerEURLowerBound)&&state.hazardPerEURLowerBound>0)) return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'POSITIVE_HAZARD_PER_EUR_LOWER_BOUND_REQUIRED'};
  const stake=Number(state.stakeEUR);
  const conservative=baseReturnRatio()+Math.min(1,state.hazardPerEURLowerBound*stake)*(Number(state.royalAmountEUR)+Number(state.regalAmountEUR))/stake;
  if(!(conservative>1)) return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,reason:'LOWER_BOUND_NOT_POSITIVE_EV',lowerReturnRatio:conservative};
  return {decision:'GREEN_MATH_ONLY_REQUIRES_FRESH_ACCEPTANCE_CHECK',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,lowerReturnRatio:conservative,reason:'NO_AUTOMATIC_WAGER'};
}
