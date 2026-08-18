#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
for(const script of ['loterias-ai/scripts/quinigol-prospective-shadow.mjs','loterias-ai/scripts/quinigol-prospective-finalize-30.mjs']){
  const r=spawnSync(process.execPath,[script],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(r.status!==0){process.stderr.write(r.stdout||'');process.stderr.write(r.stderr||`Quinigol local step failed: ${script}\n`);process.exit(r.status||1)}
  if(r.stdout)process.stdout.write(r.stdout);
}
console.log('QUINIGOL_PROSPECTIVE_LOCAL_REFRESHED');
