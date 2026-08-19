#!/usr/bin/env node
import fs from 'node:fs';

const OUT='loterias-ai/casino/jackpots/evidence/jackpot-king-state-dependent-ev-status-v1.json';
const protocol='loterias-ai/casino/jackpots/evidence/jackpot-king-mbwb-protocol-v1.json';
const p=JSON.parse(fs.readFileSync(protocol,'utf8'));

// PokerStars Spain official published example: King Kong Cash JPK RTP 95.01%,
// with 0.38% allocated to jackpot and 0.11% to reserve. This is an operator-page
// configuration input, not a universal Blueprint constant.
const cfg={
  game:'King Kong Cash JPK',
  operator:'pokerstars-es',
  publishedRtp:0.9501,
  publishedJackpotContribution:0.0038,
  publishedReserveContribution:0.0011,
  source:'https://www.pokerstars.es/casino/game/king-kong-cash-jpk/1017/100/'
};

// No EV claim is allowed until the exact PokerStars pot identities, current values,
// MBWB values and conditional hazard are known/estimated prospectively.
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

const requiredIncrementOverPublishedRtp=1-cfg.publishedRtp;
const status={
  version:'jackpot-king-state-dependent-ev-status-v1',
  generatedAt:new Date().toISOString(),
  mode:'MODEL_SCAFFOLD_NO_WAGERING',
  protocolVersion:p.version,
  configuration:cfg,
  accounting:{
    publishedHouseEdgeAtReferenceRtp:requiredIncrementOverPublishedRtp,
    percentagePointsNeededToReach100Rtp:Number((100*requiredIncrementOverPublishedRtp).toFixed(2)),
    jackpotContributionPct:Number((100*cfg.publishedJackpotContribution).toFixed(2)),
    reserveContributionPct:Number((100*cfg.publishedReserveContribution).toFixed(2)),
    warning:'Published RTP may already embed an average jackpot component. Do not add contributions mechanically; state-dependent incremental EV must be estimated relative to the exact PokerStars configuration.'
  },
  providerMechanics:{
    jackpotProbabilityIncreasesWithPotValue:true,
    royalAndRegalMustBeWonBy:true,
    potResetsToReserve:true,
    anyStakeEligibilityGenericProviderProfile:true
  },
  unknown,
  evaluationFormula:{
    conceptual:'EV_total(pot_state) = EV_nonjackpot + sum_i P_i(pot_state)*Payout_i(pot_state). Positive-EV review requires a prospectively estimated lower confidence bound above 1.0.',
    directThresholdCannotYetBeSolved:true,
    reason:'Exact MBWB values and conditional hazard curve for the PokerStars Spain configuration are not yet known.'
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
