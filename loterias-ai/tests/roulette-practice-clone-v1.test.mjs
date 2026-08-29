import assert from 'node:assert/strict';
import {simulateRoulettePractice,exactEuropeanColorEdge} from '../edge-backend/src/roulette-practice-clone-v1.mjs';
const e=exactEuropeanColorEdge();assert.equal(Number(e.houseEdgePct.toFixed(6)),2.702703);
let r=simulateRoulettePractice({strategy:'FLAT_RED',sessions:1000,spinsPerSession:100,bankrollEUR:100,baseBetEUR:1,seed:7});assert.equal(r.ok,true);assert.equal(r.execution.realMoneyAllowed,false);assert.equal(r.model,'FAIR_EUROPEAN_RNG_CLONE');
r=simulateRoulettePractice({strategy:'MARTINGALE_RED',sessions:1000,spinsPerSession:100,bankrollEUR:100,baseBetEUR:1,maxBetEUR:32,seed:7});assert.equal(r.ok,true);assert.ok(r.ruinRate>=0);
r=simulateRoulettePractice({strategy:'SECTOR',sessions:1000,spinsPerSession:100,bankrollEUR:100,baseBetEUR:1,sectorNumbers:[17,34,6,27,13],biasMultipliers:{17:3,34:2,6:2,27:2,13:2},seed:7});assert.equal(r.model,'BIASED_SYNTHETIC_PHYSICAL_WHEEL');
console.log('roulette-practice-clone-v1.test.mjs: PASS');
