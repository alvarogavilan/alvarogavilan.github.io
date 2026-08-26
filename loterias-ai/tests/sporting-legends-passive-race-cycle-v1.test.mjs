import assert from 'node:assert/strict';
import {validateSportingLegendsPassiveRaceCycle} from '../casino/jackpots/sporting-legends-passive-race-cycle-v1.mjs';

const base={code:'sljp-1',requestCasino:'betfair-es-ims',instanceCode:null,local:0,currency:'EUR',guaranteedHitTime:2000,winCount:42,amount:100,requestExecInterval:10};
const args={
  cycleId:'cycle-1',protocolId:'sporting-race-protocol-2026-08-26-v1',
  protocolFrozenAtEpochSeconds:1900,recordedAtEpochSeconds:2012,
  beforeBoundary:{...base,gameTimestamp:1990},
  detection:{...base,gameTimestamp:2005,amount:100.02},
  confirmation:{...base,gameTimestamp:2008,amount:100.03},
  expectedBetfairImsCasino:'betfair-es-ims',
  exactBetfairSpainTickerImsBindingVerified:true,
  betfairFirstBetFollowingDayRuleVerified:true,
  providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
  actionLatencySeconds:2,
};
let r=validateSportingLegendsPassiveRaceCycle(args);
assert.equal(r.valid,true);
assert.equal(r.usableForRaceEvidence,true);
assert.equal(r.outcome,'SUCCESS');
assert.equal(r.prospectivelyObserved,true);
assert.equal(r.survivedHypotheticalActionWindow,true);

r=validateSportingLegendsPassiveRaceCycle({...args,confirmation:{...args.confirmation,winCount:43,amount:30}});
assert.equal(r.valid,true);
assert.equal(r.outcome,'FAILURE');
assert.equal(r.survivedHypotheticalActionWindow,false);

r=validateSportingLegendsPassiveRaceCycle({...args,protocolFrozenAtEpochSeconds:1995});
assert.equal(r.valid,false);
assert.equal(r.reason,'PROTOCOL_NOT_FROZEN_BEFORE_CYCLE');

r=validateSportingLegendsPassiveRaceCycle({...args,expectedBetfairImsCasino:'wrong-ims'});
assert.equal(r.valid,false);
assert.equal(r.reason,'REQUEST_CASINO_DOES_NOT_MATCH_VERIFIED_BETFAIR_IMS');

r=validateSportingLegendsPassiveRaceCycle({...args,confirmation:{...args.confirmation,gameTimestamp:2006},actionLatencySeconds:2});
assert.equal(r.valid,false);
assert.equal(r.reason,'CONFIRMATION_BEFORE_HYPOTHETICAL_ACTION_COMPLETION');

console.log('sporting-legends-passive-race-cycle-v1.test.mjs: PASS');
