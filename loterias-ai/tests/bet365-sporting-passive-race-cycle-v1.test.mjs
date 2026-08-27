import assert from 'node:assert/strict';
import {validateBet365SportingPassiveRaceCycle as validate} from '../casino/jackpots/bet365-sporting-passive-race-cycle-v1.mjs';

const row=(ts,{amount=1500,winc=7,ght=2000,exec=10}={})=>({code:'sljp-1',requestCasino:'bet365_es',instanceCode:'es1',tickerEndpoint:'https://ticker.example/webtickers',local:0,currency:'EUR',gameTimestamp:ts,guaranteedHitTime:ght,requestExecInterval:exec,winCount:winc,amount});
const base={
  cycleId:'frank-cycle-001',protocolId:'bet365-frank-race-freeze-v1',protocolFrozenAtEpochSeconds:1980,recordedAtEpochSeconds:2012,
  beforeBoundary:row(1998,{amount:1500}),detection:row(2002,{amount:1500.01}),confirmation:row(2008,{amount:1500.02}),
  expectedBet365JackpotsCasino:'bet365_es',expectedTickerEndpoint:'https://ticker.example/webtickers',
  exactBet365SpainServedBindingVerified:true,servedTenCentJackpotEligibilityVerified:true,bet365FirstBetFollowingDayRuleVerified:true,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
  actionLatencySeconds:5,
};

let r=validate(base);
assert.equal(r.valid,true);assert.equal(r.usableForRaceEvidence,true);assert.equal(r.outcome,'SUCCESS');assert.equal(r.validatorVersion,'bet365-sporting-passive-race-cycle-v1');assert.equal(r.execution.decision,'NO_PLAY');assert.equal(r.execution.realMoneyAllowed,false);

r=validate({...base,confirmation:row(2008,{amount:100,winc:8})});
assert.equal(r.valid,true);assert.equal(r.outcome,'FAILURE');

r=validate({...base,servedTenCentJackpotEligibilityVerified:false});
assert.equal(r.valid,false);assert.equal(r.reason,'SERVED_TEN_CENT_JACKPOT_ELIGIBILITY_NOT_VERIFIED');
r=validate({...base,bet365FirstBetFollowingDayRuleVerified:false});
assert.equal(r.valid,false);assert.equal(r.reason,'BET365_FOLLOWING_DAY_FIRST_BET_RULE_NOT_VERIFIED');
r=validate({...base,exactBet365SpainServedBindingVerified:false});
assert.equal(r.valid,false);assert.equal(r.reason,'BET365_SPAIN_SERVED_BINDING_NOT_VERIFIED');
r=validate({...base,detection:{...base.detection,tickerEndpoint:'https://other.example/webtickers'}});
assert.equal(r.valid,false);assert.equal(r.reason,'BINDING_CHANGED_DURING_CYCLE');
r=validate({...base,confirmation:row(2006),actionLatencySeconds:5});
assert.equal(r.valid,false);assert.equal(r.reason,'CONFIRMATION_BEFORE_HYPOTHETICAL_ACTION_COMPLETION');
r=validate({...base,protocolFrozenAtEpochSeconds:2001});
assert.equal(r.valid,false);assert.equal(r.reason,'PROTOCOL_NOT_FROZEN_BEFORE_CYCLE');

console.log('bet365-sporting-passive-race-cycle-v1.test.mjs: PASS');
