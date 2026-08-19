#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const P='loterias-ai/casino/jackpots/evidence/botemania-jpk-hazard-prospective-protocol-v1.json';
const O='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const R='loterias-ai/casino/jackpots/evidence/botemania-jpk-reset-reconstructor-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-prospective-protocol-status-v1.json';
const p=read(P),o=read(O)||{},r=read(R)||{};
if(!p) throw new Error('Frozen protocol missing');
const freezeMs=Date.parse(p.frozenAt);
const clean=(r.windows||[]).filter(x=>x.cleanSingleTierCandidate&&Date.parse(x.toObservedAt)>=freezeMs);
const n=clean.length;
const discoveryN=Number(p.phasePlan?.discovery?.cleanResetWindows||10);
const validationN=Number(p.phasePlan?.validation?.cleanResetWindows||10);
const econN=Number(p.phasePlan?.economicReplication?.cleanResetWindows||20);
let phase='DISCOVERY';
let phaseProgress={used:n,target:discoveryN};
if(n>=discoveryN){phase='MODEL_FREEZE_DUE';phaseProgress={used:discoveryN,target:discoveryN};}
// Do not auto-advance validation or economic phases merely from count: a separate frozen model artifact is required.
const latest=o.latest?.labeledPots||{};
const royal=Number(latest.ROYAL),regal=Number(latest.REGAL);
const royalCap=Number(p.mbwbHypothesis?.royalMbwbEUR),regalCap=Number(p.mbwbHypothesis?.regalMbwbEUR);
const falsifications=[];
if(Number.isFinite(royal)&&Number.isFinite(royalCap)&&royal>royalCap) falsifications.push({tier:'ROYAL',observedEUR:royal,hypothesisMbwbEUR:royalCap,reason:'OBSERVED_ABOVE_HYPOTHESIZED_MBWB'});
if(Number.isFinite(regal)&&Number.isFinite(regalCap)&&regal>regalCap) falsifications.push({tier:'REGAL',observedEUR:regal,hypothesisMbwbEUR:regalCap,reason:'OBSERVED_ABOVE_HYPOTHESIZED_MBWB'});
const tinySynchronousDrops=(r.windows||[]).filter(x=>!x.cleanSingleTierCandidate&&Date.parse(x.toObservedAt)>=freezeMs&&x.observedDropEUR>0).length;
const out={
 version:'botemania-jpk-prospective-protocol-status-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',protocolVersion:p.version,protocolFrozenAt:p.frozenAt,
 status:{phase,phaseProgress,cleanProspectiveResetWindows:n,discoveryTarget:discoveryN,validationTarget:validationN,economicReplicationTarget:econN,modelFreezeArtifactExists:false,validationFreezeArtifactExists:false},
 latest:{observedAt:o.latest?.observedAt||null,potsEUR:{JACKPOT_KING:Number(latest.JACKPOT_KING)||null,REGAL:Number.isFinite(regal)?regal:null,ROYAL:Number.isFinite(royal)?royal:null}},
 mbwbHypothesis:{royalEUR:royalCap,regalEUR:regalCap,crossMarketReferenceOnly:true,falsified:falsifications.length>0,falsifications},
 dataQuality:{tinyOrSynchronousDownTicksIgnored:tinySynchronousDrops,cleanResetWindows:clean.slice(-20)},
 decision:{mayFitDiscoveryModel:n>=discoveryN&&!falsifications.length,mayValidateModel:false,mayRunEconomicReplication:false,positiveEvProven:false,realMoneyAllowed:false,automaticBettingAllowed:false},
 guards:{countNeverAutoPromotesPhase:true,frozenModelArtifactRequiredAfterDiscovery:true,frozenValidationArtifactRequiredBeforeEconomicReplication:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
