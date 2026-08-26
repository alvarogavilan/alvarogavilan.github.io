import assert from 'node:assert/strict';
import {estimateSportingLegendsNetworkFlow,SPORTING_CURRENT_JACKPOT_CONTRIBUTION} from '../casino/jackpots/sporting-legends-network-flow-v1.mjs';

assert.equal(SPORTING_CURRENT_JACKPOT_CONTRIBUTION.effectiveCurrentPotContributionPct,1.69);

const a={epochSeconds:1000,currency:'EUR',scope:'GLOBAL',daily:100,weekly:1000,mega:200000};
const b={epochSeconds:1060,currency:'EUR',scope:'GLOBAL',daily:100.10,weekly:1000.20,mega:200000.545};
const r=estimateSportingLegendsNetworkFlow(a,b);
assert.equal(r.valid,true);
assert.ok(Math.abs(r.deltaCurrentPotsEUR-0.845)<1e-9);
assert.ok(Math.abs(r.impliedNetworkStakeEUR-50)<1e-9);
assert.ok(Math.abs(r.impliedNetworkStakePerMinuteEUR-50)<1e-9);
assert.equal(r.guards.flowDoesNotEqualPlayerHazard,true);
assert.equal(r.guards.betfairSpainBindingRequiredForSpainExecution,true);
assert.equal(r.guards.realMoneyAllowed,false);

const reset=estimateSportingLegendsNetworkFlow(b,{...b,epochSeconds:1120,daily:30});
assert.equal(reset.valid,false);
assert.equal(reset.reason,'RESET_AWARD_OR_SCOPE_CHANGE');

const wrongScope=estimateSportingLegendsNetworkFlow(a,{...b,scope:'BETFAIR_ES'});
assert.equal(wrongScope.valid,false);
assert.equal(wrongScope.reason,'SCOPE_OR_CURRENCY_CHANGED');

const flat=estimateSportingLegendsNetworkFlow(a,{...a,epochSeconds:1060});
assert.equal(flat.valid,false);
assert.equal(flat.reason,'NO_POSITIVE_POT_GROWTH');

console.log('sporting-legends-network-flow-v1.test.mjs: PASS');
