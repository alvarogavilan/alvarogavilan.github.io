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

// XXXtreme is officially available on PokerStars Spain, but the current outcome feed is auxiliary research only.
// It may keep accumulating blinded research evidence, but official-venue evidence is mandatory before promotion.
const xxxOk=run('loterias-ai/casino/xxxtreme/collect-authoritative-segment-v1.mjs',{required:false});
if(xxxOk)run('loterias-ai/casino/xxxtreme/research/prospective-transition-family-v1.mjs',{required:false});
else console.error('XXXTREME_LANE_FAILED_CLOSED');

// Immersive/Auto third-party collectors are deliberately NOT executed here.
// They are manual auxiliary research only under official-venue-policy-v1 and require ALLOW_AUXILIARY_RESEARCH=1.
run('loterias-ai/ops/verify-clean-dual-roulette-cycle.mjs');
console.log(JSON.stringify({version:'clean-multi-roulette-cycle-v2',lightning:true,xxxtreme:xxxOk,standardRoulette:'MANUAL_AUXILIARY_ONLY_NOT_SCHEDULED',allowedCasinoOperators:['pokerstars.es','playuzu.es'],officialVenueEvidenceRequiredBeforePromotion:true,realMoneyAllowed:false},null,2));
