#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const E='loterias-ai/casino/lightning/evidence';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const runScript=script=>{const r=spawnSync(process.execPath,[script],{encoding:'utf8',stdio:['ignore','pipe','pipe']});if(r.status!==0){process.stderr.write(r.stdout||'');process.stderr.write(r.stderr||`refresh failed: ${script}\n`);process.exit(r.status||1)}};
const runOptional=script=>{const r=spawnSync(process.execPath,[script],{encoding:'utf8',stdio:['ignore','pipe','pipe']});if(r.status!==0){process.stderr.write(r.stdout||'');process.stderr.write(r.stderr||`optional refresh failed: ${script}\n`);return false}return true;};

runScript('loterias-ai/casino/lightning/research/lightning-prospective-transition-family-v1.mjs');
const transition=read(`${E}/prospective-transition-family-v1-status.json`)||{};

// Rebuild administrative readiness, preserving official operator monitors that are time-series state.
const readinessPath=`${E}/economic-readiness-ledger-v1.json`;
const priorReadiness=read(readinessPath)||{};
runScript('loterias-ai/casino/lightning/research/economic-readiness-ledger-v1.mjs');
let readiness=read(readinessPath)||{};
for(const key of ['jackpotKingOfficialMonitor','jackpotKingHazardProspectiveV1','ageOfGodsOfficialMonitor','sharedProgressiveNetworkObserver'])if(priorReadiness[key])readiness[key]=priorReadiness[key];
fs.writeFileSync(readinessPath,JSON.stringify(readiness,null,2)+'\n');

// Jackpot monitors are observation-only and optional: failure must never affect Lightning custody.
runOptional('loterias-ai/casino/jackpots/pokerstars-jackpot-king-observer.mjs');
runOptional('loterias-ai/casino/playuzu/playuzu-age-of-gods-observer.mjs');
runOptional('loterias-ai/casino/playuzu/playuzu-progressive-networks-observer-v1.mjs');
readiness=read(readinessPath)||readiness;
const hazard=readiness.jackpotKingHazardProspectiveV1;
if(hazard&&(hazard.freezeVersion!=='jackpot-king-hazard-freeze-v1'||hazard.guards?.futureOnly!==true||hazard.guards?.canonicalPageFixed!==true||hazard.guards?.identityControlRequired!==true||hazard.guards?.sub10PercentDeclinesNeverCountAsReset!==true||hazard.guards?.noOptionalStopping!==true||hazard.guards?.realMoneyAllowed!==false))throw new Error('Jackpot King hazard custody drift');
readiness.transitionFamilyV1={
  status:transition?.final?'FIXED_FINAL_AVAILABLE':'BLINDED_ACCUMULATING',
  progress:{used:Number(transition?.progress?.roundsUsed||0),boundary:Number(transition?.progress?.fixedBoundaryRounds||5000),remaining:Number(transition?.progress?.roundsRemaining||5000),percent:Number(transition?.progress?.fixedBoundaryRounds)>0?Number((100*Number(transition?.progress?.roundsUsed||0)/Number(transition?.progress?.fixedBoundaryRounds)).toFixed(2)):0},
  frozenCandidates:8,familyWiseAlpha:0.01,perCandidateAlpha:0.00125,performanceHidden:transition?.disclosure?.candidatePerformanceHidden!==false,pastInformationOnly:true,realMoneyAllowed:false
};
readiness.progressiveNetworks={
  jackpotKing:{sourceReadable:readiness.jackpotKingOfficialMonitor?.sourceReadable??false,latestPotEUR:readiness.jackpotKingOfficialMonitor?.latest?.networkPotEUR??null,observations:readiness.jackpotKingOfficialMonitor?.observationCountTotal??0,resets:readiness.jackpotKingOfficialMonitor?.resetCountTotal??0,stateDependentMechanicVerified:true,positiveEVClaimAllowed:false},
  jackpotKingHazard:{validFutureObservations:readiness.jackpotKingHazardProspectiveV1?.progress?.validObservations??0,hardResets:readiness.jackpotKingHazardProspectiveV1?.progress?.hardResets??0,minimumHardResetsBeforeHazardDiscovery:readiness.jackpotKingHazardProspectiveV1?.progress?.minimumHardResetsBeforeHazardDiscovery??10,totalRtpAtCurrentPotKnown:false,positiveEVClaimAllowed:false},
  ageOfGods:{sourceReadable:readiness.ageOfGodsOfficialMonitor?.sourceReadable??false,rawNetworkCounter:readiness.ageOfGodsOfficialMonitor?.latest?.rawNetworkCounter??null,currencyTrusted:readiness.ageOfGodsOfficialMonitor?.latest?.currencyTrusted===true,observations:readiness.ageOfGodsOfficialMonitor?.observationCountTotal??0,resets:readiness.ageOfGodsOfficialMonitor?.resetCountTotal??0,positiveEVClaimAllowed:false},
  sharedPlayUZUNetworks:{networksPlanned:readiness.sharedProgressiveNetworkObserver?.summary?.networksPlanned??0,networksCorroboratedLatest:readiness.sharedProgressiveNetworkObserver?.summary?.networksCorroboratedThisObservation??0,minimumObservationsBeforeStateSummary:readiness.sharedProgressiveNetworkObserver?.summary?.minimumObservationsBeforeStateSummary??168,latestObservedAt:readiness.sharedProgressiveNetworkObserver?.observations?.at(-1)?.observedAt??null,currencyTrusted:false,positiveEVClaimAllowed:false}
};
readiness.transitionFamilyV1UpdatedAt=new Date().toISOString();
fs.writeFileSync(readinessPath,JSON.stringify(readiness,null,2)+'\n');

const gate=read(`${E}/economic-promotion-gate-v1.json`)||{};
const prior=new Map((gate.boundaries||[]).map(x=>[x.id,x.complete===true]));
const timing=read(`${E}/timing-replication-v3-status.json`),timingV4=read(`${E}/timing-replication-v4-status.json`),lag8=read(`${E}/prospective-lag8-clean-v2-status-v1.json`),lag8V3=read(`${E}/prospective-lag8-clean-v3-status-v1.json`),lagFamily=read(`${E}/prospective-lag-family-clean-v2-status-v1.json`),pastLucky=read(`${E}/prospective-past-lucky-family-clean-v2-status-v1.json`),numberSel=read(`${E}/economic-number-selection-prospective-status-v2.json`),physical=read(`${E}/physical-rng-prospective-v2-status.json`);
const current={
  'clean-timing-v3':Boolean(timing?.final)&&Number(timing?.progress?.closedEpisodes)===Number(timing?.progress?.fixedBoundaryClosedEpisodes),
  'clean-timing-v4':Boolean(timingV4?.final)&&Number(timingV4?.progress?.closedEpisodes)===Number(timingV4?.progress?.fixedBoundaryClosedEpisodes),
  'clean-lag8-economic-v1':Boolean(lag8?.final)&&Number(lag8?.progress?.comparisonsUsed)===Number(lag8?.progress?.fixedBoundaryComparisons),
  'clean-lag8-economic-v3':Boolean(lag8V3?.final)&&Number(lag8V3?.progress?.comparisonsUsed)===Number(lag8V3?.progress?.fixedBoundaryComparisons),
  'clean-lag-family-v1':Boolean(lagFamily?.final)&&Number(lagFamily?.progress?.comparisonsUsed)===Number(lagFamily?.progress?.fixedBoundaryComparisons),
  'clean-past-lucky-family-v1':Boolean(pastLucky?.final)&&Number(pastLucky?.progress?.roundsUsed)===Number(pastLucky?.progress?.fixedBoundaryRounds),
  'number-selection-v2':numberSel?.gates?.fixedFinalComplete===true,
  'physical-rng-v2':Boolean(physical?.final)&&Number(physical?.progress?.roundsUsedForV2)===Number(physical?.progress?.fixedBoundaryRounds)
};
const newlyClosed=Object.entries(current).filter(([id,done])=>done&&prior.get(id)!==true).map(([id])=>id);
const monitorSummary={jackpotKing:{sourceReadable:readiness.jackpotKingOfficialMonitor?.sourceReadable??null,potEUR:readiness.jackpotKingOfficialMonitor?.latest?.networkPotEUR??null},jackpotKingHazard:{validFutureObservations:readiness.jackpotKingHazardProspectiveV1?.progress?.validObservations??0,hardResets:readiness.jackpotKingHazardProspectiveV1?.progress?.hardResets??0},ageOfGods:{sourceReadable:readiness.ageOfGodsOfficialMonitor?.sourceReadable??null,rawNetworkCounter:readiness.ageOfGodsOfficialMonitor?.latest?.rawNetworkCounter??null,currencyTrusted:readiness.ageOfGodsOfficialMonitor?.latest?.currencyTrusted===true},sharedPlayUZUNetworks:{networksCorroboratedLatest:readiness.sharedProgressiveNetworkObserver?.summary?.networksCorroboratedThisObservation??0,latestObservedAt:readiness.sharedProgressiveNetworkObserver?.observations?.at(-1)?.observedAt??null}};
if(!newlyClosed.length){console.log(JSON.stringify({refreshedReadiness:true,promotionRefresh:false,reason:'NO_NEW_FIXED_BOUNDARY',transitionFamilyV1:readiness.transitionFamilyV1,progressiveNetworks:monitorSummary,current},null,2));process.exit(0)}

runScript('loterias-ai/casino/lightning/research/economic-promotion-gate-v1.mjs');
const refreshed=read(`${E}/economic-promotion-gate-v1.json`)||{};
for(const id of newlyClosed){const row=(refreshed.boundaries||[]).find(x=>x.id===id);if(row?.complete!==true)throw new Error(`boundary ${id} closed in source but not reflected in promotion gate`)}
if(refreshed.policy?.onlyFixedBoundaryFinalsMayPromote!==true||refreshed.policy?.hiddenInterimPerformanceNeverRead!==true||refreshed.policy?.realMoneyAllowed!==false)throw new Error('promotion safety drift after boundary refresh');
console.log(JSON.stringify({refreshedReadiness:true,promotionRefresh:true,newlyClosed,transitionFamilyV1:readiness.transitionFamilyV1,progressiveNetworks:monitorSummary,state:refreshed.state,realMoneyAllowed:refreshed.policy?.realMoneyAllowed},null,2));

// One-shot operational pulse marker 2026-08-19T09:50Z; no cadence or scientific rule changed.
// One-shot operational pulse marker 2026-08-19T11:28Z after scheduler delay; no cadence or scientific rule changed.
// One-shot operational pulse marker 2026-08-19T11:59Z near lag8 fixed boundary; no cadence or scientific rule changed.
// Validation pulse: preserve future-only Jackpot King hazard state and verify new canonical observer.
// One-shot operational pulse marker 2026-08-19T12:28Z near lag8/timing fixed boundaries; no cadence or scientific rule changed.
// Jackpot King hazard observer fix validation pulse 2026-08-19T12:31Z; no scientific rule or cadence changed.
