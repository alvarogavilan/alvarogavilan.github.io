import assert from 'node:assert/strict';
import {
  validatePaylines,
  normalizeFramedCells,
  guaranteedWildPrefixForLine,
  guaranteedLinePayCredits,
  analyzeFramedCoverage
} from '../casino/scarab/scarab-payline-coverage-lower-bound-v1.mjs';

const synthetic4x5=[
  [0,0,0,0,0],
  [1,1,1,1,1],
  [2,2,2,2,2],
  [3,3,3,3,3]
];
assert.deepEqual(validatePaylines(synthetic4x5),synthetic4x5);
assert.throws(()=>validatePaylines([[0,0,0]]));
assert.throws(()=>validatePaylines([[0,0,0,0,4]]));

const framed=normalizeFramedCells([[0,0],[1,0],[2,0],[0,1],[1,1]]);
assert.equal(guaranteedWildPrefixForLine(synthetic4x5[0],framed),3);
assert.equal(guaranteedWildPrefixForLine(synthetic4x5[1],framed),2);
assert.equal(guaranteedWildPrefixForLine(synthetic4x5[2],framed),0);
assert.equal(guaranteedLinePayCredits({prefixLength:2}),2);
assert.equal(guaranteedLinePayCredits({prefixLength:3}),20);
assert.equal(guaranteedLinePayCredits({prefixLength:1}),0);

const partial=analyzeFramedCoverage({
  paylines:synthetic4x5,
  framedCells:[[0,0],[1,0],[2,0],[0,1],[1,1]],
  lineStake:1,
  totalBet:4,
  lastCompletedGame:9
});
assert.equal(partial.activePaylines,4);
assert.equal(partial.guaranteedPayCredits,22);
assert.equal(partial.guaranteedFinalPayout,22);
assert.equal(partial.futureStakeToFinal,4);
assert.equal(partial.guaranteedNet,18);
assert.equal(partial.guaranteedNetInBetUnits,4.5);
assert.equal(partial.deterministicPositive,true);
assert.deepEqual(partial.prefixHistogram,{0:2,1:0,2:1,3:1,4:0,5:0});
assert.equal(partial.candidateForExecutionContract,false);
assert.equal(partial.realMoneyAllowed,false);

const mismatch=analyzeFramedCoverage({
  paylines:synthetic4x5,
  framedCells:[[0,0],[1,0],[2,0],[0,1],[1,1]],
  lineStake:1,
  totalBet:5,
  lastCompletedGame:9,
  localGeometryVerified:true,
  localPaytableVerified:true,
  localCycleSemanticsVerified:true,
  localPersistentFramesVerified:true,
  localSameBetLevelPersistenceVerified:true,
  localPayoutCapSemanticsVerified:true,
  localLineScalingVerified:true
});
assert.equal(mismatch.scalingMatches,false);
assert.equal(mismatch.candidateForExecutionContract,false);

const allGates=analyzeFramedCoverage({
  paylines:synthetic4x5,
  framedCells:[[0,0],[1,0],[2,0],[0,1],[1,1]],
  lineStake:1,
  totalBet:4,
  lastCompletedGame:9,
  localGeometryVerified:true,
  localPaytableVerified:true,
  localCycleSemanticsVerified:true,
  localPersistentFramesVerified:true,
  localSameBetLevelPersistenceVerified:true,
  localPayoutCapSemanticsVerified:true,
  localLineScalingVerified:true
});
assert.equal(allGates.scalingMatches,true);
assert.equal(allGates.candidateForExecutionContract,true);
assert.equal(allGates.localExecutionEligible,false);
assert.equal(allGates.realMoneyAllowed,false);

const fullPrefixCells=[];
for(let reel=0;reel<3;reel++) for(let row=0;row<4;row++) fullPrefixCells.push([reel,row]);
const fullPrefix=analyzeFramedCoverage({
  paylines:synthetic4x5,
  framedCells:fullPrefixCells,
  lineStake:1,
  totalBet:4,
  lastCompletedGame:1
});
assert.equal(fullPrefix.guaranteedPayCredits,80);
assert.equal(fullPrefix.guaranteedFinalPayout,80);
assert.equal(fullPrefix.futureStakeToFinal,36);
assert.equal(fullPrefix.guaranteedNet,44);
assert.equal(fullPrefix.guaranteedNetInBetUnits,11);
assert.deepEqual(fullPrefix.prefixHistogram,{0:0,1:0,2:0,3:4,4:0,5:0});
assert.equal(fullPrefix.realMoneyAllowed,false);

console.log('scarab-payline-coverage-lower-bound-v1.test.mjs: PASS');
