import { cashLoyaltyLevelTable,screenCashLoyalty } from './paf-group-cash-loyalty-core-v1.mjs';
import { GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT,screenFixedRealMoneyReward } from './paf-group-fixed-reward-screen-v1.mjs';

const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));

export const GOLDEN_CLUB_CURRENT={
  version:'golden-club-current-v1',evidenceAsOf:'2026-08-24',
  operator:'GoldenBull.es',jurisdiction:'ES',operatorGroup:'Paf International P.L.C.',
  sourceUrl:'https://www.goldenbull.es/golden-club-loyalty-program',
  sourceEnglishUrl:'https://www.goldenbull.es/en/golden-club-loyalty-program',
  cashEURPerPoints:{cashEUR:1,points:1000},payoutCadence:'WEEKLY_MONDAY_12_00',claimWindowDays:7,
  slotGameMultiplier:1,sportsMultiplier:1,casinoAndLiveGameMultiplier:0.1,
  roundingDisclosure:{spanish:'NEAREST_EURO',english:'ROUND_DOWN_EURO',resolved:false,executionPolicy:'USE_UNION_INTERVAL_UNTIL_OPERATOR_CLARIFIES'},
  levels:[
    {level:1,requiredPoints:0,maintenancePoints:0,multiplier:0.50,multiplierVerified:true},
    {level:2,requiredPoints:100,maintenancePoints:200,multiplier:1.00,multiplierVerified:true},
    {level:3,requiredPoints:500,maintenancePoints:2250,multiplier:1.20,multiplierVerified:true},
    {level:4,requiredPoints:5000,maintenancePoints:2500,multiplier:1.30,multiplierVerified:true},
    {level:5,requiredPoints:12000,maintenancePoints:7000,multiplier:1.40,multiplierVerified:true},
    {level:6,requiredPoints:26000,maintenancePoints:24500,multiplier:1.50,multiplierVerified:true},
    {level:7,requiredPoints:75000,maintenancePoints:50000,multiplier:1.75,multiplierVerified:true},
    {level:8,requiredPoints:175000,maintenancePoints:50000,multiplier:2.00,multiplierVerified:true},
    {level:9,requiredPoints:300000,maintenancePoints:50000,multiplier:2.50,multiplierVerified:false,sourceDisplaySpanish:'2.5xx',sourceDisplayEnglish:'2.5x'}
  ],
  guards:{officialLanguageRoundingConflict:true,currentAccountLevelRequired:true,startingWeeklyPointsRequired:true,level9SpanishFormattingAmbiguous:true,responsibleGamingEligibilityRequired:true,realMoneyAllowed:false}
};

export function goldenClubLevelTable(){
  return cashLoyaltyLevelTable(GOLDEN_CLUB_CURRENT.levels,{slotMultiplier:1,casinoMultiplier:0.1});
}

export function screenGoldenClub({weeklyTurnoverEUR=0,startingWeeklyPoints=0,level=1,category='SLOTS'}={}){
  const base=screenCashLoyalty({weeklyTurnoverEUR,startingWeeklyPoints,level,category,levels:GOLDEN_CLUB_CURRENT.levels,slotMultiplier:1,casinoMultiplier:0.1,sportsMultiplier:1});
  return {...base,version:'golden-club-screen-v1',operator:'GoldenBull.es'};
}

export function screenGoldenFixedRewardWithClub({
  qualifyingGameRtp=null,qualifyingGameRtpResolved=false,
  exactOfferTermsResolved=false,accountEligible=false,qualifyingGameResolved=false,
  repeatabilityResolved=false,prospectiveValidationPassed=false,
  startingWeeklyPoints=null,level=null,qualifyingCategory=null
}={}){
  const fixed=screenFixedRealMoneyReward({
    qualifyingGameRtp,qualifyingGameRtpResolved,exactOfferTermsResolved,accountEligible,qualifyingGameResolved,
    rewardSemanticsVerified:GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.rewardClassSemanticsVerified,
    repeatabilityResolved,prospectiveValidationPassed
  });
  const loyaltyReady=finite(startingWeeklyPoints)&&Number(startingWeeklyPoints)>=0&&finite(level)&&qualifyingCategory!==null;
  const club=loyaltyReady?screenGoldenClub({weeklyTurnoverEUR:GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.qualifyingTurnoverEUR,startingWeeklyPoints:Number(startingWeeklyPoints),level:Number(level),category:qualifyingCategory}):null;
  const marginalMin=club?.guaranteedMarginalCashEUR??null,marginalMax=club?.possibleMarginalCashEUR??null;
  const q=GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.qualifyingTurnoverEUR,reward=GOLDEN_BULL_FIXED_REAL_MONEY_CURRENT.fixedRewardEUR;
  const conservativeBreakEvenRtp=marginalMin!==null?1-(reward+marginalMin)/q:0.90;
  const optimisticIntervalBreakEvenRtp=marginalMax!==null?1-(reward+marginalMax)/q:0.90;
  const rtpReady=qualifyingGameRtpResolved===true&&finite(qualifyingGameRtp)&&Number(qualifyingGameRtp)>=0&&Number(qualifyingGameRtp)<=1;
  const expectedGameLoss=rtpReady?q*(1-Number(qualifyingGameRtp)):null;
  const stackMin=expectedGameLoss!==null&&marginalMin!==null?reward+marginalMin-expectedGameLoss:null;
  const stackMax=expectedGameLoss!==null&&marginalMax!==null?reward+marginalMax-expectedGameLoss:null;
  return {
    version:'golden-fixed-reward-plus-club-screen-v1',fixedReward:fixed,club,
    conservativeBreakEvenRtp,optimisticIntervalBreakEvenRtp,
    expectedStackNetMinEUR:stackMin,expectedStackNetMaxEUR:stackMax,
    conditionalPositiveEvLowerBound:stackMin!==null&&stackMin>0,
    positiveEvProven:false,reproduciblePositiveEvProven:false,executable:false,realMoneyAllowed:false,
    blockers:[...fixed.blockers,...(loyaltyReady?[]:['GOLDEN_CLUB_ACCOUNT_LEVEL_AND_WEEKLY_POINTS_NOT_CAPTURED']),...(qualifyingCategory?[]:['QUALIFYING_GAME_CATEGORY_NOT_RESOLVED']),'OFFICIAL_LANGUAGE_ROUNDING_CONFLICT'],
    guards:{fixedRewardNotDoubleCounted:true,onlyMarginalClubCashAdded:true,roundingConflictUsesConservativeInterval:true,hiddenQualifyingGameStillBlocksExecution:true,realMoneyAllowed:false}
  };
}
