const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const EPS=1e-12;

export const PINATA_POINTS_CURRENT={
  version:'pinata-points-current-v1',
  evidenceAsOf:'2026-08-24',
  operator:'PinataCasino.es',jurisdiction:'ES',operatorGroup:'Paf Games S.A.',
  sourceUrl:'https://www.pinatacasino.es/pinata-points',
  cashEURPerPoints:{cashEUR:1,points:1000},
  payoutCadence:'WEEKLY_MONDAY_12_00',claimWindowDays:7,
  slotGameMultiplier:1.0,casinoAndLiveGameMultiplier:0.1,
  levelRecalculation:'MONTHLY_FIRST_DAY',levelFreeze:'ONCE_PER_12_MONTHS',
  levels:[
    {level:1,requiredPoints:0,maintenancePoints:0,multiplier:0.50,multiplierVerified:true},
    {level:2,requiredPoints:100,maintenancePoints:200,multiplier:1.00,multiplierVerified:true},
    {level:3,requiredPoints:500,maintenancePoints:2250,multiplier:1.20,multiplierVerified:true},
    {level:4,requiredPoints:5000,maintenancePoints:2500,multiplier:1.30,multiplierVerified:true},
    {level:5,requiredPoints:12000,maintenancePoints:7000,multiplier:1.40,multiplierVerified:true},
    {level:6,requiredPoints:26000,maintenancePoints:24500,multiplier:1.50,multiplierVerified:true},
    {level:7,requiredPoints:75000,maintenancePoints:50000,multiplier:1.75,multiplierVerified:true},
    {level:8,requiredPoints:175000,maintenancePoints:50000,multiplier:2.00,multiplierVerified:true},
    {level:9,requiredPoints:300000,maintenancePoints:50000,multiplier:2.50,multiplierVerified:false,sourceDisplay:'2.5xx',note:'Public page renders 2.5xx; 2.50 is not promoted as verified until the formatting ambiguity is resolved.'}
  ],
  terms:[
    'Playing any Slot or Casino game earns points; cash prizes are calculated every Monday.',
    'Cash prize is 1 EUR per 1,000 weekly points and is rounded to the nearest euro.',
    'Current level multiplier and game multiplier determine points: EUR wagered x level multiplier x game multiplier.',
    'Slots use game multiplier 1.0; Casino and Live Casino use 0.1.',
    'Cash reward must be claimed within 7 days or expires.',
    'Levels progress during the month and are recalculated on the first day of each month.'
  ],
  guards:{
    nearestEuroHalfTieRuleNotPublished:true,
    weeklyRoundingPreventsNaiveLinearAdditionForSmallTurnover:true,
    currentAccountLevelMustBeKnownForExecution:true,
    level9MultiplierFormattingAmbiguous:true,
    responsibleGamingEligibilityRequired:true,
    realMoneyAllowed:false
  }
};

export function nearestEuroPayoutInterval(points){
  const raw=Number(points)/1000;
  if(!finite(raw)||raw<0)return {rawEUR:null,minEUR:null,maxEUR:null,tie:false};
  const lo=Math.floor(raw),fraction=raw-lo;
  if(Math.abs(fraction-0.5)<=EPS)return {rawEUR:raw,minEUR:lo,maxEUR:lo+1,tie:true};
  const rounded=fraction<0.5?lo:lo+1;
  return {rawEUR:raw,minEUR:rounded,maxEUR:rounded,tie:false};
}

export function pinataLevelTable(){
  return PINATA_POINTS_CURRENT.levels.map(x=>({
    ...x,
    continuousSlotCashReturnFraction:x.multiplierVerified?x.multiplier/1000:null,
    continuousSlotCashReturnPct:x.multiplierVerified?x.multiplier/10:null,
    continuousCasinoLiveCashReturnFraction:x.multiplierVerified?x.multiplier*0.1/1000:null,
    continuousCasinoLiveCashReturnPct:x.multiplierVerified?x.multiplier*0.1/10:null
  }));
}

export function screenPinataPoints({weeklyTurnoverEUR=0,level=1,category='SLOTS'}={}){
  const turnover=Number(weeklyTurnoverEUR);
  const row=PINATA_POINTS_CURRENT.levels.find(x=>x.level===Number(level))||null;
  const categoryMultiplier=category==='SLOTS'?1:(category==='CASINO_OR_LIVE'?0.1:null);
  const ready=finite(turnover)&&turnover>=0&&row&&row.multiplierVerified===true&&finite(categoryMultiplier);
  const points=ready?turnover*row.multiplier*categoryMultiplier:null;
  const payout=ready?nearestEuroPayoutInterval(points):{rawEUR:null,minEUR:null,maxEUR:null,tie:false};
  return {
    version:'pinata-points-screen-v1',weeklyTurnoverEUR:finite(turnover)?turnover:null,level:Number(level),category,
    levelMultiplier:row?.multiplier??null,levelMultiplierVerified:row?.multiplierVerified===true,categoryMultiplier,
    calculatedPoints:points,continuousCashValueEUR:payout.rawEUR,weeklyCashPayoutMinEUR:payout.minEUR,weeklyCashPayoutMaxEUR:payout.maxEUR,
    nearestEuroHalfTie:payout.tie,
    effectiveCashReturnMinFraction:ready&&turnover>0?payout.minEUR/turnover:null,
    effectiveCashReturnMaxFraction:ready&&turnover>0?payout.maxEUR/turnover:null,
    exactCashPayoutKnown:ready&&!payout.tie,
    executable:false,realMoneyAllowed:false,
    blockers:[...(row?[]:['LEVEL_INVALID']),...(row?.multiplierVerified?[]:['LEVEL_MULTIPLIER_NOT_VERIFIED']),...(finite(categoryMultiplier)?[]:['CATEGORY_INVALID']),'CURRENT_ACCOUNT_LEVEL_NOT_CAPTURED','WEEKLY_POINTS_STATE_NOT_CAPTURED','PROSPECTIVE_STACK_VALIDATION_MISSING']
  };
}

export function screenPinataSlotStack({weeklyTurnoverEUR=0,level=1,gameRtp=null,gameRtpVerified=false}={}){
  const loyalty=screenPinataPoints({weeklyTurnoverEUR,level,category:'SLOTS'});
  const turnover=Number(weeklyTurnoverEUR),rtp=Number(gameRtp);
  const rtpReady=gameRtpVerified===true&&finite(rtp)&&rtp>=0&&rtp<=1;
  const expectedGamePnlEUR=rtpReady&&finite(turnover)?turnover*(rtp-1):null;
  const netMinEUR=rtpReady&&loyalty.weeklyCashPayoutMinEUR!==null?expectedGamePnlEUR+loyalty.weeklyCashPayoutMinEUR:null;
  const netMaxEUR=rtpReady&&loyalty.weeklyCashPayoutMaxEUR!==null?expectedGamePnlEUR+loyalty.weeklyCashPayoutMaxEUR:null;
  return {
    version:'pinata-slot-stack-screen-v1',loyalty,gameRtp:rtpReady?rtp:null,gameRtpVerified:rtpReady,
    expectedGamePnlEUR,expectedStackNetMinEUR:netMinEUR,expectedStackNetMaxEUR:netMaxEUR,
    conditionalPositiveEvLowerBound:netMinEUR!==null&&netMinEUR>0,
    positiveEvProven:false,reproduciblePositiveEvProven:false,executable:false,realMoneyAllowed:false,
    guards:{gameRtpMustMatchExactCurrentConfiguration:true,weeklyRoundingIncluded:true,levelStateMustBeCaptured:true,loyaltyCannotBeDoubleCountedWithAnotherRebate:true,realMoneyAllowed:false}
  };
}
