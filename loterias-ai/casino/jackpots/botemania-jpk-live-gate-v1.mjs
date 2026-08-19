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
const royalSoloBand=Number(sens.royalForwardWithRegalCurrent?.max);
const regalSoloBand=Number(sens.regalForwardWithRoyalCurrent?.max);
const currentScreenPass=ev.decision?.currentScreenPass===true;
const exactMbwb=ev.decision?.exactSpainMbwbKnown===true || cap.decision?.exactSpainMbwbRecovered===true;
// Critical: having enough resets to START a fit is not the same as knowing the exact/validated hazard.
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
// Even a robust research-model pass cannot become actionable until Spain MBWB and a separately validated hazard are exact.
const actionable=sourceFresh&&currentScreenPass&&exactMbwb&&exactHazard&&ev.decision?.currentPositiveEvProven===true;
if(actionable) state='ACTIONABLE';

const canalDecision=canal.decision||{};
const potAt=(name,q)=>Number.isFinite(q)?Number((Number(seedHyp[name])+(Number(capHyp[name])-Number(seedHyp[name]))*q).toFixed(2)):null;
const out={
  version:'botemania-jpk-live-gate-v1.2',generatedAt:new Date().toISOString(),operator:'botemania-es',
  state,
  current:{observedAt:obs.latest?.observedAt||null,sourceFresh,potsEUR:{JACKPOT_KING:Number(pots.JACKPOT_KING)||null,REGAL:Number(pots.REGAL)||null,ROYAL:Number(pots.ROYAL)||null},normalizedSeedToCapHypothesis:{ROYAL:qRoyal,REGAL:qRegal},modelScreen:{pass:currentScreenPass,worstConservativeRtp:ev.current?.worstConservativeRtp??null,bestConservativeRtp:ev.current?.bestConservativeRtp??null}},
  researchBand:{
    hypothesisOnly:!exactMbwb,
    routes:{
      BOTH_HIGH:{thresholdNormalized:Number.isFinite(jointBand)?jointBand:null,thresholdPotsHypothesisEUR:{ROYAL:potAt('ROYAL',jointBand),REGAL:potAt('REGAL',jointBand)},active:inJointBand},
      ROYAL_HIGH_WITH_REGAL_CURRENT:{thresholdNormalized:Number.isFinite(royalSoloBand)?royalSoloBand:null,thresholdPotHypothesisEUR:potAt('ROYAL',royalSoloBand),active:inRoyalSoloBand},
      REGAL_HIGH_WITH_ROYAL_CURRENT:{thresholdNormalized:Number.isFinite(regalSoloBand)?regalSoloBand:null,thresholdPotHypothesisEUR:potAt('REGAL',regalSoloBand),active:inRegalSoloBand}
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
  guards:{hypothesisNeverPromotes:true,noCrossMarketCapAsFact:true,fitReadyNeverEqualsExactHazard:true,individualHighPotRoutesMonitored:true,noBetting:true,realMoneyAllowed:false,automaticBettingAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({state:out.state,current:out.current,researchBand:out.researchBand,evidence:out.evidence,decision:out.decision},null,2));
