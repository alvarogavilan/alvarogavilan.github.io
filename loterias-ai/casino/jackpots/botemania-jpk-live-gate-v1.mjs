#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const OBS='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const EV='loterias-ai/casino/jackpots/evidence/botemania-jpk-near-cap-ev-scenarios-v1.json';
const CAP='loterias-ai/casino/jackpots/evidence/botemania-blueprint-cap-field-probe-v1.json';
const CANAL='loterias-ai/casino/jackpots/evidence/botemania-canalbingo-crosscheck-v1.json';
const RESET='loterias-ai/casino/jackpots/evidence/botemania-jpk-reset-reconstructor-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-live-gate-v1.json';

const obs=read(OBS)||{}, flow=read(FLOW)||{}, ev=read(EV)||{}, cap=read(CAP)||{}, canal=read(CANAL)||{}, reset=read(RESET)||{};
const pots=obs.latest?.labeledPots||{};
const capHyp=ev.inputs?.capHypothesisEUR||{ROYAL:3500,REGAL:35000};
const seedHyp=ev.inputs?.seedHypothesisEUR||{ROYAL:500,REGAL:5000};
const pct=(name)=>{
  const v=Number(pots[name]), s=Number(seedHyp[name]), c=Number(capHyp[name]);
  if(!Number.isFinite(v)||!Number.isFinite(s)||!Number.isFinite(c)||c<=s)return null;
  return (v-s)/(c-s);
};
const qRoyal=pct('ROYAL'), qRegal=pct('REGAL');
const sens=ev.thresholdSensitivity?.ZERO_CONSERVATIVE||{};
const jointBand=Number(sens.bothSameProgressForward?.max);
const royalSoloBand=Number(sens.royalOnlyNoOtherJackpotCredit?.max);
const regalSoloBand=Number(sens.regalOnlyNoOtherJackpotCredit?.max);
const currentScreenPass=ev.decision?.currentScreenPass===true;
const currentRoyalOnlyScreenPass=ev.decision?.currentRoyalOnlyScreenPass===true;
const currentRegalOnlyScreenPass=ev.decision?.currentRegalOnlyScreenPass===true;
const exactMbwb=ev.decision?.exactSpainMbwbKnown===true || cap.decision?.exactSpainMbwbRecovered===true;
const hazardFitReady=flow.hazard?.ready===true || Number(reset.summary?.cleanSingleTierCandidates||0)>=10;
const exactHazard=ev.decision?.exactHazardKnown===true;
const sourceFresh=obs.latest?.sourceReadable===true && Number(obs.latest?.graphql?.httpStatus)===200;
const inJointBand=Number.isFinite(jointBand)&&Number.isFinite(qRoyal)&&Number.isFinite(qRegal)&&qRoyal>=jointBand&&qRegal>=jointBand;
const inRoyalSoloBand=Number.isFinite(royalSoloBand)&&Number.isFinite(qRoyal)&&qRoyal>=royalSoloBand;
const inRegalSoloBand=Number.isFinite(regalSoloBand)&&Number.isFinite(qRegal)&&qRegal>=regalSoloBand;
const inResearchBand=inJointBand||inRoyalSoloBand||inRegalSoloBand;
let state='NO_DATA';
if(sourceFresh) state='BELOW_RESEARCH_BAND';
if(sourceFresh&&inResearchBand) state='RESEARCH_BAND_HYPOTHESIS_ONLY';
if(sourceFresh&&currentScreenPass) state='MODEL_SCREEN_PASS_EVIDENCE_INCOMPLETE';
if(sourceFresh&&currentScreenPass&&exactMbwb&&exactHazard) state='EV_VERIFICATION_REQUIRED';
const actionable=sourceFresh&&currentScreenPass&&exactMbwb&&exactHazard&&ev.decision?.currentPositiveEvProven===true;
if(actionable) state='ACTIONABLE';

const canalDecision=canal.decision||{};
const potAt=(name,q)=>Number.isFinite(q)?Number((Number(seedHyp[name])+(Number(capHyp[name])-Number(seedHyp[name]))*q).toFixed(2)):null;
const rate=flow.latest?.recentRatePerHourEUR||{};
const etaHours=(current,target,r)=>Number.isFinite(Number(current))&&Number.isFinite(Number(target))&&Number(r)>0?Math.max(0,(Number(target)-Number(current))/Number(r)):null;
const etaObj=(hours)=>Number.isFinite(hours)?{hours:+hours.toFixed(2),days:+(hours/24).toFixed(2)}:null;
const jointRoyalTarget=potAt('ROYAL',jointBand),jointRegalTarget=potAt('REGAL',jointBand),royalOnlyTarget=potAt('ROYAL',royalSoloBand),regalOnlyTarget=potAt('REGAL',regalSoloBand);
const etaJointRoyal=etaHours(pots.ROYAL,jointRoyalTarget,rate.ROYAL),etaJointRegal=etaHours(pots.REGAL,jointRegalTarget,rate.REGAL);
const etaJoint=Number.isFinite(etaJointRoyal)&&Number.isFinite(etaJointRegal)?Math.max(etaJointRoyal,etaJointRegal):null;
const etaRoyalOnly=etaHours(pots.ROYAL,royalOnlyTarget,rate.ROYAL),etaRegalOnly=etaHours(pots.REGAL,regalOnlyTarget,rate.REGAL);
const out={
  version:'botemania-jpk-live-gate-v1.4',generatedAt:new Date().toISOString(),operator:'botemania-es',
  state,
  current:{
    observedAt:obs.latest?.observedAt||null,
    sourceFresh,
    potsEUR:{JACKPOT_KING:Number(pots.JACKPOT_KING)||null,REGAL:Number(pots.REGAL)||null,ROYAL:Number(pots.ROYAL)||null},
    recentDirectMeterGrowthPerHourEUR:{JACKPOT_KING:Number(rate.JACKPOT_KING)||null,REGAL:Number(rate.REGAL)||null,ROYAL:Number(rate.ROYAL)||null},
    normalizedSeedToCapHypothesis:{ROYAL:qRoyal,REGAL:qRegal},
    modelScreen:{pass:currentScreenPass,royalOnlyPass:currentRoyalOnlyScreenPass,regalOnlyPass:currentRegalOnlyScreenPass,worstConservativeRtp:ev.current?.worstConservativeRtp??null,bestConservativeRtp:ev.current?.bestConservativeRtp??null}
  },
  researchBand:{
    hypothesisOnly:!exactMbwb,
    etaMethod:'LINEAR_RECENT_DIRECT_METER_GROWTH_NO_RESET_EXTRAPOLATION_ONLY',
    etaWarning:'Not a prediction. Any reset, traffic change, sampling delay, or false MBWB hypothesis invalidates the ETA.',
    routes:{
      BOTH_HIGH:{thresholdNormalized:Number.isFinite(jointBand)?jointBand:null,thresholdPotsHypothesisEUR:{ROYAL:jointRoyalTarget,REGAL:jointRegalTarget},active:inJointBand,creditPolicy:'ROYAL_PLUS_REGAL_ONLY_KING_ZERO',etaNoReset:etaObj(etaJoint)},
      ROYAL_ONLY:{thresholdNormalized:Number.isFinite(royalSoloBand)?royalSoloBand:null,thresholdPotHypothesisEUR:royalOnlyTarget,active:inRoyalSoloBand,creditPolicy:'ROYAL_ONLY_ZERO_CREDIT_TO_REGAL_AND_KING',etaNoReset:etaObj(etaRoyalOnly)},
      REGAL_ONLY:{thresholdNormalized:Number.isFinite(regalSoloBand)?regalSoloBand:null,thresholdPotHypothesisEUR:regalOnlyTarget,active:inRegalSoloBand,creditPolicy:'REGAL_ONLY_ZERO_CREDIT_TO_ROYAL_AND_KING',etaNoReset:etaObj(etaRegalOnly)}
    },
    inBand:inResearchBand
  },
  evidence:{
    exactSpainMbwbKnown:exactMbwb,
    hazardFitReady,
    exactHazardKnown:exactHazard,
    cleanResets:Number(reset.summary?.cleanSingleTierCandidates??flow.hazard?.cleanResets??0),
    minimumResetsForFit:10,
    canalBingoSharedPotCorroborated:canalDecision.canalBingoSharedPotCorroborated===true || canalDecision.sharedPotCorroborated===true,
    canalBingoResolvedVenture:canalDecision.resolvedCanalBingoVenture||canalDecision.resolvedVenture||null,
    monopolyCasinoVentureResolved:canalDecision.monopolyCasinoVentureResolved===true,
    monopolyCasinoSameAsBotemania:canalDecision.monopolyCasinoSameAsBotemania===true,
    monopolyCasinoIndependentSpanishNetwork:canalDecision.monopolyCasinoIndependentSpanishNetwork===true,
    currentScreenPass
  },
  decision:{
    economicPromotionCandidate:actionable,
    realMoneyAllowed:false,
    automaticBettingAllowed:false,
    reason:actionable?'SEPARATE_REAL_MONEY_AUTHORIZATION_STILL_REQUIRED':!sourceFresh?'NO_FRESH_SOURCE':!inResearchBand?'BELOW_CONSERVATIVE_RESEARCH_BAND':!currentScreenPass?'IN_RESEARCH_BAND_BUT_NOT_ROBUST_MODEL_PASS':!exactMbwb?'EXACT_SPAIN_MBWB_NOT_VERIFIED':!exactHazard?(hazardFitReady?'HAZARD_FIT_READY_BUT_NOT_INDEPENDENTLY_VALIDATED':'HAZARD_NOT_VERIFIED'):'CURRENT_POSITIVE_EV_NOT_PROVEN'
  },
  guards:{hypothesisNeverPromotes:true,noCrossMarketCapAsFact:true,fitReadyNeverEqualsExactHazard:true,individualHighPotRoutesGiveZeroOtherJackpotCredit:true,etaNeverPromotesGate:true,noBetting:true,realMoneyAllowed:false,automaticBettingAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({state:out.state,current:out.current,researchBand:out.researchBand,evidence:out.evidence,decision:out.decision},null,2));
