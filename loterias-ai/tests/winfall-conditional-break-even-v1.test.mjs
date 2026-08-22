import assert from 'node:assert/strict';
import {
  breakEvenMultipleOfMeanHit,
  conditionalKFromMeanHit,
  conditionalBreakEvenFromMeanHit,
  buildConditionalWinfallDiagnostic,
} from '../casino/jackpots/winfall-conditional-break-even-v1.mjs';

const mult=breakEvenMultipleOfMeanHit({baseRtpPct:94.85,contributionPct:0.60});
assert.ok(Math.abs(mult-8.583333333333337)<1e-12);

const k=conditionalKFromMeanHit({meanHitEUR:1208.43,contributionPct:0.60});
assert.ok(Math.abs(k-4.965120031776768e-6)<1e-18);

const be=conditionalBreakEvenFromMeanHit({meanHitEUR:1208.43,baseRtpPct:94.85,contributionPct:0.60});
assert.ok(Math.abs(be-10372.3575)<1e-9);

const one=buildConditionalWinfallDiagnostic({observedHitCandidatesEUR:[1208.43]});
assert.equal(one.sample.count,1);
assert.equal(one.decision.estimatorPromotionAllowed,false);
assert.equal(one.decision.realMoneyAllowed,false);
assert.equal(one.guards.singleResetNeverEnough,true);

const ten=buildConditionalWinfallDiagnostic({
  observedHitCandidatesEUR:Array(10).fill(1208.43),
  exactPoolIdentityVerified:true,
  jackpotAwardVerified:true,
  constantHazardVerified:true,
});
assert.equal(ten.decision.estimatorPromotionAllowed,true);
assert.equal(ten.decision.economicPromotionAllowed,false);
assert.equal(ten.decision.realMoneyAllowed,false);

console.log('PASS winfall-conditional-break-even-v1');
