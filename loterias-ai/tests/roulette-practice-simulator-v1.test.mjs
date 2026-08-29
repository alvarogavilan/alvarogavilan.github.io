import assert from 'node:assert/strict';
import {exactEuropeanEvenMoneyEV,simulateEvenMoneyStrategy,compareStrategies,createWheelSampler} from '../edge-backend/src/roulette-practice-simulator-v1.mjs';
const ev=exactEuropeanEvenMoneyEV();assert.equal(ev.houseEdgePct,100/37);assert.equal(ev.netPerUnit,-1/37);
let r=simulateEvenMoneyStrategy({strategy:'FLAT',spins:10000,startingBankrollEUR:100000,seed:42});assert.equal(r.completedSpins,10000);assert.equal(r.totalWageredEUR,10000);assert.equal(r.execution.realMoneyAllowed,false);
r=simulateEvenMoneyStrategy({strategy:'MARTINGALE',spins:10000,startingBankrollEUR:100000,seed:42,tableMaxEUR:64});assert.ok(r.maxStakeEUR<=64);assert.equal(r.practiceOnly,true);
const sample=createWheelSampler({seed:3,bias:{17:20}});let c=0;for(let i=0;i<10000;i++)if(sample()===17)c++;assert.ok(c>1000);
const cmp=compareStrategies({spins:1000,startingBankrollEUR:100000,seed:7});assert.equal(cmp.results.length,4);assert.equal(cmp.execution.decision,'NO_PLAY');
console.log('roulette-practice-simulator-v1.test.mjs: PASS');
