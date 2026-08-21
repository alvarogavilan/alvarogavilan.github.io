#!/usr/bin/env node
import fs from 'node:fs';
import { updateMeterStasis, dynamicFreshnessForMeter } from './meter-stasis-core-v1.mjs';

const LIVE='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const OUT='loterias-ai/edge-live/evidence/meter-stasis-ledger-v1.json';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const live=read(LIVE);
if(!live?.observedAt||!live?.currentByKey) throw new Error('ALL_NETWORK_LIVE_STATE_UNAVAILABLE');
const previous=read(OUT);
const { meters }=updateMeterStasis({previous,currentByKey:live.currentByKey,observedAt:live.observedAt});
const annotated={};
for(const [key,meter] of Object.entries(meters)){
  annotated[key]={...meter,dynamicFreshness30m:dynamicFreshnessForMeter(meter,{maxStasisSeconds:1800})};
}
const out={
  version:'meter-stasis-ledger-v1',
  generatedAt:new Date().toISOString(),
  operator:'botemania-es',
  sourceObservedAt:live.observedAt,
  meters:annotated,
  summary:{
    meterCount:Object.keys(annotated).length,
    metersWithAnyMovement:Object.values(annotated).filter(x=>x.dynamicMovementObserved).length,
    metersWithRecent30mMovement:Object.values(annotated).filter(x=>x.dynamicFreshness30m?.verified===true).length,
  },
  interpretation:'A stationary counter is not declared stale merely because it has not moved. For execution, however, dynamic current-state freshness is only verified after observed movement within the configured window or a separate fresh in-game cross-match. HTTP timestamp freshness alone is insufficient.',
  guards:{
    noStationarityEqualsStaleAssumption:true,
    httpFreshnessDoesNotEqualDynamicFreshness:true,
    noBetting:true,
    realMoneyAllowed:false,
  },
};
fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({summary:out.summary,wagerBet:out.meters['generic:WAGER_BET']||null},null,2));
