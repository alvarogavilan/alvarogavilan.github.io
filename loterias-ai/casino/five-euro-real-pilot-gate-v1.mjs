#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const BOT_LIVE='loterias-ai/casino/jackpots/evidence/botemania-jpk-live-gate-v1.json';
const BOT_ALLOC='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-status-v1.json';
const BLACKJACK='loterias-ai/casino/playuzu/evidence/blackjack-exact-lobby-economics-v1.json';
const LIGHTNING='loterias-ai/casino/lightning/evidence/economic-readiness-ledger-v1.json';
const OUT='loterias-ai/casino/evidence/five-euro-real-pilot-gate-v1.json';

const botLive=read(BOT_LIVE)||{};
const botAlloc=read(BOT_ALLOC)||{};
const blackjack=read(BLACKJACK)||{};
const lightning=read(LIGHTNING)||{};

const botemaniaEligible=
  botLive?.decision?.economicPromotionCandidate===true &&
  botLive?.evidence?.exactSpainMbwbKnown===true &&
  botLive?.evidence?.exactHazardKnown===true &&
  botLive?.current?.modelScreen?.pass===true &&
  botAlloc?.decision?.networkAllocationProspectivelyValidated===true;

const blackjackEligible=
  blackjack?.gates?.rewardFieldSemanticMappingFullyConfirmed===true &&
  blackjack?.gates?.exactRulesStrategyAudited===true &&
  blackjack?.gates?.positiveEvLowerBoundAboveOne===true;

const lightningEconomicPass=(Array.isArray(lightning?.lanes)?lightning.lanes:[]).some(l=>
  l?.status==='FIXED_FINAL_PASS' &&
  (l?.fixedFinal?.economicPass===true || l?.economicPass===true || l?.scientificPromotionCandidate===true)
);
const lightningEligible=
  lightning?.strongestDirectEconomicLane &&
  lightning.strongestDirectEconomicLane!=='NO_VALIDATED_DIRECT_ECONOMIC_EDGE_YET' &&
  lightningEconomicPass;

const lanes=[
  {
    id:'botemania-jackpot-king',
    eligible:botemaniaEligible,
    evidence:{
      liveGateState:botLive?.state||null,
      economicPromotionCandidate:botLive?.decision?.economicPromotionCandidate===true,
      exactSpainMbwbKnown:botLive?.evidence?.exactSpainMbwbKnown===true,
      exactHazardKnown:botLive?.evidence?.exactHazardKnown===true,
      currentScreenPass:botLive?.current?.modelScreen?.pass===true,
      networkAllocationProspectivelyValidated:botAlloc?.decision?.networkAllocationProspectivelyValidated===true,
      bestConservativeRtp:botLive?.current?.modelScreen?.bestConservativeRtp??null
    }
  },
  {
    id:'playuzu-goal-goal-goal-blackjack',
    eligible:blackjackEligible,
    evidence:{
      game:blackjack?.strongestCurrentCandidate?.name||null,
      exactRtpPct:blackjack?.strongestCurrentCandidate?.exactRtpPct??null,
      observedInternalPlusPercent:blackjack?.strongestCurrentCandidate?.observedInternalPlusPercent??null,
      conditionalEffectiveRtpPctIfFieldMapsOneToOne:(blackjack?.games||[])[0]?.conditionalEffectiveRtpPctIfFieldMapsOneToOne??null,
      rewardFieldSemanticMappingFullyConfirmed:blackjack?.gates?.rewardFieldSemanticMappingFullyConfirmed===true,
      exactRulesStrategyAudited:blackjack?.gates?.exactRulesStrategyAudited===true,
      positiveEvLowerBoundAboveOne:blackjack?.gates?.positiveEvLowerBoundAboveOne===true
    }
  },
  {
    id:'lightning-roulette',
    eligible:lightningEligible,
    evidence:{
      strongestDirectEconomicLane:lightning?.strongestDirectEconomicLane||null,
      fixedFinalEconomicPass:lightningEconomicPass,
      strongestCurrentLead:lightning?.strongestCurrentLead||null
    }
  }
];

const scientificallyEligibleLanes=lanes.filter(x=>x.eligible).map(x=>x.id);
const out={
  version:'five-euro-real-pilot-gate-v1',
  generatedAt:new Date().toISOString(),
  purpose:'Paper-only scientific promotion monitor. Casino experiments never authorize real-money stakes.',
  humanAuthorization:{
    maxTotalPilotStakeEUR:0,
    oneBudgetOnly:false,
    manualPlacementOnly:false,
    automaticBettingAllowed:false,
    realMoneyAllowed:false,
    noReload:true,
    noLossChasing:true
  },
  eligibilityPolicy:{
    requireAtLeastReasonablySupportedNonNegativeExpectation:true,
    requireLaneSpecificScientificPromotion:true,
    requireNoKnownSemanticOrModelBlocker:true,
    progressAloneNeverQualifies:true,
    hypothesisAloneNeverQualifies:true,
    promotionalRandomRewardsNotCountedWithoutQuantifiedEV:true
  },
  lanes,
  scientificDecision:{
    state:scientificallyEligibleLanes.length?'PAPER_PROMOTION_CANDIDATE':'NO_PAPER_PROMOTION',
    scientificallyEligibleLanes,
    reason:scientificallyEligibleLanes.length?'AT_LEAST_ONE_LANE_PASSED_SCIENTIFIC_SCREEN_ONLY':'NO_LANE_HAS_A_SUPPORTED_NON_NEGATIVE_EXPECTATION_YET'
  },
  decision:{
    state:'NO_REAL_PILOT',
    pilotAllowed:false,
    eligibleLanes:[],
    maxTotalStakeEUR:0,
    reason:'CASINO_EXPERIMENTS_ARE_PAPER_ONLY_REAL_MONEY_DISABLED'
  },
  guards:{
    noAutomaticBetting:true,
    noRealMoney:true,
    noMartingale:true,
    noChasingLosses:true,
    noBorrowing:true,
    noRetuningAfterOutcome:true,
    onePilotCannotValidateAnEdge:true,
    realMoneyRequiresHumanManualAction:false,
    realMoneyDisabledByPolicy:true
  }
};

fs.mkdirSync('loterias-ai/casino/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
