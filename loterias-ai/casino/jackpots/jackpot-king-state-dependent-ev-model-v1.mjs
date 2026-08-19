#!/usr/bin/env node
import fs from 'node:fs';

const OUT='loterias-ai/casino/jackpots/evidence/jackpot-king-state-dependent-ev-status-v1.json';
const protocol='loterias-ai/casino/jackpots/evidence/jackpot-king-mbwb-protocol-v1.json';
const p=JSON.parse(fs.readFileSync(protocol,'utf8'));

// PokerStars Spain official King Kong Cash JPK material publishes 95.01% for the
// game component and 0.38% jackpot + 0.11% reserve contribution. PokerStars also
// describes the global RTP including the jackpot contribution as 95.50%. Keep both
// layers explicit so the state-dependent uplift is never double-counted.
const cfg={
  game:'King Kong Cash JPK',
  operator:'pokerstars-es',
  publishedGameRtp:0.9501,
  publishedJackpotContribution:0.0038,
  publishedReserveContribution:0.0011,
  publishedGlobalReferenceRtp:0.9550,
  sources:[
    'https://www.pokerstars.es/casino/game/king-kong-cash-jpk/1017/100/',
    'https://www.pokerstars.es/casino/news/las-tragaperras-con-jackpot-mas-exclusivas-de-pokerstars-casino-para-que-te-diviertas-a-lo-grande/'
  ]
};

const unknown={
  royalReserveEUR:null,
  royalMbwbEUR:null,
  regalReserveEUR:null,
  regalMbwbEUR:null,
  jackpotKingReserveEUR:null,
  conditionalRoyalHazard:null,
  conditionalRegalHazard:null,
  conditionalKingHazard:null,
  pokerstarsConfigurationMatchToProviderGenericProfile:false
};

const requiredIncrementOverGlobalReference=1-cfg.publishedGlobalReferenceRtp;
const status={
  version:'jackpot-king-state-dependent-ev-status-v1.1',
  generatedAt:new Date().toISOString(),
  mode:'MODEL_SCAFFOLD_NO_WAGERING',
  protocolVersion:p.version,
  configuration:cfg,
  accounting:{
    globalReferenceHouseEdge:requiredIncrementOverGlobalReference,
    percentagePointsIncrementNeededAboveGlobalReferenceToReach100Rtp:Number((100*requiredIncrementOverGlobalReference).toFixed(2)),
    gameRtpPct:Number((100*cfg.publishedGameRtp).toFixed(2)),
    jackpotContributionPct:Number((100*cfg.publishedJackpotContribution).toFixed(2)),
    reserveContributionPct:Number((100*cfg.publishedReserveContribution).toFixed(2)),
    globalReferenceRtpPct:Number((100*cfg.publishedGlobalReferenceRtp).toFixed(2)),
    warning:'Use the 95.50% global reference to avoid double-counting the average progressive contribution. A current-pot edge would require state-dependent jackpot value/hazard to add more than the reference progressive value by enough to clear the remaining 4.50 percentage points.'
  },
  providerMechanics:{
    jackpotProbabilityIncreasesWithPotValue:true,
    royalAndRegalMustBeWonBy:true,
    potResetsToReserve:true,
    anyStakeEligibilityGenericProviderProfile:true
  },
  unknown,
  evaluationFormula:{
    conceptual:'EV_total(pot_state) = EV_nonjackpot + sum_i P_i(pot_state)*Payout_i(pot_state). Compare the state-dependent progressive term with the average progressive value already embedded in the 95.50% global reference. Positive-EV review requires a prospectively estimated lower confidence bound above 1.0.',
    directThresholdCannotYetBeSolved:true,
    reason:'Exact PokerStars Royal/Regal MBWB values and the conditional hazard curve are not yet known.'
  },
  gates:{
    exactMbwbKnown:false,
    exactPotIdentityKnown:false,
    hazardEstimated:false,
    prospectiveHoldoutComplete:false,
    positiveEvLowerBoundAboveOne:false,
    economicPromotionCandidate:false,
    realMoneyAllowed:false
  },
  guards:{
    noDoubleCountingProgressiveContribution:true,
    noInterpolationOfUnknownMbwb:true,
    noAssumedHazardShape:true,
    noSpinPlaced:true,
    automaticBettingAllowed:false,
    realMoneyAllowed:false,
    realStakeEUR:0
  }
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(status,null,2)+'\n');
console.log(JSON.stringify(status,null,2));
