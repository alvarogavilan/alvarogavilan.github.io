#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const BOT_LIVE='loterias-ai/casino/jackpots/evidence/botemania-jpk-live-gate-v1.json';
const BOT_ALLOC='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-status-v1.json';
const OUT='loterias-ai/casino/evidence/five-euro-real-pilot-gate-v1.json';
const MAX_MANUAL_PILOT_EUR=5;

const botLive=read(BOT_LIVE)||{};
const botAlloc=read(BOT_ALLOC)||{};
const botemaniaEligible=
  botLive?.decision?.economicPromotionCandidate===true &&
  botLive?.evidence?.exactSpainMbwbKnown===true &&
  botLive?.evidence?.exactHazardKnown===true &&
  botLive?.current?.modelScreen?.pass===true &&
  botAlloc?.decision?.networkAllocationProspectivelyValidated===true;

const lanes=[{
  id:'botemania-jackpot-king',
  game:"Fishin' Frenzy: Jackpot King",
  operator:'botemania-es',
  eligible:botemaniaEligible,
  evidence:{
    liveGateState:botLive?.state||null,
    economicPromotionCandidate:botLive?.decision?.economicPromotionCandidate===true,
    exactSpainMbwbKnown:botLive?.evidence?.exactSpainMbwbKnown===true,
    exactHazardKnown:botLive?.evidence?.exactHazardKnown===true,
    currentScreenPass:botLive?.current?.modelScreen?.pass===true,
    networkAllocationProspectivelyValidated:botAlloc?.decision?.networkAllocationProspectivelyValidated===true,
    bestConservativeRtp:botLive?.current?.modelScreen?.bestConservativeRtp??null,
    observedAt:botLive?.current?.observedAt||null,
    sourceFresh:botLive?.current?.sourceFresh===true
  }
}];
const eligibleLanes=botemaniaEligible?['botemania-jackpot-king']:[];
const manualPilotEligible=botemaniaEligible;
const out={
  version:'five-euro-real-pilot-gate-v1.2-botemania-only',
  generatedAt:new Date().toISOString(),
  purpose:'Botemania-only strict manual pilot gate for Fishin Frenzy: Jackpot King. No promotions, no other operators, no automatic betting.',
  operatorScope:['botemania-es'],
  excludedScopes:['playuzu-es','lightning-roulette','promotions','bonuses','cashback'],
  humanAuthorization:{maxTotalPilotStakeEUR:manualPilotEligible?MAX_MANUAL_PILOT_EUR:0,oneBudgetOnly:true,manualPlacementOnly:true,automaticBettingAllowed:false,realMoneyAllowed:manualPilotEligible,noReload:true,noLossChasing:true},
  eligibilityPolicy:{requireAtLeastReasonablySupportedNonNegativeExpectation:true,requireBotemaniaOnly:true,requireEconomicPromotionCandidate:true,requireExactSpainMbwb:true,requireExactHazard:true,requireCurrentConservativeScreenPass:true,requireProspectiveNetworkAllocationValidation:true,progressAloneNeverQualifies:true,hypothesisAloneNeverQualifies:true},
  lanes,
  scientificDecision:{state:manualPilotEligible?'ECONOMIC_PROMOTION_CANDIDATE':'NO_PAPER_PROMOTION',scientificallyEligibleLanes:eligibleLanes,reason:manualPilotEligible?'BOTEMANIA_STRICT_ECONOMIC_SCREEN_PASSED':'BOTEMANIA_STRICT_ECONOMIC_SCREEN_NOT_PASSED'},
  decision:{state:manualPilotEligible?'MANUAL_PILOT_ELIGIBLE':'NO_REAL_PILOT',pilotAllowed:manualPilotEligible,eligibleLanes,maxTotalStakeEUR:manualPilotEligible?MAX_MANUAL_PILOT_EUR:0,reason:manualPilotEligible?'BOTEMANIA_STRICT_ECONOMIC_GATE_PASSED_MANUAL_ONLY':'BOTEMANIA_STRICT_ECONOMIC_GATE_NOT_PASSED'},
  guards:{noAutomaticBetting:true,noMartingale:true,noChasingLosses:true,noBorrowing:true,noRetuningAfterOutcome:true,onePilotCannotValidateAnEdge:true,realMoneyRequiresHumanManualAction:true,manualPilotHardCapEUR:MAX_MANUAL_PILOT_EUR,otherOperatorsCannotPromote:true,promotionsCannotPromote:true}
};
fs.mkdirSync('loterias-ai/casino/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
