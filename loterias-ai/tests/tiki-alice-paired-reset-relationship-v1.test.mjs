import assert from 'node:assert/strict';
import {evaluatePairedResetRelationship,DISCOVERY_RESET_AT,TIKI_ID,ALICE_ID} from '../casino/jackpots/tiki-alice-paired-reset-relationship-v1.mjs';

const dossier={dossier:{sharedNetwork:{officiallyClaimedPartners:['Wonderland','La Isla de Tiki Templo']}}};
const divergence={conclusion:{exactAliasDisproved:true,sameExactMeterDisproved:true}};
const event=(id,observedAt,previousEUR,currentEUR)=>({network:'generic',id,observedAt,previousEUR,currentEUR,classification:'CONFIRMED_METER_RESET'});
const pair=(observedAt,previousEUR,currentEUR)=>[
  event(TIKI_ID,observedAt,previousEUR,currentEUR),
  event(ALICE_ID,observedAt,previousEUR,currentEUR),
];

const one=evaluatePairedResetRelationship({ledger:{events:pair(DISCOVERY_RESET_AT,1208.43,2.82)},dossier,divergence});
assert.equal(one.frozenDiscoveryPresent,true);
assert.equal(one.independentPairedResetCount,1);
assert.equal(one.pairedResetCouplingCandidate,true);
assert.equal(one.pairedResetCouplingVerified,false,'one frozen discovery event cannot verify coupling');
assert.equal(one.exactAliasVerified,false);
assert.equal(one.exactGameIdentityVerified,false);
assert.equal(one.winfallExactLiveIdVerified,false);
assert.equal(one.realMoneyAllowed,false);

const secondAt='2026-08-25T10:00:00.000Z';
const two=evaluatePairedResetRelationship({ledger:{events:[...pair(DISCOVERY_RESET_AT,1208.43,2.82),...pair(secondAt,987.65,1.74)]},dossier,divergence});
assert.equal(two.prospectivePairedResetCount,1);
assert.equal(two.independentPairedResetCount,2);
assert.equal(two.pairedResetCouplingVerified,true,'second independent synchronized reset may verify only the narrow coupling relationship');
assert.equal(two.exactAliasVerified,false,'divergence permanently forbids exact alias promotion');
assert.equal(two.exactGameIdentityVerified,false,'paired resets alone never prove game identity');
assert.equal(two.winfallExactLiveIdVerified,false,'paired resets alone never prove Winfall live id');
assert.equal(two.economicPromotionAllowed,false);

const mismatched=evaluatePairedResetRelationship({ledger:{events:[
  ...pair(DISCOVERY_RESET_AT,1208.43,2.82),
  event(TIKI_ID,secondAt,987.65,1.74),
  event(ALICE_ID,secondAt,987.65,2.10),
]},dossier,divergence});
assert.equal(mismatched.independentPairedResetCount,1,'different post-reset amounts are not a synchronized paired transition');
assert.equal(mismatched.pairedResetCouplingVerified,false);

const noOperator=evaluatePairedResetRelationship({ledger:{events:[...pair(DISCOVERY_RESET_AT,1208.43,2.82),...pair(secondAt,987.65,1.74)]},dossier:{},divergence});
assert.equal(noOperator.pairedResetCouplingVerified,false,'feed correlation without the operator-declared relationship cannot promote coupling');

console.log('tiki-alice-paired-reset-relationship-v1.test.mjs: PASS');
