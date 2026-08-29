import assert from 'node:assert/strict';
import {evaluateAmountBoundaryPractice,evaluateTimedFirstContributionPractice,sweepAmountBoundaryPractice,rankPracticeCandidates,syntheticDemo} from '../edge-backend/src/edge-practice-lab-v1.mjs';

let r=evaluateAmountBoundaryPractice({provenance:'SYNTHETIC',currentAmountEUR:990,guaranteedHitAmountEUR:1000,qualifyingStakeEUR:1,baseRtpPct:95,meterContributionPct:1,jackpotAwardFloorEUR:990,captureProbability:1,rtpAccountingVerifiedBaseExcludingJackpot:true});
assert.equal(r.ok,true);
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.metrics.worstCaseCoinInToBoundaryEUR,1000);
assert.equal(r.metrics.worstCaseBaseLossEUR,50);
assert.equal(r.metrics.robustNetEvFloorEUR,940);
assert.equal(r.practiceVerdict,'ROBUST_POSITIVE_IN_PRACTICE');

r=evaluateAmountBoundaryPractice({provenance:'VERIFIED_EXACT',currentAmountEUR:900,guaranteedHitAmountEUR:1000,qualifyingStakeEUR:1,baseRtpPct:95,meterContributionPct:1,jackpotAwardFloorEUR:900,captureProbability:1,rtpAccountingVerifiedBaseExcludingJackpot:false});
assert.equal(r.practiceVerdict,'BLOCKED_RTP_ACCOUNTING');
assert.equal(r.execution.decision,'NO_PLAY');

r=evaluateTimedFirstContributionPractice({provenance:'SYNTHETIC',qualifyingStakeEUR:1,baseRtpPct:95,jackpotAwardFloorEUR:50,probabilityOurContributionIsFirst:0.01,firstContributionGuaranteeVerified:true,rtpAccountingVerifiedBaseExcludingJackpot:true});
assert.equal(r.ok,true);
assert.equal(r.metrics.baseExpectedLossEUR,0.05);
assert.equal(r.metrics.jackpotExpectedValueEUR,0.5);
assert.equal(r.metrics.netEvEUR,0.45);
assert.equal(r.metrics.breakEvenProbabilityOurContributionIsFirst,0.001);

r=evaluateTimedFirstContributionPractice({provenance:'SYNTHETIC',qualifyingStakeEUR:1,baseRtpPct:95,jackpotAwardFloorEUR:50,probabilityOurContributionIsFirst:0.01,firstContributionGuaranteeVerified:false,rtpAccountingVerifiedBaseExcludingJackpot:true});
assert.equal(r.practiceVerdict,'BLOCKED_RULE_NOT_VERIFIED');

const s=sweepAmountBoundaryPractice({provenance:'SYNTHETIC',startAmountEUR:900,guaranteedHitAmountEUR:1000,steps:11,qualifyingStakeEUR:1,baseRtpPct:95,meterContributionPct:1,jackpotAwardFloorEUR:950,captureProbability:1,rtpAccountingVerifiedBaseExcludingJackpot:true});
assert.equal(s.ok,true);
assert.ok(s.rows.length>0);
assert.ok(s.firstRobustPositive);
assert.equal(s.execution.realMoneyAllowed,false);

const rank=rankPracticeCandidates([
  {id:'a',kind:'AMOUNT_BOUNDARY_MHB',provenance:'SYNTHETIC',currentAmountEUR:990,guaranteedHitAmountEUR:1000,qualifyingStakeEUR:1,baseRtpPct:95,meterContributionPct:1,jackpotAwardFloorEUR:990,captureProbability:1,rtpAccountingVerifiedBaseExcludingJackpot:true},
  {id:'b',kind:'TIMED_FIRST_CONTRIBUTION',provenance:'SYNTHETIC',qualifyingStakeEUR:1,baseRtpPct:95,jackpotAwardFloorEUR:10,probabilityOurContributionIsFirst:0.01,firstContributionGuaranteeVerified:true,rtpAccountingVerifiedBaseExcludingJackpot:true}
]);
assert.equal(rank.ranked[0].id,'a');
assert.equal(rank.execution.decision,'NO_PLAY');
assert.equal(syntheticDemo().execution.realMoneyAllowed,false);
console.log('edge-practice-lab-v1.test.mjs: PASS');
