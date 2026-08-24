import { officialLanguagePayoutInterval,cashLoyaltyLevelTable,screenCashLoyalty } from './paf-group-cash-loyalty-core-v1.mjs';

const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));

export const PINATA_POINTS_CURRENT={
  version:'pinata-points-current-v1.1-rounding-conflict',
  evidenceAsOf:'2026-08-24',
  operator:'PinataCasino.es',jurisdiction:'ES',operatorGroup:'Paf Games S.A.',
  sourceUrl:'https://www.pinatacasino.es/pinata-points',
  sourceEnglishUrl:'https://www.pinatacasino.es/en/pinata-points',
  cashEURPerPoints:{cashEUR:1,points:1000},
  payoutCadence:'WEEKLY_MONDAY_12_00',claimWindowDays:7,
  slotGameMultiplier:1.0,casinoAndLiveGameMultiplier:0.1,
  levelRecalculation:'MONTHLY_FIRST_DAY',levelFreeze:'ONCE_PER_12_MONTHS',
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
    {level:9,requiredPoints:300000,maintenancePoints:50000,multiplier:2.50,multiplierVerified:false,sourceDisplaySpanish:'2.5xx',sourceDisplayEnglish:'2.5x',note:'English resolves the likely formatting typo, but the Spanish operational page is malformed; keep level 9 quarantined for execution.'}
  ],
  terms:[
    'Playing any Slot or Casino game earns points; cash prizes are calculated every Monday.',
    'Both official language pages disclose 1 EUR per 1,000 weekly points.',
    'Spanish says reward is rounded to the nearest euro; English says rounded down to the nearest euro. This conflict is material and remains unresolved.',
    'Current level multiplier and game multiplier determine points: EUR wagered x level multiplier x game multiplier.',
    'Slots use game multiplier 1.0; Casino and Live Casino use 0.1.',
    'Cash reward must be claimed within 7 days or expires.'
  ],
  guards:{
    officialLanguageRoundingConflict:true,
    weeklyRoundingPreventsNaiveLinearAdditionForSmallTurnover:true,
    currentAccountLevelMustBeKnownForExecution:true,
    startingWeeklyPointsMustBeKnownForMarginalReward:true,
    level9SpanishFormattingAmbiguous:true,
    responsibleGamingEligibilityRequired:true,
    realMoneyAllowed:false
  }
};

export function nearestEuroPayoutInterval(points){
  return officialLanguagePayoutInterval(points);
}

export function pinataLevelTable(){
  return cashLoyaltyLevelTable(PINATA_POINTS_CURRENT.levels,{slotMultiplier:1,casinoMultiplier:0.1});
}

export function screenPinataPoints({weeklyTurnoverEUR=0,startingWeeklyPoints=0,level=1,category='SLOTS'}={}){
  const base=screenCashLoyalty({weeklyTurnoverEUR,startingWeeklyPoints,level,category,levels:PINATA_POINTS_CURRENT.levels,slotMultiplier:1,casinoMultiplier:0.1});
  return {...base,version:'pinata-points-screen-v1.1',operator:'PinataCasino.es'};
}

export function screenPinataSlotStack({weeklyTurnoverEUR=0,startingWeeklyPoints=0,level=1,gameRtp=null,gameRtpVerified=false}={}){
  const loyalty=screenPinataPoints({weeklyTurnoverEUR,startingWeeklyPoints,level,category:'SLOTS'});
  const turnover=Number(weeklyTurnoverEUR),rtp=Number(gameRtp);
  const rtpReady=gameRtpVerified===true&&finite(rtp)&&rtp>=0&&rtp<=1;
  const expectedGamePnlEUR=rtpReady&&finite(turnover)?turnover*(rtp-1):null;
  const minReward=loyalty.guaranteedMarginalCashEUR,maxReward=loyalty.possibleMarginalCashEUR;
  const netMinEUR=rtpReady&&minReward!==null?expectedGamePnlEUR+minReward:null;
  const netMaxEUR=rtpReady&&maxReward!==null?expectedGamePnlEUR+maxReward:null;
  return {
    version:'pinata-slot-stack-screen-v1.1',loyalty,gameRtp:rtpReady?rtp:null,gameRtpVerified:rtpReady,
    expectedGamePnlEUR,expectedStackNetMinEUR:netMinEUR,expectedStackNetMaxEUR:netMaxEUR,
    conditionalPositiveEvLowerBound:netMinEUR!==null&&netMinEUR>0,
    positiveEvProven:false,reproduciblePositiveEvProven:false,executable:false,realMoneyAllowed:false,
    guards:{gameRtpMustMatchExactCurrentConfiguration:true,officialLanguageRoundingConflictIncluded:true,startingWeeklyPointsRequired:true,levelStateMustBeCaptured:true,loyaltyCannotBeDoubleCountedWithAnotherRebate:true,realMoneyAllowed:false}
  };
}
