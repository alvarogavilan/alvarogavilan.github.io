import assert from 'node:assert/strict';
import {
  JOB_7_5_REFERENCE,
  ROXOR_PROGRESSIVE_VP_EVIDENCE,
  selectiveRoyalProgressiveThreshold,
  ultimateSpanishSensitivity,
  remasteredForeignSideBetBreakEven,
} from '../casino/jackpots/roxor-progressive-vp-lineage-screen-v1.mjs';

assert.equal(ROXOR_PROGRESSIVE_VP_EVIDENCE.ultimate.providerId,'roxor-gaming');
assert.equal(ROXOR_PROGRESSIVE_VP_EVIDENCE.ultimate.spanishManualScreenshot.paytable.fullHouse,7);
assert.equal(ROXOR_PROGRESSIVE_VP_EVIDENCE.ultimate.spanishManualScreenshot.paytable.flush,5);
assert.equal(ROXOR_PROGRESSIVE_VP_EVIDENCE.ultimate.spanishManualScreenshot.qualifyingStakeVerified,false);
assert.equal(ROXOR_PROGRESSIVE_VP_EVIDENCE.videoPokerRemastered.foreignSameTitleComparator.transferableToSpain,false);
assert.equal(ROXOR_PROGRESSIVE_VP_EVIDENCE.guards.realMoneyAllowed,false);

const anyRoyal=selectiveRoyalProgressiveThreshold({qualifyingWagerPerHand:2.5,triggerRoyalFraction:1});
const spades=selectiveRoyalProgressiveThreshold({qualifyingWagerPerHand:2.5,triggerRoyalFraction:0.25});
assert.equal(anyRoyal.blocked,false);
assert.equal(spades.blocked,false);
assert.ok(Math.abs(anyRoyal.breakEvenJackpotEUR-5869.379917218881)<1e-9);
assert.ok(Math.abs(spades.breakEvenJackpotEUR-17477.519668875524)<1e-9);
assert.ok(spades.breakEvenJackpotEUR>anyRoyal.breakEvenJackpotEUR);
assert.equal(anyRoyal.executable,false);
assert.equal(spades.realMoneyAllowed,false);

const sensitivity=ultimateSpanishSensitivity({meterEUR:3448.25});
assert.ok(Math.abs(sensitivity.maximumQualifyingWagerForHistoricalMeterToBreakEvenIfAnyRoyalEUR-1.4687454418668398)<1e-9);
assert.ok(Math.abs(sensitivity.maximumQualifyingWagerForHistoricalMeterToBreakEvenIfSpadesOnlyEUR-0.49324075517144805)<1e-9);
assert.equal(sensitivity.positiveEvProven,false);
assert.equal(sensitivity.executable,false);
assert.equal(sensitivity.realMoneyAllowed,false);

const foreign=remasteredForeignSideBetBreakEven();
assert.ok(Math.abs(foreign.breakEvenJackpotUSD-201244.73684210522)<1e-6);
assert.equal(foreign.foreignSeedBelowBreakEven,true);
assert.equal(foreign.sameMechanicVerifiedSpain,false);
assert.equal(foreign.executable,false);
assert.equal(foreign.realMoneyAllowed,false);

assert.ok(JOB_7_5_REFERENCE.royalProbability>0);
console.log('edge-intrinsic-progressive-vp-v31.test.mjs: PASS');
