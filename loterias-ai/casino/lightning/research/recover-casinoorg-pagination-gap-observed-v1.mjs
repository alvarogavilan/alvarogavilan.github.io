#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const SCRIPT='loterias-ai/casino/lightning/research/recover-casinoorg-pagination-gap-v1.mjs';
const OUT='loterias-ai/casino/lightning/evidence/casinoorg-gap-recovery-observed-v1.json';
const REPORT='loterias-ai/casino/lightning/evidence/casinoorg-gap-recovery-v1.json';
const QUAR='loterias-ai/casino/lightning/evidence/casinoorg-catchup-quarantine.json';
const COLLECT='loterias-ai/casino/lightning/evidence/casinoorg-api-collector.json';

const run=spawnSync(process.execPath,[SCRIPT],{encoding:'utf8',maxBuffer:16*1024*1024});
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}};
const result={
  version:'casinoorg-gap-recovery-observed-v1',
  generatedAt:new Date().toISOString(),
  exitCode:run.status,
  signal:run.signal||null,
  success:run.status===0,
  stdoutTail:String(run.stdout||'').slice(-16000),
  stderrTail:String(run.stderr||'').slice(-16000),
  collector:read(COLLECT),
  quarantine:read(QUAR),
  recovery:read(REPORT),
  guards:{
    diagnosticOnlyWhenRecoveryFails:true,
    mayAdvanceProspectives:false,
    alternateSourcePromotion:false,
    automaticBettingAllowed:false,
    realMoneyAllowed:false
  }
};
fs.mkdirSync('loterias-ai/casino/lightning/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({success:result.success,exitCode:result.exitCode,stderrTail:result.stderrTail.slice(-2000)},null,2));
if(run.status!==0)process.exit(run.status||1);
