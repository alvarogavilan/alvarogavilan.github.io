#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const CONFIG='loterias-ai/research/megalab/v290-config.json';
const ENGINE='loterias-ai/research/megalab/v290-megalab.mjs';
const RESULT='loterias-ai/data/research/metapleno-v290-megalab.json';
const MEMORY='loterias-ai/data/research/metapleno-global-negative-memory.json';
const STATE='loterias-ai/data/research/metapleno-v291-local-swarm-state.json';

const read=(p,fallback)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return fallback;}};
const write=(p,v)=>{fs.mkdirSync(p.split('/').slice(0,-1).join('/'),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};
const base=read(CONFIG,null);
if(!base)throw new Error('missing v290 MegaLab config');
const prior=read(STATE,{version:'v291-local-swarm-state',maxScientistIndex:Number(base.scientistCount||4096),totalBatches:0,totalRequestedNewScientists:0,cumulativeGeneratedHypotheses:Number(base.scientistCount||4096),lastResult:null});
const batch=Math.max(128,Math.min(8192,Number(process.env.MEGALAB_BATCH||1024)));
const start=Math.max(Number(base.scientistCount||4096),Number(prior.maxScientistIndex||0));
const target=start+batch;
const original=fs.readFileSync(CONFIG,'utf8');
let run;
try{
  write(CONFIG,{...base,version:'v291-local-incremental',scientistCount:target,compute:{...(base.compute||{}),singleAction:false,localIncremental:true,batchSize:batch,persistNegativeHashes:true}});
  run=spawnSync(process.execPath,[ENGINE],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:Number(process.env.MEGALAB_TIMEOUT_MS||1500000),maxBuffer:16*1024*1024});
} finally {
  fs.writeFileSync(CONFIG,original);
}
if(run?.status!==0){process.stderr.write(run?.stdout||'');process.stderr.write(run?.stderr||'MegaLab incremental run failed\n');process.exit(run?.status||1);}
const result=read(RESULT,null),memory=read(MEMORY,{hashes:{}});
if(!result)throw new Error('MegaLab result missing');
if(result.realMoneyPass!==false||Number(result.realStakeEUR||0)!==0)throw new Error('MegaLab safety regression');
if(result.scientificSafety?.oosUntouched!==true||result.scientificSafety?.postFreezeUntouched!==true)throw new Error('MegaLab OOS safety regression');
const generatedThisRun=Number(result.counts?.generated||0);
const cumulativeGenerated=Math.max(Number(prior.cumulativeGeneratedHypotheses||0),start)+Math.max(0,target-start);
const discoverySignal=result.anyAuditSignal===true;
const next={
  version:'v291-local-swarm-state',
  generatedAt:new Date().toISOString(),
  mode:'LOCAL_INCREMENTAL_VIRTUAL_SCIENTISTS',
  priorMaxScientistIndex:start,
  maxScientistIndex:target,
  batchRequested:batch,
  totalBatches:Number(prior.totalBatches||0)+1,
  totalRequestedNewScientists:Number(prior.totalRequestedNewScientists||0)+batch,
  cumulativeGeneratedHypotheses:cumulativeGenerated,
  negativeMemoryHashes:Object.keys(memory.hashes||{}).length,
  multiplicityPolicy:{
    cumulativeFamilySize:cumulativeGenerated,
    engineAuditSignalIsDiscoveryOnly:true,
    reusedHistoricalValidationCannotPromote:true,
    reusedPostFreezeCannotPromote:true,
    prospectivePreregistrationRequiredForEverySwarmCandidate:true,
    candidateSelectionMustBeFrozenBeforeFutureEvidence:true
  },
  lastResult:{
    generated:generatedThisRun,
    skippedMemory:Number(result.counts?.skippedMemory||0),
    promotedSelection:Number(result.counts?.promotedSelection||0),
    promotedOOS:Number(result.counts?.promotedOOS||0),
    newNegatives:Number(result.counts?.newNegatives||0),
    discoveryAuditSignal:discoverySignal,
    scientificPromotionCandidate:false,
    reason:discoverySignal?'Historical OOS pattern discovered by a cumulatively large search family; freeze it prospectively before any evidential claim.':'No historical discovery signal in this batch.',
    realMoneyPass:false
  },
  guards:{
    negativeMemoryPersistent:true,
    oldHypothesesNotIntentionallyRetuned:true,
    historicalOOSReusedForDiscoveryOnly:true,
    noHistoricalSignalCanPromoteDirectly:true,
    prospectiveFutureDataRequired:true,
    realMoneyAllowed:false,
    realStakeEUR:0
  }
};
write(STATE,next);
console.log(JSON.stringify(next,null,2));
