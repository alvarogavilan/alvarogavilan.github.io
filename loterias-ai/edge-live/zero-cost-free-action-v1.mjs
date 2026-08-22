#!/usr/bin/env node

export const FREE_ACTION_ID='botemania-tiene-huevos-daily';

export function evaluateZeroCostFreeAction({
  officialRuleVerified=false,
  accountShowsPromotion=null,
  cashCostEUR=0,
  potentialPrizeTypes=[],
  dailyFreeAttempts=null,
}={}){
  const zeroCashCost=Number(cashCostEUR)===0;
  const potentialPositivePrize=Array.isArray(potentialPrizeTypes)&&potentialPrizeTypes.length>0;
  const accountEligibilityVerified=accountShowsPromotion===true;
  const explicitlyUnavailable=accountShowsPromotion===false;

  let state='CHECK_ACCOUNT_AVAILABILITY';
  let action='OPEN_FREE_DAILY_PAGE';
  let freeActionAllowed=officialRuleVerified&&zeroCashCost&&!explicitlyUnavailable;

  if(accountEligibilityVerified&&officialRuleVerified&&zeroCashCost&&potentialPositivePrize){
    state='GREEN_FREE_ACTION';
    action='CLAIM_FREE_DAILY';
    freeActionAllowed=true;
  } else if(explicitlyUnavailable){
    state='NOT_AVAILABLE_FOR_ACCOUNT';
    action='NO_ACTION';
    freeActionAllowed=false;
  } else if(!officialRuleVerified||!zeroCashCost){
    state='BLOCKED';
    action='NO_ACTION';
    freeActionAllowed=false;
  }

  return {
    id:FREE_ACTION_ID,
    state,
    action,
    freeActionAllowed,
    accountEligibilityVerified,
    economics:{
      cashCostEUR:zeroCashCost?0:Number(cashCostEUR),
      worstCaseCashLossEUR:zeroCashCost?0:null,
      potentialPositivePrize,
      potentialPrizeTypes,
      strictPositiveExpectedCashEVProven:false,
      expectedCashEV:null,
      dailyFreeAttempts:Number.isFinite(Number(dailyFreeAttempts))?Number(dailyFreeAttempts):null,
    },
    wagering:{
      realMoneyStakeEUR:0,
      realMoneyAllowed:false,
      automaticBettingAllowed:false,
    },
    guards:{
      freeActionNeverPromotesWagering:true,
      unknownPrizeProbabilityNeverBecomesPositiveEVClaim:true,
      noDepositOrTopUpRequiredByThisRecommendation:true,
      paidSpinForbidden:true,
      ifFreeSpinsRequireBalanceUseExistingBalanceOnly:true,
    },
  };
}
