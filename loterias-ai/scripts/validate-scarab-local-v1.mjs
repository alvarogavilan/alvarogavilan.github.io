import {spawnSync} from 'node:child_process';
import process from 'node:process';

const checks=[
  ['Syntax · deterministic engine',['--check','loterias-ai/casino/scarab/scarab-full-prefix-guarantee-v1.mjs']],
  ['Syntax · EDGE Live',['--check','loterias-ai/edge-live/research-breakthroughs-v1.mjs']],
  ['Scarab deterministic theorem',['loterias-ai/tests/scarab-full-prefix-guarantee-v1.test.mjs']],
  ['Regulatory software fingerprints',['loterias-ai/tests/scarab-regulatory-software-fingerprints-v1.test.mjs']],
  ['Spain registry and La Toja visual bridge',['loterias-ai/tests/scarab-spain-registry-visual-fingerprint-v1.test.mjs']],
  ['Primary and regulatory evidence guards',['loterias-ai/tests/spain-scarab-primary-regulatory-closure-v1.test.mjs']],
  ['Physical Spain evidence guards',['loterias-ai/tests/spain-igt-physical-variable-state-v1.test.mjs']],
  ['EDGE Live deterministic P0 card',['loterias-ai/tests/edge-live-physical-breakthroughs-v1.test.mjs']]
];

let passed=0;
console.log(`Scarab local validation · Node ${process.version}`);
console.log('Execution policy: validation only; this runner never enables real-money play.\n');

for(const [name,args] of checks){
  process.stdout.write(`▶ ${name}\n`);
  const run=spawnSync(process.execPath,args,{stdio:'inherit'});
  if(run.error){
    console.error(`✗ ${name}: ${run.error.message}`);
    process.exit(1);
  }
  if(run.status!==0){
    console.error(`✗ ${name}: exit ${run.status}`);
    process.exit(run.status||1);
  }
  passed+=1;
  console.log(`✓ ${name}\n`);
}

console.log(`PASS · ${passed}/${checks.length} Scarab/EDGE checks passed locally.`);
