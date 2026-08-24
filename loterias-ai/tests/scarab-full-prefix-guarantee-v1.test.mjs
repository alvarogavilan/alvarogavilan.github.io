import assert from 'node:assert/strict';
import {
  SCARAB_WILD_PAY_MULTIPLIERS,
  remainingPurchasedSpins,
  guaranteedFinalSpinReturnMultiple,
  evaluateFullPrefixState,
  theoreticalEntryTable
} from '../casino/scarab/scarab-full-prefix-guarantee-v1.mjs';

assert.deepEqual(SCARAB_WILD_PAY_MULTIPLIERS,{2:2,3:20,4:50,5:200});
assert.equal(remainingPurchasedSpins(9),1);
assert.equal(remainingPurchasedSpins(8),2);
assert.equal(remainingPurchasedSpins(1),9);
assert.throws(()=>remainingPurchasedSpins(10));
assert.throws(()=>remainingPurchasedSpins(0));

assert.equal(guaranteedFinalSpinReturnMultiple({fullPrefixReels:2}),2);
assert.equal(guaranteedFinalSpinReturnMultiple({fullPrefixReels:3}),20);
assert.equal(guaranteedFinalSpinReturnMultiple({fullPrefixReels:4}),50);
assert.equal(guaranteedFinalSpinReturnMultiple({fullPrefixReels:5}),200);
assert.equal(guaranteedFinalSpinReturnMultiple({fullPrefixReels:1}),0);

const g9r2=evaluateFullPrefixState({lastCompletedGame:9,fullPrefixReels:2,totalBet:75});
assert.equal(g9r2.remainingSpins,1);
assert.equal(g9r2.finalReturnMultiple,2);
assert.equal(g9r2.guaranteedFinalPayout,150);
assert.equal(g9r2.futureStakeToFinal,75);
assert.equal(g9r2.guaranteedNet,75);
assert.equal(g9r2.guaranteedNetInBetUnits,1);
assert.equal(g9r2.deterministicPositive,true);
assert.equal(g9r2.localSameBetLevelPersistenceVerified,false);
assert.equal(g9r2.localPayoutCapSemanticsVerified,false);
assert.equal(g9r2.realMoneyAllowed,false);

const g8r2=evaluateFullPrefixState({lastCompletedGame:8,fullPrefixReels:2,totalBet:40});
assert.equal(g8r2.remainingSpins,2);
assert.equal(g8r2.guaranteedFinalPayout,80);
assert.equal(g8r2.futureStakeToFinal,80);
assert.equal(g8r2.guaranteedNet,0);
assert.equal(g8r2.deterministicPositive,false);
assert.equal(g8r2.deterministicBreakEvenOrBetter,true);

const g1r3=evaluateFullPrefixState({lastCompletedGame:1,fullPrefixReels:3,totalBet:75});
assert.equal(g1r3.remainingSpins,9);
assert.equal(g1r3.finalReturnMultiple,20);
assert.equal(g1r3.guaranteedFinalPayout,1500);
assert.equal(g1r3.futureStakeToFinal,675);
assert.equal(g1r3.guaranteedNet,825);
assert.equal(g1r3.guaranteedNetInBetUnits,11);
assert.equal(g1r3.deterministicPositive,true);

const g1r4=evaluateFullPrefixState({lastCompletedGame:1,fullPrefixReels:4,totalBet:1});
assert.equal(g1r4.guaranteedNetInBetUnits,41);
const g1r5=evaluateFullPrefixState({lastCompletedGame:1,fullPrefixReels:5,totalBet:1});
assert.equal(g1r5.guaranteedNetInBetUnits,191);

const missingSameBetGate=evaluateFullPrefixState({
  lastCompletedGame:9,
  fullPrefixReels:2,
  totalBet:75,
  localFingerprintVerified:true,
  localPaytableVerified:true,
  localCycleSemanticsVerified:true,
  localPersistentFramesVerified:true,
  localPayoutCapSemanticsVerified:true
});
assert.equal(missingSameBetGate.candidateForExecutionContract,false);
assert.equal(missingSameBetGate.localSameBetLevelPersistenceVerified,false);

const missingCapGate=evaluateFullPrefixState({
  lastCompletedGame:9,
  fullPrefixReels:2,
  totalBet:75,
  localFingerprintVerified:true,
  localPaytableVerified:true,
  localCycleSemanticsVerified:true,
  localPersistentFramesVerified:true,
  localSameBetLevelPersistenceVerified:true
});
assert.equal(missingCapGate.candidateForExecutionContract,false);
assert.equal(missingCapGate.localPayoutCapSemanticsVerified,false);

const localCandidate=evaluateFullPrefixState({
  lastCompletedGame:9,
  fullPrefixReels:2,
  totalBet:75,
  localFingerprintVerified:true,
  localPaytableVerified:true,
  localCycleSemanticsVerified:true,
  localPersistentFramesVerified:true,
  localSameBetLevelPersistenceVerified:true,
  localPayoutCapSemanticsVerified:true
});
assert.equal(localCandidate.candidateForExecutionContract,true);
assert.equal(localCandidate.localSameBetLevelPersistenceVerified,true);
assert.equal(localCandidate.localPayoutCapSemanticsVerified,true);
assert.equal(localCandidate.localExecutionEligible,false);
assert.equal(localCandidate.executionAuthority,'EDGE_CLIENT_EXECUTION_CONTRACT_ONLY');
assert.equal(localCandidate.realMoneyAllowed,false);

const table=theoreticalEntryTable({totalBet:1});
assert.equal(table.length,36);
assert.ok(table.every(x=>x.realMoneyAllowed===false));
assert.ok(table.every(x=>x.localExecutionEligible===false));
assert.ok(table.every(x=>x.candidateForExecutionContract===false));
assert.ok(table.every(x=>x.localSameBetLevelPersistenceVerified===false));
assert.equal(table.filter(x=>x.fullPrefixReels===2&&x.deterministicPositive).length,1);
assert.equal(table.filter(x=>x.fullPrefixReels===3&&x.deterministicPositive).length,9);
assert.equal(table.filter(x=>x.fullPrefixReels===4&&x.deterministicPositive).length,9);
assert.equal(table.filter(x=>x.fullPrefixReels===5&&x.deterministicPositive).length,9);

console.log('scarab-full-prefix-guarantee-v1.test.mjs: PASS');
