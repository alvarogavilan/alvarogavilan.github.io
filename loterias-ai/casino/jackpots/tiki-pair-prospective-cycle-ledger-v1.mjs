#!/usr/bin/env node
import fs from 'node:fs';

const GENERIC='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/tiki-pair-prospective-cycle-ledger-v1.json';
const TARGETS=['tikitemple2_1','progressivealice1'];
export const PROTOCOL_FROZEN_AT='2026-08-21T16:21:00.000Z';
export const MIN_COMPLETED_PROSPECTIVE_CYCLES_FOR_HAZARD_FIT=10;
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

export function synchronizedConfirmedResets(generic={}){
  const events=(generic?.events||[]).filter(e=>e?.network==='generic'&&TARGETS.includes(e?.id)&&e?.classification==='CONFIRMED_METER_RESET');
  const byTime=new Map();
  for(const e of events){if(!byTime.has(e.observedAt))byTime.set(e.observedAt,{});byTime.get(e.observedAt)[e.id]=e;}
  const out=[];
  for(const [observedAt,p] of byTime){
    const a=p[TARGETS[0]],b=p[TARGETS[1]];if(!a||!b)continue;
    const ap=finite(a.previousEUR),bp=finite(b.previousEUR),ac=finite(a.currentEUR),bc=finite(b.currentEUR);
    if([ap,bp,ac,bc].some(v=>v===null))continue;
    if(Math.abs(ap-bp)>0.01||Math.abs(ac-bc)>0.01)continue;
    out.push({observedAt,previousEUR:+(((ap+bp)/2).toFixed(6)),currentEUR:+(((ac+bc)/2).toFixed(6)),dropFraction:+Math.min(finite(a.dropFraction)??0,finite(b.dropFraction)??0).toFixed(6)});
  }
  return out.sort((x,y)=>Date.parse(x.observedAt)-Date.parse(y.observedAt));
}

export function buildTikiPairProspectiveCycleLedger(generic={},generatedAt=new Date().toISOString()){
  const resets=synchronizedConfirmedResets(generic);
  const freezeMs=Date.parse(PROTOCOL_FROZEN_AT);
  const anchor=resets.filter(r=>Date.parse(r.observedAt)<freezeMs).at(-1)||null;
  const prospective=resets.filter(r=>Date.parse(r.observedAt)>=freezeMs);
  const completed=[];
  if(anchor){let start=anchor;for(const end of prospective){if(Date.parse(end.observedAt)<=Date.parse(start.observedAt))continue;completed.push({startResetObservedAt:start.observedAt,endResetObservedAt:end.observedAt,endPreResetEUR:end.previousEUR,endPostResetEUR:end.currentEUR,cycleHours:+((Date.parse(end.observedAt)-Date.parse(start.observedAt))/3600000).toFixed(6),outcomeClass:'PROSPECTIVE_AFTER_FROZEN_PROTOCOL'});start=end;}}
  const eligible=completed.length>=MIN_COMPLETED_PROSPECTIVE_CYCLES_FOR_HAZARD_FIT;
  return {version:'tiki-pair-prospective-cycle-ledger-v1',generatedAt,operator:'botemania-es',protocol:{frozenAt:PROTOCOL_FROZEN_AT,targets:TARGETS,resetDefinition:'both stable IDs must already be CONFIRMED_METER_RESET at the same observedAt with previous/current amounts within EUR0.01',firstKnownResetIsAnchorOnly:true,minimumCompletedProspectiveCyclesForAnyHazardFit:MIN_COMPLETED_PROSPECTIVE_CYCLES_FOR_HAZARD_FIT,noRetuningAfterProspectiveOutcome:true},anchorReset:anchor,prospectiveConfirmedResets:prospective,completedProspectiveCycles:completed,analysis:{completedProspectiveCycleCount:completed.length,eligibleForHazardFit:eligible,hazardFitProduced:false,breakEvenJackpotEUR:null,currentPositiveEvProven:false,economicPromotionAllowed:false,realMoneyAllowed:false},guards:{resetEvidenceMustPreexistInGenericLedger:true,noSingleResetHazardFit:true,noAnchorAsProspectiveOutcome:true,noPairEqualityEqualsExactAlias:true,noCycleDataEqualsGameBinding:true,noPostResetEqualsExactSeed:true,noBetting:true,realMoneyAllowed:false}};
}

if(import.meta.url===`file://${process.argv[1]}`){const out=buildTikiPairProspectiveCycleLedger(read(GENERIC));fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({protocol:out.protocol,anchorReset:out.anchorReset,prospectiveConfirmedResets:out.prospectiveConfirmedResets,analysis:out.analysis},null,2));}
