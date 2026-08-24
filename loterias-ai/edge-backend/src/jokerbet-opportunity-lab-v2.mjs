import { JOKERBET_STACK_CANDIDATES,JOKERBET_STACK_TERMS } from './jokerbet-stack-candidates-v1.mjs';
import { buildJokerbetStackResearch } from './jokerbet-stack-core-v1.mjs';

export const JOKERBET_HIGH_RTP_DISCOVERY_V2=[
  {
    id:'jokerbet:codex-of-fortune',
    game:'Codex of Fortune',provider:'NetEnt',minStakeEUR:0.20,maxStakeEUR:4,
    pageRtp:0.98,providerProgressiveContribution:null,declaredRtpIncludingProviderContribution:null,
    providerProgressive:null,operatorJackpotTemperature:null,operatorJackpotEligibilityVerified:false,
    sourceUrls:[
      'https://www.jokerbet.es/tragaperras-slots/mayor-mas-mejor-rtp.html',
      'https://www.jokerbet.es/tragaperras-slots/codex-of-fortune.html'
    ],
    notes:[
      'JOKERBET currently ranks Codex of Fortune first in its high-RTP list at 98.00%.',
      'The individual public page exposes the Jackpot Temperature field but the unauthenticated text representation does not resolve a value; operator-jackpot eligibility/temperature are therefore not promoted.',
      'The 98.00% is a theoretical game RTP only. It is not combined with CLUB, cashback or the operator jackpot without separate verified semantics.'
    ]
  },
  {
    id:'jokerbet:book-of-aztec-high-rtp',
    game:'Book of Aztec',provider:'Amatic',minStakeEUR:null,maxStakeEUR:null,
    pageRtp:0.9763,providerProgressiveContribution:null,declaredRtpIncludingProviderContribution:null,
    providerProgressive:null,operatorJackpotTemperature:null,operatorJackpotEligibilityVerified:false,
    sourceUrls:['https://www.jokerbet.es/tragaperras-slots/mayor-mas-mejor-rtp.html'],
    notes:['JOKERBET high-RTP page publishes 97.63%. Exact current stake range and Jackpot Temperature are not resolved in this evidence row.']
  },
  {
    id:'jokerbet:hottest-fruits-20-high-rtp',
    game:'Hottest Fruits 20',provider:null,minStakeEUR:null,maxStakeEUR:null,
    pageRtp:0.9756,providerProgressiveContribution:null,declaredRtpIncludingProviderContribution:null,
    providerProgressive:null,operatorJackpotTemperature:null,operatorJackpotEligibilityVerified:false,
    sourceUrls:['https://www.jokerbet.es/tragaperras-slots/mayor-mas-mejor-rtp.html'],
    notes:['JOKERBET high-RTP page publishes 97.56%. Exact configuration fingerprint and Jackpot Temperature remain unresolved.']
  }
];

export const JOKERBET_ZERO_CAPITAL_PROMOS_V1={
  noDepositWelcome:{
    sourceUrl:'https://www.jokerbet.es/promociones/bono-sin-deposito.html',
    promotionStart:'2026-03-26',promotionEnd:'2026-12-31',newUsersOnly:true,
    depositRequiredEUR:0,verificationRequired:true,verificationWindowDays:3,assignmentMaxHoursAfterVerification:72,
    choices:{
      slots:{bonusEUR:20,freeSpinsCount:100,freeSpinsFaceValueEUR:10,freeSpinsGame:'Big Bass Bonanza 1000',bonusRolloverX:80,rolloverContributionSlots:1,validityHours:24,maxConversionBonusEUR:20,maxConversionFreeSpinsEUR:10},
      casino:{bonusEUR:20,freeSpinsCount:100,freeSpinsFaceValueEUR:10,freeSpinsGame:'Big Bass Bonanza 1000',bonusRolloverX:80,rolloverContributionSlots:1,rolloverContributionRouletteBlackjackCrash:0.10,validityHours:24,maxConversionBonusEUR:20,maxConversionFreeSpinsEUR:10},
      sports:{bonusEUR:20,freebetEUR:10,bonusRolloverX:20,bonusMinOdds:2.50,freebetMinOdds:4,freebetMaxOdds:10,validityHours:24,maxConversionBonusEUR:20,maxConversionFreebetEUR:10}
    },
    ownCapitalRequiredToClaim:false,monetaryLossFromClaimingAlone:false,
    cashEvQuantified:false,positiveCashEvProven:false,repeatablePerPlayer:false,
    blocker:'PAYTABLE_VARIANCE_AND_BONUS_SURVIVAL_PROBABILITY_NOT_MODELED; PROMOTION_IS ONE-OFF PER PLAYER/HOUSEHOLD/IP/DEVICE'
  },
  clubSignup:{
    sourceUrl:'https://www.jokerbet.es/programa-puntos-fidelidad.html',
    signupJokercoins:700,dailyLoginJokercoins:20,
    slotPointsPerEURRealWagered:1,sportsPointsPerEURRealWagered:1,casinoPointsPerEURRealWagered:0.5,
    visibleRewards:[{bonusEUR:5,jokercoins:650,category:'SLOTS'},{bonusEUR:10,jokercoins:1300,category:'SLOTS'},{bonusEUR:50,jokercoins:6400,category:'SLOTS'}],
    signupCanReachCheapestVisibleReward:true,
    cheapestVisibleRewardNominalEUR:5,
    rewardSpecificRolloverPubliclyResolved:false,cashEquivalentVerified:false,
    positiveCashEvProven:false,
    blocker:'REWARD-SPECIFIC CONVERSION/ROLLOVER TERMS ARE NOT RESOLVED ON THE PUBLIC CLUB PAGE; NOMINAL BONUS VALUE IS NOT CASH'
  }
};

export const JOKERBET_PUBLIC_COUNTER_ACCESS_V2={
  sourceUrl:'https://www.jokerbet.es/jackpot-slots.html',
  publicPageStatesCountersVisibleAfterLogin:true,
  unauthenticatedExactCounterValuesExposedInPublicText:false,
  publicUnauthenticatedMachineReadableFeedResolved:false,
  exactOroEUR:null,exactPlataEUR:null,exactBronceEUR:null,
  estimatedAmountsAreNotCounters:true,
  operatorPublishedEstimatesEUR:{ORO:15000,PLATA:300,BRONCE:35},
  operatorTextConflict:'The page describes the amounts as estimates and gives examples of Oro falling below or above 15,000 EUR; they must not be parsed as current counters or hard caps.',
  nextTarget:'RESOLVE_AUTHORIZED_OR_PUBLIC_MACHINE_READABLE_COUNTER_SOURCE_WITHOUT_BYPASSING_LOGIN_OR_ACCESS_CONTROLS'
};

export function buildJokerbetOpportunityLabV2(){
  const candidates=[...JOKERBET_STACK_CANDIDATES,...JOKERBET_HIGH_RTP_DISCOVERY_V2];
  const stack=buildJokerbetStackResearch(candidates,JOKERBET_STACK_TERMS);
  const highRtpLeader=[...JOKERBET_HIGH_RTP_DISCOVERY_V2].sort((a,b)=>Number(b.pageRtp||0)-Number(a.pageRtp||0))[0]||null;
  return {
    version:'edge-jokerbet-opportunity-lab-v2',
    stack,
    highRtpDiscovery:{leader:highRtpLeader,rows:JOKERBET_HIGH_RTP_DISCOVERY_V2},
    zeroCapitalPromotions:JOKERBET_ZERO_CAPITAL_PROMOS_V1,
    operatorCounterAccess:JOKERBET_PUBLIC_COUNTER_ACCESS_V2,
    decision:{
      smallestPublishedTheoreticalGapGame:stack.leaderBySmallestDeclaredGap?.game||null,
      smallestPublishedTheoreticalGapPct:stack.leaderBySmallestDeclaredGap?100*stack.leaderBySmallestDeclaredGap.verifiedGapToOne:null,
      zeroCapitalClaimExists:true,
      zeroCapitalCashEvQuantified:false,
      operatorJackpotExactReturnKnown:false,
      positiveEvProven:false,
      realMoneyAllowed:false,
      nextScientificTargets:[
        'RESOLVE_CODEX_JACKPOT_TEMPERATURE_OR_PROVE_NON_PARTICIPATION',
        'RESOLVE_CLUB_REWARD_SPECIFIC_ROLLOVER_AND_CONVERSION',
        'MODEL_NO_DEPOSIT_PROMO_SURVIVAL_USING_EXACT_ELIGIBLE_PAYTABLE_OR_RETURN_DISTRIBUTION',
        'RESOLVE_PUBLIC_OR_AUTHORIZED_JOKERBET_COUNTER_SOURCE_AND_AWARD_LEDGER'
      ]
    },
    guards:{
      highRtpDoesNotImplyPositiveEv:true,
      publicEstimateCannotMasqueradeAsLiveCounter:true,
      loginOnlyCounterMustNotBeScrapedByBypassingAccessControls:true,
      nominalJokercoinsRewardCannotMasqueradeAsCash:true,
      zeroDepositDoesNotImplyGuaranteedWithdrawal:true,
      oneOffPromotionNotRepresentedAsRepeatableEdge:true,
      cashbackNotAddedAsFixedRtp:true,
      realMoneyAllowed:false
    }
  };
}
