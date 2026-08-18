#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const scripts=[
  'loterias-ai/ops/quinigol-prospective-local.mjs',
  'loterias-ai/casino/lightning/research/economic-readiness-ledger-v1.mjs',
  'loterias-ai/casino/lightning/research/economic-promotion-gate-v1.mjs'
];
for(const script of scripts){
  const r=spawnSync(process.execPath,[script],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(r.status!==0){
    process.stderr.write(r.stdout||'');
    process.stderr.write(r.stderr||`derived refresh failed: ${script}\n`);
    process.exit(r.status||1);
  }
}
console.log('DERIVED_ECONOMIC_STATE_REFRESHED');
