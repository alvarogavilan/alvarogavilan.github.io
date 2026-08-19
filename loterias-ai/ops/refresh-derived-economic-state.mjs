#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const scripts=[
  'loterias-ai/casino/xxxtreme/collect-authoritative-segment-v1.mjs',
  'loterias-ai/casino/xxxtreme/research/prospective-transition-family-v1.mjs',
  'loterias-ai/casino/lightning/research/timing-replication-v4.mjs',
  'loterias-ai/casino/lightning/research/lightning-prospective-frozen-lag8-clean-v3.mjs',
  'loterias-ai/casino/lightning/research/lightning-prospective-transition-family-v1.mjs',
  'loterias-ai/casino/cross-table/lag1-blind-convergence-v1.mjs',
  'loterias-ai/ops/quinigol-prospective-local.mjs',
  'loterias-ai/scripts/quinigol-replication-v4.mjs',
  'loterias-ai/scripts/quinigol-replication-v4-finalize-30.mjs',
  'loterias-ai/scripts/quinigol-concentration-robustness-finalize-v1.mjs',
  'loterias-ai/casino/lightning/research/economic-readiness-ledger-v1.mjs',
  'loterias-ai/casino/lightning/research/economic-promotion-gate-v1.mjs',
  'loterias-ai/ops/attach-cross-table-convergence-to-economic-readiness-v1.mjs'
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
