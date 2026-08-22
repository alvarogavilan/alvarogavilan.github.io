import assert from 'node:assert/strict';
import {evaluateZeroCostFreeAction} from '../edge-live/zero-cost-free-action-v1.mjs';

const rules={
  officialRuleVerified:true,
  cashCostEUR:0,
  potentialPrizeTypes:['DINERO_EXTRA','TIRADAS_GRATIS'],
  dailyFreeAttempts:6,
};

{
  const x=evaluateZeroCostFreeAction({...rules,accountShowsPromotion:null});
  assert.equal(x.state,'CHECK_ACCOUNT_AVAILABILITY');
  assert.equal(x.action,'OPEN_FREE_DAILY_PAGE');
  assert.equal(x.economics.worstCaseCashLossEUR,0);
  assert.equal(x.economics.strictPositiveExpectedCashEVProven,false);
  assert.equal(x.economics.expectedCashEV,null);
  assert.equal(x.wagering.realMoneyStakeEUR,0);
  assert.equal(x.wagering.realMoneyAllowed,false);
}

{
  const x=evaluateZeroCostFreeAction({...rules,accountShowsPromotion:true});
  assert.equal(x.state,'GREEN_FREE_ACTION');
  assert.equal(x.action,'CLAIM_FREE_DAILY');
  assert.equal(x.freeActionAllowed,true);
  assert.equal(x.accountEligibilityVerified,true);
  assert.equal(x.economics.dailyFreeAttempts,6);
  assert.equal(x.economics.potentialPositivePrize,true);
  assert.equal(x.economics.worstCaseCashLossEUR,0);
  assert.equal(x.economics.strictPositiveExpectedCashEVProven,false);
  assert.equal(x.wagering.realMoneyStakeEUR,0);
  assert.equal(x.wagering.automaticBettingAllowed,false);
  assert.equal(x.guards.noDepositOrTopUpRequiredByThisRecommendation,true);
  assert.equal(x.guards.paidSpinForbidden,true);
}

{
  const x=evaluateZeroCostFreeAction({...rules,accountShowsPromotion:false});
  assert.equal(x.state,'NOT_AVAILABLE_FOR_ACCOUNT');
  assert.equal(x.freeActionAllowed,false);
  assert.equal(x.wagering.realMoneyStakeEUR,0);
}

{
  const x=evaluateZeroCostFreeAction({...rules,officialRuleVerified:false,accountShowsPromotion:true});
  assert.equal(x.state,'BLOCKED');
  assert.equal(x.freeActionAllowed,false);
}

{
  const x=evaluateZeroCostFreeAction({...rules,cashCostEUR:0.01,accountShowsPromotion:true});
  assert.equal(x.state,'BLOCKED');
  assert.equal(x.freeActionAllowed,false);
  assert.equal(x.wagering.realMoneyStakeEUR,0);
}

console.log('zero-cost-free-action-v1.test.mjs: PASS');
