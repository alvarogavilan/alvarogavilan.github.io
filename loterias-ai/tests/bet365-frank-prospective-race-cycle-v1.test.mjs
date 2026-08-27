import assert from 'node:assert/strict';
import {getBet365FrankProspectiveRaceFreeze,validateBet365FrankProspectiveRaceCycle as validate} from '../casino/jackpots/bet365-frank-prospective-race-cycle-v1.mjs';

const freeze=getBet365FrankProspectiveRaceFreeze();
assert.equal(freeze.protocolId,'bet365-spain-frank-sporting-prospective-race-v1');
assert.equal(freeze.freezeCommitSha,'0e482769ebef9ec709aa3a66ef0d0a706bcc4d07');
assert.equal(freeze.freezeCommitUtc,'2026-08-27T01:20:02Z');
assert.equal(freeze.actionLatencySeconds,null);
assert.equal(freeze.firstCountedCycleEnabled,false);
assert.equal(freeze.execution.decision,'NO_PLAY');

const fakeRow={code:'sljp-1',requestCasino:'bet365_es',instanceCode:'es1',tickerEndpoint:'https://ticker.example/webtickers',local:0,currency:'EUR',gameTimestamp:freeze.freezeEpochSeconds+10,guaranteedHitTime:freeze.freezeEpochSeconds+20,requestExecInterval:10,winCount:1,amount:1000};
const r=validate({
  cycleId:'must-not-count-yet',protocolId:'caller-cannot-override',protocolFrozenAtEpochSeconds:0,actionLatencySeconds:0.01,
  beforeBoundary:{...fakeRow,gameTimestamp:freeze.freezeEpochSeconds+18},
  detection:{...fakeRow,gameTimestamp:freeze.freezeEpochSeconds+22},
  confirmation:{...fakeRow,gameTimestamp:freeze.freezeEpochSeconds+30},
  expectedBet365JackpotsCasino:'bet365_es',expectedTickerEndpoint:'https://ticker.example/webtickers',
  exactBet365SpainServedBindingVerified:true,servedTenCentJackpotEligibilityVerified:true,bet365FirstBetFollowingDayRuleVerified:true,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
  recordedAtEpochSeconds:freeze.freezeEpochSeconds+31,
});
assert.equal(r.valid,false);
assert.equal(r.reason,'ACTION_LATENCY_NOT_FROZEN_BEFORE_FIRST_COUNTED_CYCLE');
assert.equal(r.protocolId,'bet365-spain-frank-sporting-prospective-race-v1');
assert.equal(r.actionLatencySeconds,null);
assert.equal(r.execution.realMoneyAllowed,false);

console.log('bet365-frank-prospective-race-cycle-v1.test.mjs: PASS');
