#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const scripts=[
  'loterias-ai/research/megalab/v315-seal-guarded.mjs',
  'loterias-ai/research/megalab/primitiva-frequency4-seal-next.mjs',
  'loterias-ai/research/megalab/v315-settle-official-prospective.mjs',
  'loterias-ai/research/megalab/v315-finalize-200.mjs',
  'loterias-ai/research/megalab/v315-administrative-status.mjs',
  'loterias-ai/research/megalab/primitiva-frequency4-status.mjs',
  'loterias-ai/research/megalab/primitiva-frequency4-finalize-50.mjs'
];
for(const script of scripts){
  const r=spawnSync(process.execPath,[script],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(r.status!==0){
    process.stderr.write(r.stdout||'');
    process.stderr.write(r.stderr||`Primitiva prospective local step failed: ${script}\n`);
    process.exit(r.status||1);
  }
  if(r.stdout)process.stdout.write(r.stdout);
}
console.log('PRIMITIVA_PROSPECTIVE_LOCAL_REFRESHED');
