#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const OBS='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const EV='loterias-ai/casino/jackpots/evidence/botemania-jpk-near-cap-ev-scenarios-v1.json';
const CAP='loterias-ai/casino/jackpots/evidence/botemania-blueprint-cap-field-probe-v1.json';
const CANAL='loterias-ai/casino/jackpots/evidence/botemania-canalbingo-crosscheck-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-live-gate-v1.json';

const obs=read(OBS)||{}, flow=read(FLOW)||{}, ev=read(EV)||{}, cap=read(CAP)||{}, canal=read(CANAL)||{};
const pots=obs.latest?.labeledPots||{};
const capHyp=ev.inputs?.capHypothesisEUR||{ROYAL:3500,REGAL:35000};
const seedHyp=ev.inputs?.seedHypothesisEUR||{ROYAL:500,REGAL:5000};
const pct=(name)=>{
  const v=Number(pots[name]), s=Number(seedHyp[name]), c=Number(capHyp[name]);
  if(!Number.isFinite(v)||!Number.isFinite(s)||!Number.isFinite(c)||c<=s)return null;
  return (v-s)/(c-s);
};
const qRoyal=pct('ROYAL'), qRegal=pct('REGAL');
const conservativeBand=Number(ev.thresholdSensitivity?.ZERO_CONSERVATIVE?.bothSameProgressForward?.max);
const currentScreenPass=ev.decision?.currentScreenPass===true;
const exactMbwb=ev.decision?.exactSpainMbwbKnown===true || cap.decision?.exactSpainMbwbRecovered===true;
const exactHazard=ev.decision?.exactHazardKnown===true || flow.hazard?.ready===true;
const sourceFresh=obs.latest?.sourceReadable===true && Number(obs.latest?.graphql?.httpStatus)===200;
const inResearchBand=Number.isFinite(conservativeBand)&&Number.isFinite(qRoyal)&&Number.isFinite(qRegal)&&qRoyal>=conservativeBand&&qRegal>=conservativeBand;
let state='NO_DATA';
if(sourceFresh) state='BELOW_RESEARCH_BAND';
if(sourceFresh&&inResearchBand) state='RESEARCH_BAND_HYPOTHESIS_ONLY';
if(sourceFresh&&inResearchBand&&exactMbwb&&exactHazard) state='EV_VERIFICATION_REQUIRED';
const actionable=sourceFresh&&inResearchBand&&exactMbwb&&exactHazard&&currentScreenPass;
if(actionable) state='ACTIONABLE';

const potAt=(name,q)=>Number.isFinite(q)?Number((Number(seedHyp[name])+(Number(capHyp[name])-Number(seedHyp[name]))*q).toFixed(2)):null;
const out={
  version:'botemania-jpk-live-gate-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',
  state,
  current:{observedAt:obs.latest?.observedAt||null,sourceFresh,potsEUR:{JACKPOT_KING:Number(pots.JACKPOT_KING)||null,REGAL:Number(pots.REGAL)||null,ROYAL:Number(pots.ROYAL)||null},normalizedSeedToCapHypothesis:{ROYAL:qRoyal,REGAL:qRegal}},
  researchBand:{hypothesisOnly:!exactMbwb,conservativeAllCurvesStartNormalized:Number.isFinite(conservativeBand)?conservativeBand:null,thresholdPotsHypothesisEUR:{ROYAL:potAt('ROYAL',conservativeBand),REGAL:potAt('REGAL',conservativeBand)},inBand:inResearchBand},
  evidence:{exactSpainMbwbKnown:exactMbwb,exactHazardKnown:exactHazard,cleanResets:Number(flow.hazard?.cleanResets||0),minimumResetsForFit:Number(flow.hazard?.minimumResetsForFit||10),canalBingoSharedPotCorroborated:canal.decision?.sharedPotCorroborated===true,canalBingoResolvedVenture:canal.decision?.resolvedVenture||null,currentScreenPass},
  decision:{economicPromotionCandidate:actionable,realMoneyAllowed:false,automaticBettingAllowed:false,reason:actionable?'SEPARATE_REAL_MONEY_AUTHORIZATION_STILL_REQUIRED':!sourceFresh?'NO_FRESH_SOURCE':!inResearchBand?'BELOW_CONSERVATIVE_RESEARCH_BAND':!exactMbwb?'EXACT_SPAIN_MBWB_NOT_VERIFIED':!exactHazard?'HAZARD_NOT_VERIFIED':'CONSERVATIVE_EV_NOT_ABOVE_ONE'},
  guards:{hypothesisNeverPromotes:true,noCrossMarketCapAsFact:true,noBetting:true,realMoneyAllowed:false,automaticBettingAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({state:out.state,current:out.current,researchBand:out.researchBand,evidence:out.evidence,decision:out.decision},null,2));
