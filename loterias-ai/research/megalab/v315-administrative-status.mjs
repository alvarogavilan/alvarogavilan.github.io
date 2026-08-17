#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const SEALS=`${ROOT}/data/research/v315-prospective-seals`;
const SETTLEMENTS=`${ROOT}/data/research/v315-prospective-settlements`;
const FINAL=`${ROOT}/data/research/metapleno-v315-final-200.json`;
const OUT=`${ROOT}/data/research/metapleno-v315-prospective-status.json`;
const files=(dir,re)=>fs.existsSync(dir)?fs.readdirSync(dir).filter(x=>re.test(x)).sort():[];
const sealFiles=files(SEALS,/^v315-primitiva-\d{4}-\d{2}-\d{2}\.json$/);
const settlementFiles=files(SETTLEMENTS,/^v315-primitiva-\d{4}-\d{2}-\d{2}\.json$/);
const targetOf=f=>f.match(/(20\d\d-\d\d-\d\d)/)?.[1]||null;
const finalAvailable=fs.existsSync(FINAL);
const fixedBoundary=200;
const settled=Math.min(settlementFiles.length,fixedBoundary);
const semantic={
  version:'metapleno-v315-prospective-status-v1',
  family:'CROSS_GAME_TRANSFER_AUDIT',
  targetGame:'primitiva',
  sourceGame:'bonoloto',
  phase:finalAvailable?'FIXED_200_FINAL_AVAILABLE':'ACCUMULATING_BLINDED_PROSPECTIVE',
  progress:{
    sealedTargets:sealFiles.length,
    officiallySettledTargets:settlementFiles.length,
    fixedDecisionBoundary:fixedBoundary,
    remainingToFixedBoundary:Math.max(0,fixedBoundary-settled),
    postBoundarySettlementsIgnoredForV315:Math.max(0,settlementFiles.length-fixedBoundary),
    firstSealedTarget:sealFiles.length?targetOf(sealFiles[0]):null,
    latestSealedTarget:sealFiles.length?targetOf(sealFiles.at(-1)):null,
    latestOfficialSettlement:settlementFiles.length?targetOf(settlementFiles.at(-1)):null
  },
  disclosure:{candidatePerformanceHidden:!finalAvailable,candidateRankingPublished:finalAvailable,administrativeProgressOnly:!finalAvailable},
  custody:{preDrawSealRequired:true,officialSELAECrossCheckRequired:true,fixedBoundaryLockedAt200:true,post200MayRescueV315:false},
  guards:{retuningPerformed:false,optionalStoppingAllowed:false,realMoneyPass:false,realStakeEUR:0}
};
const stable=x=>JSON.stringify(x,Object.keys(x).sort());
let changed=true;
if(fs.existsSync(OUT)){
  const old=JSON.parse(fs.readFileSync(OUT,'utf8'));const {_generatedAt,...rest}=old;delete rest.generatedAt;
  changed=JSON.stringify(rest)!==JSON.stringify(semantic);
}
if(changed){
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify({...semantic,generatedAt:new Date().toISOString()},null,2)+'\n');
}
console.log(JSON.stringify({...semantic,changed,realMoneyPass:false},null,2));
