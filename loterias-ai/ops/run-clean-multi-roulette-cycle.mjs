#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
const run=(script,{required=true}={})=>{const r=spawnSync(process.execPath,[script],{encoding:'utf8'});if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);if(r.status!==0&&required)process.exit(r.status||1);return r.status===0};
const lightning=[
'loterias-ai/casino/lightning/research/timing-replication-v3.mjs',
'loterias-ai/casino/lightning/research/timing-replication-v4.mjs',
'loterias-ai/casino/lightning/research/physical-rng-prospective-v2.mjs',
'loterias-ai/casino/lightning/research/economic-number-selection-prospective-v2.mjs',
'loterias-ai/casino/lightning/research/lightning-prospective-frozen-lag8-clean-v2.mjs',
'loterias-ai/casino/lightning/research/lightning-prospective-frozen-lag8-clean-v3.mjs',
'loterias-ai/casino/lightning/research/lightning-prospective-lag-family-clean-v2.mjs',
'loterias-ai/casino/lightning/research/lightning-prospective-past-lucky-family-clean-v2.mjs',
'loterias-ai/casino/lightning/research/refresh-on-new-fixed-boundary.mjs'
];
for(const s of lightning)run(s);
const xxxOk=run('loterias-ai/casino/xxxtreme/collect-authoritative-segment-v1.mjs',{required:false});
if(xxxOk)run('loterias-ai/casino/xxxtreme/research/prospective-transition-family-v1.mjs',{required:false});
else console.error('XXXTREME_LANE_FAILED_CLOSED');
const stdOk=run('loterias-ai/casino/standard-roulette/collect-independent-streams-v1.mjs',{required:false});
if(stdOk)run('loterias-ai/casino/standard-roulette/research/prospective-family-v1.mjs',{required:false});
else console.error('STANDARD_ROULETTE_LANES_FAILED_CLOSED');
run('loterias-ai/ops/verify-clean-dual-roulette-cycle.mjs');
run('loterias-ai/ops/verify-standard-roulette-cycle.mjs');
console.log(JSON.stringify({version:'clean-multi-roulette-cycle-v1',lightning:true,xxxtreme:xxxOk,standardRoulette:stdOk,realMoneyAllowed:false},null,2));
