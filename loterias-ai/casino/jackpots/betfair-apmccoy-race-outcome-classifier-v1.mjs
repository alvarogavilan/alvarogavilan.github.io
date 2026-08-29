const VERSION='betfair-apmccoy-race-outcome-classifier-v1';
const finiteNonNegative=v=>Number.isFinite(v)&&v>=0;
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});

export function classifyBetfairApMcCoyRaceOutcome(input={}){
  const exactOperatorRuleVerified=input.exactOperatorSimultaneousRuleVerified===true;
  const jackpotAwardObserved=input.jackpotAwardObserved===true;
  const firstWinnerVerified=input.firstWinnerVerified===true;
  const simultaneousSecondWinnerVerified=input.simultaneousSecondWinnerVerified===true;
  const noJackpotAwardVerified=input.noJackpotAwardVerified===true;
  const mutuallyExclusive=[firstWinnerVerified,simultaneousSecondWinnerVerified,noJackpotAwardVerified].filter(Boolean).length<=1;

  let outcome='AMBIGUOUS_FAIL_CLOSED';
  if(mutuallyExclusive&&jackpotAwardObserved&&firstWinnerVerified) outcome='FIRST_WIN';
  else if(mutuallyExclusive&&jackpotAwardObserved&&simultaneousSecondWinnerVerified&&exactOperatorRuleVerified) outcome='SIMULTANEOUS_SECOND_WIN';
  else if(mutuallyExclusive&&!jackpotAwardObserved&&noJackpotAwardVerified) outcome='ORDINARY_LOSS';

  const exactTierSeedEUR=finiteNonNegative(input.exactSameBindingTierSeedEUR)?input.exactSameBindingTierSeedEUR:null;
  const accruedEUR=finiteNonNegative(input.exactSameBindingPostFirstAccruedProgressiveEUR)?input.exactSameBindingPostFirstAccruedProgressiveEUR:null;
  const firstAwardEUR=finiteNonNegative(input.exactObservedFirstWinnerAwardEUR)?input.exactObservedFirstWinnerAwardEUR:null;

  let conservativeJackpotPayoutFloorEUR=null;
  if(outcome==='FIRST_WIN'&&firstAwardEUR!==null) conservativeJackpotPayoutFloorEUR=firstAwardEUR;
  if(outcome==='SIMULTANEOUS_SECOND_WIN'&&exactTierSeedEUR!==null){
    conservativeJackpotPayoutFloorEUR=exactTierSeedEUR+(accruedEUR??0);
  }
  if(outcome==='ORDINARY_LOSS') conservativeJackpotPayoutFloorEUR=0;

  return Object.freeze({
    version:VERSION,
    outcome,
    usableForPayoutFloor:conservativeJackpotPayoutFloorEUR!==null,
    conservativeJackpotPayoutFloorEUR,
    flags:Object.freeze({exactOperatorRuleVerified,jackpotAwardObserved,firstWinnerVerified,simultaneousSecondWinnerVerified,noJackpotAwardVerified,mutuallyExclusive}),
    warnings:Object.freeze([
      ...(!mutuallyExclusive?['CONTRADICTORY_OUTCOME_FLAGS']:[]),
      ...(simultaneousSecondWinnerVerified&&!exactOperatorRuleVerified?['EXACT_OPERATOR_SIMULTANEOUS_RULE_REQUIRED']:[]),
      ...(outcome==='SIMULTANEOUS_SECOND_WIN'&&exactTierSeedEUR===null?['EXACT_SAME_BINDING_TIER_SEED_REQUIRED_FOR_EURO_FLOOR']:[]),
      ...(outcome==='FIRST_WIN'&&firstAwardEUR===null?['EXACT_OBSERVED_FIRST_WINNER_AWARD_REQUIRED_FOR_EURO_FLOOR']:[]),
      ...(outcome==='AMBIGUOUS_FAIL_CLOSED'?['AMBIGUOUS_RACE_OUTCOME_NOT_USABLE']:[])
    ]),
    execution:execution(),
    hardGuards:Object.freeze({
      simultaneousSecondCannotBeCollapsedToZeroLoss:true,
      seedCannotBeInferred:true,
      crossBindingPayoutDataForbidden:true,
      outcomeClassifierCannotCreateRaceProbability:true,
      noAutomaticBetting:true,
      realMoneyAllowed:false
    })
  });
}
