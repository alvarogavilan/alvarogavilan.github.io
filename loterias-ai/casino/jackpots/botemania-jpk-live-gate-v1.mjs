#!/usr/bin/env node
import fs from 'node:fs';
import { selectJpkLiveSource, modelMatchesJpkState } from './jpk-live-source-core-v1.mjs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const OBS='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const ALL_NETWORK='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const EV='loterias-ai/casino/jackpots/evidence/botemania-jpk-near-cap-ev-scenarios-v1.json';
const CAP='loterias-ai/casino/jackpots/evidence/botemania-blueprint-cap-field-probe-v1.json';
const CANAL='loterias-ai/casino/jackpots/evidence/botemania-canalbingo-crosscheck-v1.json';
const RESET='loterias-ai/casino/jackpots/evidence/botemania-jpk-reset-reconstructor-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-live-gate-v1.json';
const obs=read(OBS)||{},allNetwork=read(ALL_NETWORK)||{},flow=read(FLOW)||{},ev=read(EV)||{},cap=read(CAP)||{},canal=read(CANAL)||{},reset=read(RESET)||{};
const liveSource=selectJpkLiveSource({allNetwork,observer:obs});
const pots=liveSource.potsEUR||{};
const capHyp=ev.inputs?.capHypothesisEUR||{ROYAL:3500,REGAL:35000},seedHyp=ev.inputs?.seedHypothesisEUR||{ROYAL:500,REGAL:5000};
const pct=name=>{const v=Number(pots[name]),s=Number(seedHyp[name]),c=Number(capHyp[name]);return Number.isFinite(v)&&Number.isFinite(s)&&Number.isFinite(c)&&c>s?(v-s)/(c-s):null;};
const qRoyal=pct('ROYAL'),qRegal=pct('REGAL'),sens=ev.thresholdSensitivity?.ZERO_CONSERVATIVE||{};
const jointBand=Number(sens.bothSameProgressForward?.max),royalSoloBand=Number(sens.royalOnlyNoOtherJackpotCredit?.max),regalSoloBand=Number(sens.regalOnlyNoOtherJackpotCredit?.max);
const modelStateCompatible=modelMatchesJpkState(ev,{observedAt:liveSource.observedAt,potsEUR:pots});
const currentScreenPass=modelStateCompatible&&ev.decision?.currentScreenPass===true;
const currentRoyalOnlyScreenPass=modelStateCompatible&&ev.decision?.currentRoyalOnlyScreenPass===true;
const currentRegalOnlyScreenPass=modelStateCompatible&&ev.decision?.currentRegalOnlyScreenPass===true;
const exactMbwb=ev.decision?.exactSpainMbwbKnown===true||cap.decision?.exactSpainMbwbRecovered===true;
const qualitativeHazardDirectionKnown=ev.decision?.qualitativeHazardDirectionKnown===true||ev.inputs?.qualitativeMonotonicHazardKnown===true;

// Hazard samples are tier-specific. Never allow an aggregate/past pooled count
// (including legacy flow.hazard.ready) to satisfy readiness for both Royal and Regal.
const minimumResetsPerTier=Number(reset.summary?.minimumCleanResetsPerTier||reset.summary?.minimumCleanResetsForHazardFit||10);
const royalCleanResets=Number(reset.summary?.royal||0);
const regalCleanResets=Number(reset.summary?.regal||0);
const royalHazardFitReady=reset.summary?.royalHazardFitReady===true||(Number.isFinite(royalCleanResets)&&royalCleanResets>=minimumResetsPerTier);
const regalHazardFitReady=reset.summary?.regalHazardFitReady===true||(Number.isFinite(regalCleanResets)&&regalCleanResets>=minimumResetsPerTier);
const anyTierHazardFitReady=royalHazardFitReady||regalHazardFitReady;
const hazardFitReady=royalHazardFitReady&&regalHazardFitReady;
const legacyFlowHazardReadyIgnored=flow.hazard?.ready===true;

const exactHazard=ev.decision?.exactHazardKnown===true;
const sourceFresh=liveSource.sourceFresh===true;
const inJointBand=Number.isFinite(jointBand)&&Number.isFinite(qRoyal)&&Number.isFinite(qRegal)&&qRoyal>=jointBand&&qRegal>=jointBand;
const inRoyalSoloBand=Number.isFinite(royalSoloBand)&&Number.isFinite(qRoyal)&&qRoyal>=royalSoloBand;
const inRegalSoloBand=Number.isFinite(regalSoloBand)&&Number.isFinite(qRegal)&&qRegal>=regalSoloBand;
const inResearchBand=inJointBand||inRoyalSoloBand||inRegalSoloBand;
let state='NO_DATA';
if(sourceFresh)state='BELOW_RESEARCH_BAND';
if(sourceFresh&&inResearchBand)state='RESEARCH_BAND_HYPOTHESIS_ONLY';
if(sourceFresh&&modelStateCompatible&&currentScreenPass)state='MODEL_SCREEN_PASS_EVIDENCE_INCOMPLETE';
if(sourceFresh&&modelStateCompatible&&currentScreenPass&&exactMbwb&&exactHazard)state='EV_VERIFICATION_REQUIRED';
const actionable=sourceFresh&&modelStateCompatible&&currentScreenPass&&exactMbwb&&exactHazard&&ev.decision?.currentPositiveEvProven===true;
if(actionable)state='ACTIONABLE';
const canalDecision=canal.decision||{};
const potAt=(name,q)=>Number.isFinite(q)?Number((Number(seedHyp[name])+(Number(capHyp[name])-Number(seedHyp[name]))*q).toFixed(2)):null;
const rate=flow.latest?.recentRatePerHourEUR||{};
const etaHours=(current,target,r)=>Number.isFinite(Number(current))&&Number.isFinite(Number(target))&&Number(r)>0?Math.max(0,(Number(target)-Number(current))/Number(r)):null;
const etaObj=hours=>Number.isFinite(hours)?{hours:+hours.toFixed(2),days:+(hours/24).toFixed(2)}:null;
const jointRoyalTarget=potAt('ROYAL',jointBand),jointRegalTarget=potAt('REGAL',jointBand),royalOnlyTarget=potAt('ROYAL',royalSoloBand),regalOnlyTarget=potAt('REGAL',regalSoloBand);
const etaJointRoyal=etaHours(pots.ROYAL,jointRoyalTarget,rate.ROYAL),etaJointRegal=etaHours(pots.REGAL,jointRegalTarget,rate.REGAL);
const etaJoint=Number.isFinite(etaJointRoyal)&&Number.isFinite(etaJointRegal)?Math.max(etaJointRoyal,etaJointRegal):null;
const etaRoyalOnly=etaHours(pots.ROYAL,royalOnlyTarget,rate.ROYAL),etaRegalOnly=etaHours(pots.REGAL,regalOnlyTarget,rate.REGAL);
let reason='CURRENT_POSITIVE_EV_NOT_PROVEN';
if(actionable)reason='SEPARATE_REAL_MONEY_AUTHORIZATION_STILL_REQUIRED';
else if(!sourceFresh)reason='NO_FRESH_SOURCE';
else if(!modelStateCompatible)reason='CURRENT_JPK_MODEL_SCREEN_NOT_REFRESHED_FOR_LIVE_POTS';
else if(!inResearchBand)reason='BELOW_CONSERVATIVE_RESEARCH_BAND';
else if(!currentScreenPass)reason='IN_RESEARCH_BAND_BUT_NOT_ROBUST_MODEL_PASS';
else if(!exactMbwb)reason='EXACT_SPAIN_MBWB_NOT_VERIFIED';
else if(!exactHazard)reason=qualitativeHazardDirectionKnown?(hazardFitReady?'HAZARD_DIRECTION_VERIFIED_BOTH_TIERS_FIT_READY_EXACT_MAGNITUDE_NOT_INDEPENDENTLY_VALIDATED':(anyTierHazardFitReady?'HAZARD_DIRECTION_VERIFIED_ONLY_ONE_TIER_FIT_READY_NO_CROSS_TIER_POOLING':'HAZARD_DIRECTION_VERIFIED_EXACT_MAGNITUDE_NOT_YET_FIT')):(hazardFitReady?'BOTH_TIER_HAZARDS_FIT_READY_BUT_NOT_INDEPENDENTLY_VALIDATED':(anyTierHazardFitReady?'ONLY_ONE_TIER_HAZARD_FIT_READY_NO_CROSS_TIER_POOLING':'HAZARD_NOT_VERIFIED'));
const out={
  version:'botemania-jpk-live-gate-v1.7-tier-separated-hazard-readiness',generatedAt:new Date().toISOString(),operator:'botemania-es',state,
  current:{
    observedAt:liveSource.observedAt||null,sourceClass:liveSource.sourceClass,sourceAgeSeconds:liveSource.ageSeconds,sourceFresh,
    potsEUR:{JACKPOT_KING:Number.isFinite(Number(pots.JACKPOT_KING))?Number(pots.JACKPOT_KING):null,REGAL:Number.isFinite(Number(pots.REGAL))?Number(pots.REGAL):null,ROYAL:Number.isFinite(Number(pots.ROYAL))?Number(pots.ROYAL):null},
    recentDirectMeterGrowthPerHourEUR:{JACKPOT_KING:Number(rate.JACKPOT_KING)||null,REGAL:Number(rate.REGAL)||null,ROYAL:Number(rate.ROYAL)||null},
    normalizedSeedToCapHypothesis:{ROYAL:qRoyal,REGAL:qRegal},
    modelScreen:{stateCompatible:modelStateCompatible,pass:currentScreenPass,royalOnlyPass:currentRoyalOnlyScreenPass,regalOnlyPass:currentRegalOnlyScreenPass,worstConservativeRtp:modelStateCompatible?(ev.current?.worstConservativeRtp??null):null,bestConservativeRtp:modelStateCompatible?(ev.current?.bestConservativeRtp??null):null}
  },
  researchBand:{hypothesisOnly:!exactMbwb,etaMethod:'LINEAR_RECENT_DIRECT_METER_GROWTH_NO_RESET_EXTRAPOLATION_ONLY',etaWarning:'Not a prediction. Any reset, traffic change, stale rate input or sampling delay invalidates the ETA.',routes:{BOTH_HIGH:{thresholdNormalized:Number.isFinite(jointBand)?jointBand:null,thresholdPotsHypothesisEUR:{ROYAL:jointRoyalTarget,REGAL:jointRegalTarget},active:inJointBand,creditPolicy:'ROYAL_PLUS_REGAL_ONLY_KING_ZERO',etaNoReset:etaObj(etaJoint)},ROYAL_ONLY:{thresholdNormalized:Number.isFinite(royalSoloBand)?royalSoloBand:null,thresholdPotHypothesisEUR:royalOnlyTarget,active:inRoyalSoloBand,creditPolicy:'ROYAL_ONLY_ZERO_CREDIT_TO_REGAL_AND_KING',etaNoReset:etaObj(etaRoyalOnly)},REGAL_ONLY:{thresholdNormalized:Number.isFinite(regalSoloBand)?regalSoloBand:null,thresholdPotHypothesisEUR:regalOnlyTarget,active:inRegalSoloBand,creditPolicy:'REGAL_ONLY_ZERO_CREDIT_TO_ROYAL_AND_KING',etaNoReset:etaObj(etaRegalOnly)}},inBand:inResearchBand},
  evidence:{exactSpainMbwbKnown:exactMbwb,qualitativeHazardDirectionKnown,hazardDirection:'INCREASES_WITH_JACKPOT_VALUE',hazardFitReady,anyTierHazardFitReady,royalHazardFitReady,regalHazardFitReady,royalCleanResets,regalCleanResets,minimumResetsPerTier,legacyFlowHazardReadyIgnored,exactHazardKnown:exactHazard,cleanResets:Number(reset.summary?.cleanSingleTierCandidates??0),modelStateCompatible,canalBingoSharedPotCorroborated:canalDecision.canalBingoSharedPotCorroborated===true||canalDecision.sharedPotCorroborated===true,canalBingoResolvedVenture:canalDecision.resolvedCanalBingoVenture||canalDecision.resolvedVenture||null,monopolyCasinoVentureResolved:canalDecision.monopolyCasinoVentureResolved===true,monopolyCasinoSameAsBotemania:canalDecision.monopolyCasinoSameAsBotemania===true,monopolyCasinoIndependentSpanishNetwork:canalDecision.monopolyCasinoIndependentSpanishNetwork===true,currentScreenPass},
  decision:{economicPromotionCandidate:actionable,realMoneyAllowed:false,automaticBettingAllowed:false,reason},
  guards:{allNetworkExactBlueprintIdsPreferred:true,sourceAgeRecomputed:true,staleEconomicModelNeverPromotes:true,hypothesisNeverPromotes:true,noCrossMarketCapAsFact:true,qualitativeHazardNeverEqualsExactHazard:true,fitReadyNeverEqualsExactHazard:true,noCrossTierResetPooling:true,legacyPooledFlowHazardReadinessIgnored:true,individualHighPotRoutesGiveZeroOtherJackpotCredit:true,etaNeverPromotesGate:true,noBetting:true,realMoneyAllowed:false,automaticBettingAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({state:out.state,current:out.current,researchBand:out.researchBand,evidence:out.evidence,decision:out.decision},null,2));
