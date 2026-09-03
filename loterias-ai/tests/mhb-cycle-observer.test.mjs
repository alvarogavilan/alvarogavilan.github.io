import assert from 'node:assert/strict';
import {analyzeMeterSeries,summarizeCompletedCycles,empiricalHitBefore,empiricalExecutionGate} from '../digital-twins/core/mhb-cycle-observer.mjs';

const t0=Date.parse('2026-09-03T01:37:00+02:00');
const series=[
  {t:t0,mega:19874.60,peak:2227.53,mini:111.01},
  {t:t0+679000,mega:19891.01,peak:2242.13,mini:150.30},
  {t:t0+(679+351)*1000,mega:19897.75,peak:2248.11,mini:166.41},
  {t:t0+(679+351+300)*1000,mega:19901.12,peak:2251.11,mini:102.48}
];

const a=analyzeMeterSeries(series);
assert.equal(a.cleanFundingIntervals,2,'reset interval must not be treated as funding-only interval');
assert.equal(a.resets.length,1);
assert.equal(a.resets[0].tier,'mini');
assert.ok(Math.abs(a.aggregateAllocationShares.mega-0.2335317260)<1e-9);
assert.ok(Math.abs(a.aggregateAllocationShares.peak-0.2076061737)<1e-9);
assert.ok(Math.abs(a.aggregateAllocationShares.mini-0.5588621003)<1e-9);
assert.ok(Math.abs(a.turnoverPerMinuteEUR-499.5582020)<1e-6);

const one=summarizeCompletedCycles([{hitEUR:172}],{boundaryEUR:200,minCyclesForEmpiricalShape:30});
assert.equal(one.completedCycles,1);
assert.equal(one.empiricalShapeEligible,false);
assert.equal(one.meanHitEUR,172);

const insufficient=empiricalHitBefore([{hitEUR:172}],180,{boundaryEUR:200,minCycles:30});
assert.equal(insufficient.usable,false);
assert.equal(insufficient.reason,'INSUFFICIENT_OPERATOR_CYCLES');

const gate=empiricalExecutionGate({operatorCycles:1,minimumOperatorCycles:30,stakeToHazardModelBinding:'UNKNOWN'});
assert.equal(gate.decision,'NO_PLAY');
assert.equal(gate.reason,'INSUFFICIENT_OPERATOR_CYCLES');

const thirty=Array.from({length:30},(_,i)=>({hitEUR:120+i*2}));
const cdf=empiricalHitBefore(thirty,170,{boundaryEUR:200,minCycles:30});
assert.equal(cdf.usable,true);
assert.equal(cdf.cycles,30);
assert.equal(cdf.hitsAtOrBelowAmount,26);
assert.equal(cdf.execution,'NO_PLAY');

console.log(JSON.stringify({ok:true,turnoverPerMinuteEUR:a.turnoverPerMinuteEUR,allocation:a.aggregateAllocationShares,resets:a.resets,oneCycle:one,cdf},null,2));
