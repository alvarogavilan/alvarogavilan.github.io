import assert from 'node:assert/strict';
import {evaluateResetPair} from '../casino/jackpots/tiki-pair-reset-confirm-v1.mjs';

const ledger={events:[
  {network:'generic',id:'tikitemple2_1',observedAt:'2026-08-21T14:44:06.603Z',previousEUR:1208.43,currentEUR:2.82,dropEUR:1205.61,dropFraction:0.997666,identityClass:'EXACT_NETWORK_PLUS_UNIQUE_ID',classification:'UNCLASSIFIED_DROP_CANDIDATE'},
  {network:'generic',id:'progressivealice1',observedAt:'2026-08-21T14:44:06.603Z',previousEUR:1208.43,currentEUR:2.82,dropEUR:1205.61,dropFraction:0.997666,identityClass:'EXACT_NETWORK_PLUS_UNIQUE_ID',classification:'UNCLASSIFIED_DROP_CANDIDATE'}
]};
const sample=(at,v)=>({observedAt:at,httpStatus:200,targets:{
  tikitemple2_1:{rowCount:2,distinctAmountsEUR:[v],uniqueIdentityInSnapshot:true,amountEUR:v},
  progressivealice1:{rowCount:2,distinctAmountsEUR:[v],uniqueIdentityInSnapshot:true,amountEUR:v}
}});
const ok=evaluateResetPair(ledger,[sample('2026-08-21T14:50:00Z',5.1),sample('2026-08-21T14:50:03Z',5.2)],'2026-08-21T14:50:04Z');
assert.equal(ok.pairSignature.classification,'SYNCHRONIZED_SHARED_RESET_SIGNATURE');
assert.equal(ok.inference.sharedResetSignatureConfirmed,true);
assert.equal(ok.inference.exactAliasProven,false);
assert.equal(ok.inference.exactGameIdentityProven,false);
assert.equal(ok.inference.tikiTropicoIdentityProven,false);
assert.equal(ok.inference.seedPointEstimateEUR,null);
assert.equal(ok.inference.realMoneyAllowed,false);

const badSample=sample('2026-08-21T14:51:00Z',5.3);
badSample.targets.progressivealice1={rowCount:2,distinctAmountsEUR:[5.3,900],uniqueIdentityInSnapshot:false,amountEUR:null};
const bad=evaluateResetPair(ledger,[sample('2026-08-21T14:50:57Z',5.2),badSample]);
assert.equal(bad.pairSignature.classification,'PAIR_SIGNATURE_NOT_CONFIRMED');
assert.equal(bad.inference.sharedResetSignatureConfirmed,false);
assert.equal(bad.inference.realMoneyAllowed,false);
console.log('tiki-pair-reset-confirm-v1.test.mjs: PASS');
