import assert from 'node:assert/strict';
import {validateSportingLegendsVisualPassiveCycle} from '../casino/jackpots/sporting-legends-visual-passive-cycle-v1.mjs';
import {deriveProspectiveVisualRaceLowerBoundFromValidatedCycles} from '../casino/jackpots/sporting-legends-visual-empirical-race-bound-v1.mjs';
import {evaluateSportingLegendsOverdueFirstBet} from '../casino/jackpots/sporting-legends-overdue-first-bet-v1.mjs';

const sha=c=>c.repeat(64);
const visualBase={
  sourceClass:'BETFAIR_ES_OFFICIAL_GAME_CLIENT_SCREENSHOT',market:'ES',operator:'Betfair Spain',
  gameId:'ap-mccoy-sporting-legends-cptn',gameTitle:'AP McCoy Sporting Legends™',tier:'DAILY',stakeEUR:0.25,
  imageEvidencePresent:true,humanReviewVerified:true,exactGameIdentityVisible:true,exactDailyLabelVisible:true,
  exactDisplayedValuesVerified:true,officialClientIdentityVerified:true,
};
const cycle=validateSportingLegendsVisualPassiveCycle({
  cycleId:'visual-cycle-1',protocolId:'visual-p1',protocolFrozenAtEpochSeconds:900,recordedAtEpochSeconds:1010,
  beforeBoundary:{...visualBase,evidenceId:'a',evidenceSha256:sha('a'),capturedAtEpochSeconds:1000,amountEUR:100,countdownSeconds:5},
  detection:{...visualBase,evidenceId:'b',evidenceSha256:sha('b'),capturedAtEpochSeconds:1005,amountEUR:100.02,countdownSeconds:0},
  confirmation:{...visualBase,evidenceId:'c',evidenceSha256:sha('c'),capturedAtEpochSeconds:1009,amountEUR:100.03,countdownSeconds:0},
  actionLatencySeconds:3,
});
assert.equal(cycle.valid,true);
assert.equal(cycle.usableForRaceEvidence,true);
assert.equal(cycle.usableForExecution,false);

const bound=deriveProspectiveVisualRaceLowerBoundFromValidatedCycles({
  cycles:[cycle],confidence:0.95,protocolId:'visual-p1',actionLatencySeconds:3,prospectiveProtocolFrozen:true,
});
assert.equal(bound.valid,true);
assert.equal(bound.usableForExecution,true);
assert.equal(bound.source,'VALIDATED_PASSIVE_CYCLE_LEDGER');
assert.equal(bound.ledgerSubtype,'VISUAL_OFFICIAL_CLIENT');
assert.equal(bound.evidenceMode,'DIRECT_OFFICIAL_GAME_CLIENT_VISUAL');
assert.ok(Math.abs(bound.firstBetRaceProbabilityLowerBound-0.05)<1e-10);

const serverBase={code:'sljp-1',requestCasino:'betfair-es-ims',instanceCode:null,local:0,currency:'EUR',guaranteedHitTime:2000,winCount:42,amount:100,requestExecInterval:10};
const green=evaluateSportingLegendsOverdueFirstBet({
  before:{...serverBase,gameTimestamp:1990},after:{...serverBase,gameTimestamp:2005,amount:100.02},nowEpochSeconds:2010,
  exactBetfairSpainTickerImsBindingVerified:true,expectedBetfairImsCasino:'betfair-es-ims',
  betfairFirstBetFollowingDayRuleVerified:true,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
  stakeEUR:0.25,raceEvidence:bound,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,
  measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true,
});
assert.equal(green.decision,'GREEN');
assert.equal(green.realMoneyAllowed,true);
assert.equal(green.maxSpins,1);

const noTicker=evaluateSportingLegendsOverdueFirstBet({
  before:{...serverBase,gameTimestamp:1990},after:{...serverBase,gameTimestamp:2005,amount:100.02},nowEpochSeconds:2010,
  exactBetfairSpainTickerImsBindingVerified:false,expectedBetfairImsCasino:'betfair-es-ims',
  betfairFirstBetFollowingDayRuleVerified:true,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,
  stakeEUR:0.25,raceEvidence:bound,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,
  measuredActionLatencyVerified:true,measuredActionLatencySeconds:2,prospectiveDryRunCycleVerified:true,
});
assert.equal(noTicker.decision,'NO_PLAY');
assert.equal(noTicker.realMoneyAllowed,false);
assert.equal(noTicker.reason,'BETFAIR_SPAIN_TICKER_IMS_NOT_VERIFIED');

const duplicate=deriveProspectiveVisualRaceLowerBoundFromValidatedCycles({
  cycles:[cycle,{...cycle,cycleId:'visual-cycle-2'}],protocolId:'visual-p1',actionLatencySeconds:3,prospectiveProtocolFrozen:true,
});
assert.equal(duplicate.valid,false);
assert.equal(duplicate.reason,'MISSING_OR_DUPLICATE_EVIDENCE_ID');

console.log('sporting-legends-visual-empirical-race-bound-v1.test.mjs: PASS');
