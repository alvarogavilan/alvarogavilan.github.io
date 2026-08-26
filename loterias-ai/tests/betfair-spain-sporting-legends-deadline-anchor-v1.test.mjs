import assert from 'node:assert/strict';
import fs from 'node:fs';

const p='loterias-ai/edge-live/evidence/betfair-spain-sporting-legends-deadline-anchor-v1.json';
const d=JSON.parse(fs.readFileSync(p,'utf8'));

assert.equal(d.market,'ES');
assert.equal(d.sourceType,'ONLINE');
assert.equal(d.promotion,false);
assert.equal(d.source.facts.dailyPublishedAnchorEuropeLondon,'21:00');
assert.equal(d.source.facts.weeklyPublishedAnchorDay,'SATURDAY');
assert.equal(d.source.facts.weeklyPublishedAnchorEuropeLondon,'12:00');
assert.equal(d.source.facts.dailyEarlyWinBefore21LondonCanRetriggerWithinRemainingClock,true);
assert.equal(d.source.facts.noPlayAtDueTimeThenFirstBetNextDayWins,true);
assert.equal(d.dateSpecificTimezoneConversion.dailyAnchorEuropeMadrid,'22:00');
assert.equal(d.scientificConsequence.publishedDailyObservationWindowKnown,true);
assert.equal(d.scientificConsequence.publishedScheduleAnchorEqualsCurrentGuaranteedHitTime,false);
assert.equal(d.scientificConsequence.currentGuaranteedHitTimeRecovered,false);
assert.equal(d.scientificConsequence.tickerImsBindingVerified,false);
assert.equal(d.execution.decision,'NO_PLAY');
assert.equal(d.execution.realMoneyAllowed,false);
assert.equal(d.execution.realStakeEUR,0);
assert.equal(d.execution.maxSpins,0);
assert.equal(d.execution.maxTotalStakeEUR,0);
assert.equal(d.hardGuards.publishedClockCannotSubstituteForTickerGuaranteedHitTime,true);
console.log('betfair-spain-sporting-legends-deadline-anchor-v1.test.mjs: PASS');
