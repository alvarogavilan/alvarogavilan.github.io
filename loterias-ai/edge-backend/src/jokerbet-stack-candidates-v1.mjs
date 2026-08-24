export const JOKERBET_STACK_CANDIDATES=[
  {
    id:'jokerbet:cashybara-golf',
    game:'Cashybara Golf',provider:'Amusnet',minStakeEUR:0.10,maxStakeEUR:100,
    pageRtp:0.97,providerProgressiveContribution:null,declaredRtpIncludingProviderContribution:null,
    providerProgressive:'Jackpot Cards 4-level internal feature',operatorJackpotTemperature:null,
    operatorJackpotEligibilityVerified:false,
    sourceUrls:['https://www.jokerbet.es/tragaperras-slots/cashybara-golf.html'],
    notes:['Current JOKERBET page publishes 97.00% RTP and lists the title in the current Spanish catalog.','The page exposes a Temperatura Jackpot field but the machine-readable public page does not resolve its value; do not assume Super Hot/Ardiente/Caliente.','Internal Jackpot Cards return is not added separately because the published 97% RTP semantic relative to that feature has not been decomposed.']
  },
  {
    id:'jokerbet:4-cash-planes-multiplayer',
    game:'4 Cash Planes Multiplayer',provider:'Playtech',minStakeEUR:0.10,maxStakeEUR:20,
    pageRtp:0.9629,providerProgressiveContribution:0.0099,declaredRtpIncludingProviderContribution:0.9728,
    providerProgressive:'Double Heat',operatorJackpotTemperature:null,
    operatorJackpotEligibilityVerified:false,
    sourceUrls:[
      'https://www.jokerbet.es/tragaperras-slots/4-cash-planes-multiplayer.html',
      'https://www.jokerbet.es/img/logos/pdf/4-cash-planes-multiplayer.pdf'
    ],
    notes:['JOKERBET page classifies game as Crash and shows 96.29% RTP.','JOKERBET-hosted rules disclose 0.99% Double Heat contribution and 97.28% RTP including that contribution.','Operator-jackpot temperature field is not resolved; jackpot promotion is described as slot-only and Crash participation must not be assumed from catalog placement.']
  },
  {
    id:'jokerbet:break-da-bank-again-megaways',
    game:'Break Da Bank Again Megaways',provider:'Games Global/Microgaming',minStakeEUR:0.20,maxStakeEUR:2,
    pageRtp:0.9615,providerProgressiveContribution:null,declaredRtpIncludingProviderContribution:null,
    providerProgressive:null,operatorJackpotTemperature:'SUPER_HOT',operatorJackpotEligibilityVerified:true,
    sourceUrls:['https://www.jokerbet.es/tragaperras-slots/break-da-bank-again-megaways.html'],
    notes:['Current JOKERBET page explicitly publishes RTP 96.15% and Temperatura Jackpot Super Hot.']
  },
  {
    id:'jokerbet:basketball-star-on-fire',
    game:'Basketball Star on Fire',provider:'Games Global/Microgaming',minStakeEUR:0.25,maxStakeEUR:20,
    pageRtp:0.9612,providerProgressiveContribution:null,declaredRtpIncludingProviderContribution:null,
    providerProgressive:null,operatorJackpotTemperature:'SUPER_HOT',operatorJackpotEligibilityVerified:true,
    sourceUrls:['https://www.jokerbet.es/tragaperras-slots/basketball-star-on-fire.html'],
    notes:['Current JOKERBET page explicitly publishes RTP 96.12% and Temperatura Jackpot Super Hot.','The game also has an internal jackpot feature; no separate progressive return is added without exact rules.']
  },
  {
    id:'jokerbet:hot-scatter',
    game:'Hot Scatter',provider:'Amatic',minStakeEUR:0.10,maxStakeEUR:5,
    pageRtp:0.96,providerProgressiveContribution:null,declaredRtpIncludingProviderContribution:null,
    providerProgressive:null,operatorJackpotTemperature:'SUPER_HOT',operatorJackpotEligibilityVerified:true,
    sourceUrls:['https://www.jokerbet.es/tragaperras-slots/hot-scatter.html'],
    notes:['Current JOKERBET page explicitly publishes RTP 96.00% and Temperatura Jackpot Super Hot.']
  }
];

export const JOKERBET_STACK_TERMS={
  operatorJackpot:{
    sourceUrl:'https://www.jokerbet.es/jackpot-slots.html',
    promotionStart:'2024-04-15',promotionEnd:'2026-12-31',
    tiers:['ORO','PLATA','BRONCE'],
    estimatedAmountsEUR:{ORO:15000,PLATA:300,BRONCE:35},
    paidAs:'SLOTS_BONUS',rolloverX:1,maxConversionX:1,expiryDays:3,
    realBalanceOnly:true,operatorFunded:true,ordinaryGameReturnUnaffectedClaim:true,
    compatibleWithAllPromotionsClaim:true,
    temperatureOrder:['CALIENTE','ARDIENTE','SUPER_HOT'],
    tierFrequencyOrder:['ORO_LEAST_FREQUENT','PLATA_MEDIUM','BRONCE_MOST_FREQUENT'],
    selectedCatalogClaim:true,
    exactProbabilityPerEuroByTemperature:null,exactExpectedReturnPerEuro:null,
    disclosedAmountSemanticsConflict:'Terms call 15000 EUR an estimated Oro amount while an example says the random award can fall before or after that estimate (e.g. 17000 EUR); therefore 15000 is not treated as a hard MBWB cap.'
  },
  club:{
    sourceUrl:'https://www.jokerbet.es/programa-puntos-fidelidad.html',
    pointsPerEURSlots:1,rewards:[{bonusEUR:5,points:650},{bonusEUR:10,points:1300},{bonusEUR:50,points:6400}],
    bestNominalFaceValuePerPoint:50/6400,
    bestNominalFaceValuePerEURWagered:50/6400,
    rewardSpecificRolloverVerified:false,cashEquivalentVerified:false
  },
  cashbackOne:{
    sourceUrl:'https://www.jokerbet.es/promociones/bono-cashback-semanal.html',
    lossFraction:0.10,minWeeklyNetLossEUR:20,maxBonusEUR:500,rolloverX:1,maxConversionX:2,
    eligibleUsersOnly:true,lossContingent:true,fixedRtpIncrement:false
  },
  cashbackPlus:{
    sourceUrl:'https://www.jokerbet.es/promociones/bono-cashback-semanal.html',
    lossFraction:0.30,minWeeklyNetLossEUR:20,maxBonusEUR:500,rolloverX:10,maxConversionX:2,
    eligibleUsersOnly:true,lossContingent:true,fixedRtpIncrement:false
  },
  cashbackSelectionRule:'User must choose the applicable cashback route/category; ONE and PLUS are not additive to each other.'
};
