#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const E='loterias-ai/casino/lightning/evidence';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const runScript=script=>{const r=spawnSync(process.execPath,[script],{encoding:'utf8',stdio:['ignore','pipe','pipe']});if(r.status!==0){process.stderr.write(r.stdout||'');process.stderr.write(r.stderr||`refresh failed: ${script}\n`);process.exit(r.status||1)}};

// Advance the preregistered transition-family lane inside the already-paid capture cycle.
runScript('loterias-ai/casino/lightning/research/lightning-prospective-transition-family-v1.mjs');
const transition=read(`${E}/prospective-transition-family-v1-status.json`)||{};

// Refresh the administrative readiness view on every capture. This does not evaluate hidden performance.
runScript('loterias-ai/casino/lightning/research/economic-readiness-ledger-v1.mjs');
const readinessPath=`${E}/economic-readiness-ledger-v1.json`;
const readiness=read(readinessPath)||{};
readiness.transitionFamilyV1={
  status:transition?.final?'FIXED_FINAL_AVAILABLE':'BLINDED_ACCUMULATING',
  progress:{
    used:Number(transition?.progress?.roundsUsed||0),
    boundary:Number(transition?.progress?.fixedBoundaryRounds||5000),
    remaining:Number(transition?.progress?.roundsRemaining||5000),
    percent:Number(transition?.progress?.fixedBoundaryRounds)>0?Number((100*Number(transition?.progress?.roundsUsed||0)/Number(transition?.progress?.fixedBoundaryRounds)).toFixed(2)):0
  },
  frozenCandidates:8,
  familyWiseAlpha:0.01,
  perCandidateAlpha:0.00125,
  performanceHidden:transition?.disclosure?.candidatePerformanceHidden!==false,
  pastInformationOnly:true,
  realMoneyAllowed:false
};
readiness.transitionFamilyV1UpdatedAt=new Date().toISOString();
fs.writeFileSync(readinessPath,JSON.stringify(readiness,null,2)+'\n');

const gate=read(`${E}/economic-promotion-gate-v1.json`)||{};
const prior=new Map((gate.boundaries||[]).map(x=>[x.id,x.complete===true]));
const timing=read(`${E}/timing-replication-v3-status.json`);
const timingV4=read(`${E}/timing-replication-v4-status.json`);
const lag8=read(`${E}/prospective-lag8-clean-v2-status-v1.json`);
const lag8V3=read(`${E}/prospective-lag8-clean-v3-status-v1.json`);
const lagFamily=read(`${E}/prospective-lag-family-clean-v2-status-v1.json`);
const pastLucky=read(`${E}/prospective-past-lucky-family-clean-v2-status-v1.json`);
const numberSel=read(`${E}/economic-number-selection-prospective-status-v2.json`);
const physical=read(`${E}/physical-rng-prospective-v2-status.json`);
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
if(!newlyClosed.length){console.log(JSON.stringify({refreshedReadiness:true,promotionRefresh:false,reason:'NO_NEW_FIXED_BOUNDARY',transitionFamilyV1:readiness.transitionFamilyV1,current},null,2));process.exit(0)}

// Promotion logic still runs only when a fixed boundary has actually closed.
runScript('loterias-ai/casino/lightning/research/economic-promotion-gate-v1.mjs');
const refreshed=read(`${E}/economic-promotion-gate-v1.json`)||{};
for(const id of newlyClosed){const row=(refreshed.boundaries||[]).find(x=>x.id===id);if(row?.complete!==true)throw new Error(`boundary ${id} closed in source but not reflected in promotion gate`)}
if(refreshed.policy?.onlyFixedBoundaryFinalsMayPromote!==true||refreshed.policy?.hiddenInterimPerformanceNeverRead!==true||refreshed.policy?.realMoneyAllowed!==false)throw new Error('promotion safety drift after boundary refresh');
console.log(JSON.stringify({refreshedReadiness:true,promotionRefresh:true,newlyClosed,transitionFamilyV1:readiness.transitionFamilyV1,state:refreshed.state,realMoneyAllowed:refreshed.policy?.realMoneyAllowed},null,2));

// Operational no-op marker: one-shot capture pulse requested 2026-08-19T08:31Z; scientific protocol unchanged.
