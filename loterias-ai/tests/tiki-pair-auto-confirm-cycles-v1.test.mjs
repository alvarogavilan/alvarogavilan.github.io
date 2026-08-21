import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {findNewSynchronizedCandidate,evaluateCandidate,buildPerIdEvidence,nextEvidencePath,PROTOCOL_FROZEN_AT} from '../casino/jackpots/tiki-pair-reset-auto-confirm-v1.mjs';
import {buildTikiPairProspectiveCycleLedger,MIN_COMPLETED_PROSPECTIVE_CYCLES_FOR_HAZARD_FIT} from '../casino/jackpots/tiki-pair-prospective-cycle-ledger-v1.mjs';

const event=(id,observedAt,previousEUR,currentEUR,classification='UNCLASSIFIED_DROP_CANDIDATE')=>({network:'generic',id,observedAt,previousEUR,currentEUR,dropEUR:previousEUR-currentEUR,dropFraction:(previousEUR-currentEUR)/previousEUR,identityClass:'EXACT_NETWORK_PLUS_UNIQUE_ID',classification});
const oldAt='2026-08-21T14:44:06.603Z';
const newAt='2026-08-22T14:44:06.603Z';
const ledger={events:[
  event('tikitemple2_1',oldAt,1208.43,2.82,'CONFIRMED_METER_RESET'),event('progressivealice1',oldAt,1208.43,2.82,'CONFIRMED_METER_RESET'),
  event('tikitemple2_1',newAt,1500,3.1),event('progressivealice1',newAt,1500,3.1)
]};
const c=findNewSynchronizedCandidate(ledger);
assert.equal(c.observedAt,newAt);
assert.equal(c.previousEUR,1500);
assert.ok(Date.parse(c.observedAt)>=Date.parse(PROTOCOL_FROZEN_AT));
const samples=[0,1].map(i=>({observedAt:`2026-08-22T14:54:2${i}.000Z`,httpStatus:200,targets:{tikitemple2_1:{rowCount:2,distinctAmountsEUR:[5.5],uniqueIdentityInSnapshot:true,amountEUR:5.5},progressivealice1:{rowCount:2,distinctAmountsEUR:[5.5],uniqueIdentityInSnapshot:true,amountEUR:5.5}}}));
const ev=evaluateCandidate(c,samples);assert.equal(ev.confirmed,true);assert.equal(ev.freshPairEqual,true);
const per=buildPerIdEvidence('tikitemple2_1',c,ev,samples,'2026-08-22T14:55:00.000Z');
assert.equal(per.inference.meterResetConfirmed,true);assert.equal(per.inference.jackpotWinConfirmed,false);assert.equal(per.inference.seedPointEstimateEUR,null);assert.equal(per.inference.realMoneyAllowed,false);
const already={events:ledger.events.map(e=>e.observedAt===newAt?{...e,classification:'CONFIRMED_METER_RESET'}:e)};
assert.equal(findNewSynchronizedCandidate(already),null);
const badSamples=structuredClone(samples);badSamples[1].targets.progressivealice1.amountEUR=6.1;badSamples[1].targets.progressivealice1.distinctAmountsEUR=[6.1];
assert.equal(evaluateCandidate(c,badSamples).confirmed,false);
const cycleLedger=buildTikiPairProspectiveCycleLedger(already,'2026-08-22T15:00:00.000Z');
assert.equal(cycleLedger.anchorReset.observedAt,oldAt);assert.equal(cycleLedger.prospectiveConfirmedResets.length,1);assert.equal(cycleLedger.completedProspectiveCycles.length,1);assert.equal(cycleLedger.completedProspectiveCycles[0].endPreResetEUR,1500);assert.equal(cycleLedger.analysis.completedProspectiveCycleCount,1);assert.equal(cycleLedger.analysis.eligibleForHazardFit,false);assert.equal(MIN_COMPLETED_PROSPECTIVE_CYCLES_FOR_HAZARD_FIT,10);assert.equal(cycleLedger.analysis.breakEvenJackpotEUR,null);assert.equal(cycleLedger.analysis.realMoneyAllowed,false);assert.equal(cycleLedger.guards.noAnchorAsProspectiveOutcome,true);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tiki-evidence-'));
fs.writeFileSync(path.join(tmp,'botemania-progressivealice1-reset-confirm-v1.json'),'{}');
fs.writeFileSync(path.join(tmp,'botemania-progressivealice1-reset-confirm-v3.json'),'{}');
assert.equal(path.basename(nextEvidencePath('progressivealice1',tmp)),'botemania-progressivealice1-reset-confirm-v4.json');
assert.equal(path.basename(nextEvidencePath('tikitemple2_1',tmp)),'botemania-tikitemple2_1-reset-confirm-v1.json');
fs.rmSync(tmp,{recursive:true,force:true});
console.log('tiki-pair-auto-confirm-cycles-v1: PASS');
