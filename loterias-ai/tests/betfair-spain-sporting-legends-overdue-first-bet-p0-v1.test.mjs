import assert from 'node:assert/strict';
import fs from 'node:fs';

const p='loterias-ai/edge-live/evidence/betfair-spain-sporting-legends-overdue-first-bet-p0-v1.json';
const d=JSON.parse(fs.readFileSync(p,'utf8'));

assert.equal(d.market,'ES');
assert.equal(d.sourceType,'ONLINE');
assert.equal(d.promotion,false);
assert.equal(d.breakthrough.currentBetfairSpainRuleVerified,true);
assert.equal(d.breakthrough.providerRuleCorroborated,true);
assert.equal(d.breakthrough.semanticCorrection,'FOLLOWING_DAY_NOT_IMMEDIATELY_AFTER_DEADLINE');
assert.equal(d.clockSemantics.earlyRetriggerCutoffIsExecutableDeadline,false);
assert.equal(d.clockSemantics.onlyCurrentTickerGuaranteedHitTimeMayDefineExecutableDeadline,true);
assert.equal(d.clockSemantics.followingDayStartEpochSecondsVerified,false);
assert.equal(d.tickerProtocolProof.gamedataWinCountAttribute,'winc');
assert.equal(d.tickerProtocolProof.amountWinsIsNotWinCount,true);
assert.equal(d.tickerProtocolProof.parserVersionRequired,'playtech-mhb-ticker-parser-v1.6-win-count-timestamps');
assert.equal(d.economicRoute.exactServedRtpVariantRequiredForThisRoute,false);
assert.equal(d.economicRoute.powerPlayWeightingRequiredForThisRoute,false);
assert.equal(d.economicRoute.normalRandomHazardFunctionRequiredForThisSpecialRoute,false);
assert.equal(d.economicRoute.networkFirstBetRaceProbabilityRequired,true);
assert.equal(d.raceBound.usableForExecutionNow,false);
assert.equal(d.gateProgress.closed,6);
assert.equal(d.gateProgress.total,17);
assert.equal(d.execution.decision,'NO_PLAY');
assert.equal(d.execution.realMoneyAllowed,false);
assert.equal(d.execution.realStakeEUR,0);
assert.equal(d.execution.maxSpins,0);
assert.equal(d.execution.maxTotalStakeEUR,0);
assert.equal(d.hardGuards.noRaceAutomation,true);
assert.equal(d.hardGuards.followingDayCannotBeReinterpretedAsImmediatelyAfterDeadline,true);
assert.equal(d.hardGuards.followingDayRuleDoesNotProveOurBetWillBeFirst,true);
assert.equal(d.hardGuards.poissonStationarityCannotBeAssumed,true);

console.log('betfair-spain-sporting-legends-overdue-first-bet-p0-v1.test.mjs: PASS');
