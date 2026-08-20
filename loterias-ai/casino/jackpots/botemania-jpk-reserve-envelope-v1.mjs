#!/usr/bin/env node
import fs from 'node:fs';

const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const OBS='loterias-ai/casino/jackpots/evidence/botemania-jackpot-king-observer-v1.json';
const MBWB='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-mbwb-v1.json';
const HAZ='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-help-hazard-v1.json';
const RESET='loterias-ai/casino/jackpots/evidence/botemania-jpk-reset-reconstructor-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-reserve-envelope-v1.json';
const obs=read(OBS)||{},mbwb=read(MBWB)||{},haz=read(HAZ)||{},reset=read(RESET)||{};
const xs=(Array.isArray(obs?.observations)?obs.observations:[]).filter(x=>x?.labeledPots&&x.observedAt);
const tiers=['ROYAL','REGAL'];
const bounds={};
for(const t of tiers){
 const vals=xs.map(x=>Number(x?.labeledPots?.[t])).filter(v=>Number.isFinite(v)&&v>0);
 const min=vals.length?Math.min(...vals):null,max=vals.length?Math.max(...vals):null;
 bounds[t]={observedMinEUR:min,observedMaxEUR:max,reserveLowerBoundExclusiveEUR:0,reserveUpperBoundEUR:min,exactReserveKnown:false,interpretation:min==null?'NO_OBSERVATIONS':'Because the jackpot resets to its reserve and then grows, any observed positive level is an upper bound on an unseen reserve. Without a clean reset, the observed minimum is not the reserve itself.'};
}
const out={version:'botemania-jpk-reserve-envelope-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',observationsUsed:xs.length,evidence:{reserveExists:haz?.reserveEvidence?.reserveExists===true,exactReserveValueKnown:haz?.reserveEvidence?.exactReserveValueKnown===true,exactSpainMbwbKnown:mbwb?.decision?.exactSpainMbwbKnown===true,cleanResets:Number(reset?.summary?.cleanSingleTierCandidates||0)},boundsEUR:bounds,decision:{reserveEnvelopeImproved:Boolean(xs.length),exactReserveKnown:false,mayFitHazardFromReserveAlone:false,realMoneyAllowed:false},guards:{observedMinimumNeverPromotedToReserve:true,noCrossMarketSeedSubstitution:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
