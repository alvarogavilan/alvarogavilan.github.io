#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const E='loterias-ai/casino/lightning/evidence';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};

const gate=read(`${E}/economic-promotion-gate-v1.json`)||{};
const prior=new Map((gate.boundaries||[]).map(x=>[x.id,x.complete===true]));

const timing=read(`${E}/timing-replication-v3-status.json`);
const lag8=read(`${E}/prospective-lag8-clean-v2-status-v1.json`);
const lagFamily=read(`${E}/prospective-lag-family-clean-v2-status-v1.json`);
const pastLucky=read(`${E}/prospective-past-lucky-family-clean-v2-status-v1.json`);
const numberSel=read(`${E}/economic-number-selection-prospective-status-v2.json`);
const physical=read(`${E}/physical-rng-prospective-v2-status.json`);

const current={
  'clean-timing-v3':Boolean(timing?.final)&&Number(timing?.progress?.closedEpisodes)===Number(timing?.progress?.fixedBoundaryClosedEpisodes),
  'clean-lag8-economic-v1':Boolean(lag8?.final)&&Number(lag8?.progress?.comparisonsUsed)===Number(lag8?.progress?.fixedBoundaryComparisons),
  'clean-lag-family-v1':Boolean(lagFamily?.final)&&Number(lagFamily?.progress?.comparisonsUsed)===Number(lagFamily?.progress?.fixedBoundaryComparisons),
  'clean-past-lucky-family-v1':Boolean(pastLucky?.final)&&Number(pastLucky?.progress?.roundsUsed)===Number(pastLucky?.progress?.fixedBoundaryRounds),
  'number-selection-v2':numberSel?.gates?.fixedFinalComplete===true,
  'physical-rng-v2':Boolean(physical?.final)&&Number(physical?.progress?.roundsUsedForV2)===Number(physical?.progress?.fixedBoundaryRounds)
};

const newlyClosed=Object.entries(current).filter(([id,done])=>done&&prior.get(id)!==true).map(([id])=>id);
if(!newlyClosed.length){
  console.log(JSON.stringify({refreshed:false,reason:'NO_NEW_FIXED_BOUNDARY',current,prior:Object.fromEntries(prior)},null,2));
  process.exit(0);
}

for(const script of [
  'loterias-ai/casino/lightning/research/economic-readiness-ledger-v1.mjs',
  'loterias-ai/casino/lightning/research/economic-promotion-gate-v1.mjs'
]){
  const r=spawnSync(process.execPath,[script],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(r.status!==0){
    process.stderr.write(r.stderr||`boundary refresh failed: ${script}\n`);
    process.exit(r.status||1);
  }
}

const refreshed=read(`${E}/economic-promotion-gate-v1.json`)||{};
for(const id of newlyClosed){
  const row=(refreshed.boundaries||[]).find(x=>x.id===id);
  if(row?.complete!==true)throw new Error(`boundary ${id} closed in source but not reflected in promotion gate`);
}
if(refreshed.policy?.onlyFixedBoundaryFinalsMayPromote!==true||refreshed.policy?.hiddenInterimPerformanceNeverRead!==true||refreshed.policy?.realMoneyAllowed!==false)throw new Error('promotion safety drift after boundary refresh');

console.log(JSON.stringify({refreshed:true,newlyClosed,state:refreshed.state,realMoneyAllowed:refreshed.policy?.realMoneyAllowed},null,2));
