import assert from 'node:assert/strict';
import {expectedShareFactor,uniqueGivenHitProbability,expectedTicketReturnEUR,contrarianScore,sensitivitySurface,executionGate} from '../games/quintuple-plus.mjs';
assert.equal(expectedShareFactor({otherTickets:0,publicCombinationProbability:0.5}),1);
assert.equal(uniqueGivenHitProbability({otherTickets:10,publicCombinationProbability:0}),1);
assert.ok(Math.abs(expectedShareFactor({otherTickets:1,publicCombinationProbability:0.5})-0.75)<1e-12);
const a=expectedTicketReturnEUR({ticketCostEUR:1,ownOutcomeProbability:1e-5,otherTickets:9999,publicCombinationProbability:1e-5,firstCategoryPoolEUR:100000,specialPoolEUR:50000});assert.ok(a.returnRatio>0);
assert.ok(contrarianScore({ownOutcomeProbability:0.01,publicCombinationProbability:0.001})===10);
const rows=sensitivitySurface({ownOutcomeProbabilities:[1e-6,1e-5],publicCombinationProbabilities:[1e-6,1e-4],otherTicketCounts:[10000,50000],firstCategoryPoolsEUR:[10000,50000],specialPoolsEUR:[0,20000]});assert.equal(rows.length,32);assert.equal(executionGate({}).decision,'NO_PLAY');
console.log('quintuple-plus-twin.test.mjs: PASS');
