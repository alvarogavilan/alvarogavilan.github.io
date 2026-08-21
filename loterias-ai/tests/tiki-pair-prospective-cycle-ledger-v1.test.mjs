import assert from 'node:assert/strict';
import {buildTikiPairProspectiveCycleLedger,PROTOCOL_FROZEN_AT,MIN_COMPLETED_PROSPECTIVE_CYCLES_FOR_HAZARD_FIT} from '../casino/jackpots/tiki-pair-prospective-cycle-ledger-v1.mjs';

const event=(id,observedAt,previousEUR,currentEUR)=>({network:'generic',id,observedAt,previousEUR,currentEUR,dropFraction:(previousEUR-currentEUR)/previousEUR,classification:'CONFIRMED_METER_RESET'});
const anchorAt='2026-08-21T14:44:06.603Z';
const futureAt='2026-08-22T14:44:06.603Z';
const generic={events:[
  event('tikitemple2_1',anchorAt,1208.43,2.82),
  event('progressivealice1',anchorAt,1208.43,2.82),
  event('tikitemple2_1',futureAt,1500,3.1),
  event('progressivealice1',futureAt,1500,3.1)
]};
const live={observedAt:'2026-08-22T15:00:00.000Z',currentByKey:{
  'generic:tikitemple2_1':{amountEUR:8.2},
  'generic:progressivealice1':{amountEUR:8.4}
}};
const out=buildTikiPairProspectiveCycleLedger({},generic,live,'2026-08-22T15:00:01.000Z');
assert.equal(out.protocol.frozenAt,PROTOCOL_FROZEN_AT);
assert.equal(out.anchorReset.observedAt,anchorAt);
assert.equal(out.prospectiveConfirmedResets.length,1);
assert.equal(out.completedProspectiveCycles.length,1);
assert.equal(out.completedProspectiveCycles[0].endPreResetEUR,1500);
assert.equal(out.completedProspectiveCycles[0].outcomeClass,'PROSPECTIVE_AFTER_FROZEN_PROTOCOL');
assert.equal(out.currentCycle.exactAliasAssumed,false);
assert.equal(out.currentCycle.pairSpreadEUR,0.2);
assert.equal(out.analysis.completedProspectiveCycleCount,1);
assert.equal(out.analysis.eligibleForHazardFit,false);
assert.equal(MIN_COMPLETED_PROSPECTIVE_CYCLES_FOR_HAZARD_FIT,10);
assert.equal(out.analysis.hazardFitProduced,false);
assert.equal(out.analysis.breakEvenJackpotEUR,null);
assert.equal(out.analysis.currentPositiveEvProven,false);
assert.equal(out.analysis.realMoneyAllowed,false);
assert.equal(out.guards.noSingleResetHazardFit,true);
assert.equal(out.guards.noAnchorAsProspectiveOutcome,true);
assert.equal(out.guards.noCycleDataEqualsGameBinding,true);
console.log('tiki-pair-prospective-cycle-ledger-v1: PASS');
