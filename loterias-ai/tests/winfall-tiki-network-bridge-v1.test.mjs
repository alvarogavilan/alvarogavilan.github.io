import assert from 'node:assert/strict';
import {buildWinfallTikiBridge,CANDIDATE_FEED_KEY} from '../casino/jackpots/winfall-tiki-network-bridge-v1.mjs';

const now=Date.parse('2026-08-22T01:00:00.000Z');
const dossier={dossier:{sharedNetwork:{officiallyClaimedPartners:['Wonderland','La Isla de Tiki Templo']}}};
const network={observedAt:'2026-08-22T00:59:30.000Z',currentByKey:{[CANDIDATE_FEED_KEY]:{amountEUR:123.45}}};
const unverifiedTiki={identityClosure:{feedKey:CANDIDATE_FEED_KEY,verified:false},aliasClosure:{sameExactMeterDisproved:true}};
const verifiedTiki={identityClosure:{feedKey:CANDIDATE_FEED_KEY,verified:true},aliasClosure:{sameExactMeterDisproved:true}};

{
  const x=buildWinfallTikiBridge({dossier,tikiClosure:unverifiedTiki,network,nowMs:now});
  assert.equal(x.structuralBridge.officialWinfallSharesPotWithTikiTemplo,true);
  assert.equal(x.structuralBridge.tikiTemploExactCounterVerified,false);
  assert.equal(x.structuralBridge.exactLiveIdVerified,false);
  assert.equal(x.current.candidateMeterEUR,123.45);
  assert.equal(x.current.currentJackpotEUR,null,'candidate meter must not become Winfall jackpot before exact partner identity');
  assert.ok(x.decision.blockers.includes('TIKI_TEMPLO_EXACT_COUNTER_IDENTITY_NOT_VERIFIED'));
  assert.equal(x.decision.realMoneyAllowed,false);
}

{
  const x=buildWinfallTikiBridge({dossier,tikiClosure:verifiedTiki,network,nowMs:now});
  assert.equal(x.structuralBridge.exactLiveIdVerified,true);
  assert.equal(x.current.currentJackpotEUR,123.45);
  assert.equal(x.decision.identityPromotionAllowed,true);
  assert.equal(x.decision.economicPromotionAllowed,false,'shared-pot identity alone is never EV proof');
  assert.equal(x.decision.currentPositiveEvProven,false);
  assert.equal(x.decision.realMoneyAllowed,false);
  assert.ok(x.decision.blockers.includes('WINDFALL_TRIGGER_HAZARD_NOT_VERIFIED'));
}

{
  const stale={...network,observedAt:'2026-08-21T20:00:00.000Z'};
  const x=buildWinfallTikiBridge({dossier,tikiClosure:verifiedTiki,network:stale,nowMs:now});
  assert.equal(x.structuralBridge.exactLiveIdVerified,true,'structural identity can remain verified');
  assert.equal(x.current.sourceFresh,false);
  assert.equal(x.current.currentJackpotEUR,null,'stale meter may never be exposed as current jackpot');
  assert.equal(x.decision.realMoneyAllowed,false);
}

{
  const wrongPartner={dossier:{sharedNetwork:{officiallyClaimedPartners:['Wonderland','La Isla de Tiki']}}};
  const x=buildWinfallTikiBridge({dossier:wrongPartner,tikiClosure:verifiedTiki,network,nowMs:now});
  assert.equal(x.structuralBridge.officialWinfallSharesPotWithTikiTemplo,false);
  assert.equal(x.structuralBridge.exactLiveIdVerified,false);
}

console.log('winfall-tiki-network-bridge-v1.test.mjs: PASS');
