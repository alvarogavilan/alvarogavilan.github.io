// Fail-closed research screen for Roxor/Gamesys-family progressive video poker.
// It deliberately separates Spain-observed facts from foreign lineage evidence.
// No scenario here can authorize wagering without current Spanish target-game
// paytable, qualifying stake, progressive-trigger, meter-unit and rules fingerprints.

const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));

// Wizard of Odds 7/5 Jacks or Better optimal-strategy distribution.
// This is a mathematical comparator for the paytable shape observed manually in
// Botemania Spain; it is NOT itself a technical reproduction of the current game.
export const JOB_7_5_REFERENCE={
  source:'https://wizardofodds.com/games/video-poker/tables/jacks-or-better/',
  baseRtp:0.961472,
  royalProbability:496195464/19933230517200,
  fixedRoyalReturnMultipleOfTotalHandWager:800,
};

export const ROXOR_PROGRESSIVE_VP_EVIDENCE={
  version:'roxor-progressive-vp-lineage-screen-v1',
  jurisdiction:'ES',
  operator:'botemania-es',
  ultimate:{
    game:'Ultimate Video Poker',
    variant:'Jotas o Mejor Progresivo',
    providerId:'roxor-gaming',
    monitorKey:'generic:WAGER_BET',
    historicalMeterEUR:3448.25,
    historicalMeterObservedAt:'2026-08-21T18:06:46.573Z',
    identityConfidence:'VERY_HIGH',
    spanishManualScreenshot:{
      paytable:{jacksOrBetter:1,twoPair:2,threeOfAKind:3,straight:4,flush:5,fullHouse:7,fourOfAKind:25,straightFlush:50,royalFlush:800},
      shape:'7/5 Jacks or Better',
      observedHandsPerSpin:10,
      observedBetPerHandEUR:2.5,
      technicallyReproduced:false,
      qualifyingStakeVerified:false,
    },
    currentPublicMetadata:{
      minimumGameBetEUR:0.01,
      tableLimitEUR:125,
      hands:[1,5,10,25],
      publishedRtpRangePct:[96.77,99.54],
      exactVariantRtpVerified:false,
    }
  },
  classic:{
    game:'Classic Video Poker',
    provider:'Roxor Gaming Limited',
    currentCategoryProgressiveClaim:true,
    currentGamePageProgressiveMechanismVerified:false,
    minimumGameBetEUR:0.01,
    tableLimitEUR:100,
    hands:[1,5,10,25],
    publishedRtpRangePct:[96.77,99.26],
    feedBinding:null,
  },
  videoPokerRemastered:{
    game:'Videopóker Remasterizado',
    provider:'Roxor Gaming Limited',
    botemaniaPublishedRtpPct:99.54,
    botemaniaLocalProgressiveClaimVerified:false,
    foreignSameTitleComparator:{
      operator:'Bally Bet',
      progressiveSideBetUSD:1,
      seedJackpotUSD:5000,
      royalPaysJackpotFraction:1,
      straightFlushPaysJackpotFraction:0.1,
      fourOfAKindUSD:500,
      fullHouseUSD:100,
      flushUSD:75,
      transferableToSpain:false,
    }
  },
  lineage:{
    gamesysUltimateVideoPokerHistorical:true,
    roxorDescendsFromGamesysStudio:true,
    historicalGamesysJacksOrBetterProgressive:{
      progressiveTrigger:'ROYAL_FLUSH_SPADES_ONLY',
      otherSuitRoyalReturnMultiple:800,
      historicalMinimumBetPerHandGBP:2.5,
      exactCurrentSpainMechanicProven:false,
    }
  },
  guards:{foreignMechanicCannotPromoteExecution:true,historicalStakeCannotBecomeSpainQualifyingStake:true,manualScreenshotCannotBecomeCurrentFingerprint:true,realMoneyAllowed:false}
};

export function selectiveRoyalProgressiveThreshold({
  baseRtp=JOB_7_5_REFERENCE.baseRtp,
  pAnyRoyal=JOB_7_5_REFERENCE.royalProbability,
  triggerRoyalFraction=1,
  qualifyingWagerPerHand=2.5,
  fixedRoyalReturnMultiple=JOB_7_5_REFERENCE.fixedRoyalReturnMultipleOfTotalHandWager,
}={}){
  const values=[baseRtp,pAnyRoyal,triggerRoyalFraction,qualifyingWagerPerHand,fixedRoyalReturnMultiple];
  if(!values.every(finite))return {blocked:true,reason:'MISSING_NUMERIC_INPUT'};
  const b=Number(baseRtp),p=Number(pAnyRoyal),f=Number(triggerRoyalFraction),w=Number(qualifyingWagerPerHand),m=Number(fixedRoyalReturnMultiple);
  if(!(b>0&&b<1&&p>0&&p<1&&f>0&&f<=1&&w>0&&m>=0))return {blocked:true,reason:'INVALID_NUMERIC_INPUT'};
  const pTrigger=p*f;
  const baselineTriggerAward=w*m;
  const thresholdEUR=baselineTriggerAward+((1-b)*w)/pTrigger;
  return {
    blocked:false,
    model:'FIXED_STRATEGY_SELECTIVE_ROYAL_PROGRESSIVE_THRESHOLD',
    baseRtp:b,
    pAnyRoyal:p,
    triggerRoyalFraction:f,
    pProgressiveTrigger:pTrigger,
    qualifyingWagerPerHandEUR:w,
    baselineTriggerAwardEUR:baselineTriggerAward,
    breakEvenJackpotEUR:thresholdEUR,
    thresholdPerOneEuroQualifyingWagerEUR:thresholdEUR/w,
    executable:false,
    realMoneyAllowed:false,
  };
}

export function ultimateSpanishSensitivity({meterEUR=ROXOR_PROGRESSIVE_VP_EVIDENCE.ultimate.historicalMeterEUR}={}){
  const meter=finite(meterEUR)?Number(meterEUR):null;
  const stakes=[0.01,0.05,0.10,0.25,0.50,1,2.5];
  const rows=[];
  for(const qualifyingWagerPerHand of stakes){
    for(const scenario of [
      {id:'ANY_ROYAL_PROGRESSIVE',triggerRoyalFraction:1,currentSpainTriggerVerified:false},
      {id:'SPADES_ONLY_GAMESYS_LINEAGE',triggerRoyalFraction:0.25,currentSpainTriggerVerified:false},
    ]){
      const x=selectiveRoyalProgressiveThreshold({qualifyingWagerPerHand,triggerRoyalFraction:scenario.triggerRoyalFraction});
      rows.push({scenario:scenario.id,qualifyingWagerPerHandEUR,breakEvenJackpotEUR:x.breakEvenJackpotEUR,historicalMeterEUR:meter,historicalMeterAboveScenarioThreshold:meter!==null&&meter>=x.breakEvenJackpotEUR,currentSpainTriggerVerified:false,currentSpainQualifyingStakeVerified:false,executable:false});
    }
  }
  const anyPerEuro=selectiveRoyalProgressiveThreshold({qualifyingWagerPerHand:1,triggerRoyalFraction:1}).breakEvenJackpotEUR;
  const spadesPerEuro=selectiveRoyalProgressiveThreshold({qualifyingWagerPerHand:1,triggerRoyalFraction:0.25}).breakEvenJackpotEUR;
  return {
    version:'ultimate-spanish-progressive-sensitivity-v1',
    meterEUR:meter,
    rows,
    maximumQualifyingWagerForHistoricalMeterToBreakEvenIfAnyRoyalEUR:meter!==null?meter/anyPerEuro:null,
    maximumQualifyingWagerForHistoricalMeterToBreakEvenIfSpadesOnlyEUR:meter!==null?meter/spadesPerEuro:null,
    interpretation:'Sensitivity only. A scenario threshold is not an executable threshold until the current Spanish progressive trigger, qualifying wager, current meter freshness, exact paytable/rules and fixed-strategy probability are fingerprinted in the target game.',
    positiveEvProven:false,
    executable:false,
    realMoneyAllowed:false,
  };
}

// Exact combinatorial side-bet envelope for the foreign same-title Video Poker
// Remastered comparator. The input pay schedule is not promoted to Spain.
export function remasteredForeignSideBetBreakEven(){
  const total=2598960; // C(52,5)
  const pRoyal=4/total;
  const pStraightFlush=36/total; // excludes royals
  const pFourKind=624/total;
  const pFullHouse=3744/total;
  const pFlush=5108/total; // excludes straight/royal flushes
  const fixedEv=500*pFourKind+100*pFullHouse+75*pFlush;
  const jackpotCoefficient=pRoyal+0.1*pStraightFlush;
  const breakEvenJackpotUSD=(1-fixedEv)/jackpotCoefficient;
  return {
    version:'remastered-foreign-sidebet-envelope-v1',
    sideBetUSD:1,
    fixedEvExcludingRoyalAndStraightFlushJackpotPortions:fixedEv,
    jackpotCoefficientPerDollarOfDisplayedJackpot:jackpotCoefficient,
    breakEvenJackpotUSD,
    foreignSeedJackpotUSD:5000,
    foreignSeedBelowBreakEven:true,
    sameMechanicVerifiedSpain:false,
    executable:false,
    realMoneyAllowed:false,
  };
}
