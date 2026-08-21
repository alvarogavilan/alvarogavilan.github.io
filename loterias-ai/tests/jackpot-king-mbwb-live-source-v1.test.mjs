#!/usr/bin/env node
import assert from 'node:assert/strict';
import {buildInference,cleanResetsByTier,exactSpainCapsFromReconstructor,liveBlueprintState} from '../casino/jackpots/jackpot-king-mbwb-inference-v1.mjs';

const recon={
  mbwb:{exactSpainMbwbKnown:true,capEUR:{ROYAL:4078.97,REGAL:40789.77}},
  summary:{minimumCleanResetsForHazardFit:10},
  windows:[
    {tier:'ROYAL',fromEUR:4000,toEUR:500,cleanSingleTierCandidate:true,usableForSpainHazardValidation:true},
    {tier:'REGAL',fromEUR:40000,toEUR:5000,cleanSingleTierCandidate:true,usableForSpainHazardValidation:true},
    {tier:'ROYAL',fromEUR:3000,toEUR:3001,cleanSingleTierCandidate:true,usableForSpainHazardValidation:true}
  ]
};
const observedAt='2026-08-21T10:00:00.000Z';
const allNetwork={
  observedAt,
  source:{httpStatus:200},
  currentByKey:{
    'blueprint:JACKPOTKING':{amountEUR:128414.5},
    'blueprint:JACKPOTKING_REGAL':{amountEUR:15573.71},
    'blueprint:JACKPOTKING_ROYAL':{amountEUR:1742.28}
  }
};
const screen={economicScreen:{
  optimisticIfAll038GoesToTargetPot:{minimumFractionOfCapForBreakEven:0.9221311475409837},
  ifHalfOf038GoesToTargetPot:{minimumFractionOfCapForBreakEven:0.9594882729211087},
  if038SplitEquallyAcrossThreePots:{minimumFractionOfCapForBreakEven:0.9726224783861671}
}};

assert.deepEqual(exactSpainCapsFromReconstructor(recon),{ROYAL:4078.97,REGAL:40789.77,verified:true});
const resets=cleanResetsByTier(recon);
assert.equal(resets.ROYAL.length,1);
assert.equal(resets.REGAL.length,1);

const fresh=liveBlueprintState(allNetwork,Date.parse('2026-08-21T10:02:00.000Z'));
assert.equal(fresh.executionFresh,true);
assert.equal(fresh.pots.ROYAL,1742.28);
assert.equal(fresh.pots.REGAL,15573.71);
assert.equal(fresh.pots.JACKPOT_KING,128414.5);

const out=buildInference({screen,recon,allNetwork,nowMs:Date.parse('2026-08-21T10:02:00.000Z')});
assert.equal(out.exactSpainMbwb.verified,true);
assert.equal(out.exactSpainMbwb.capEUR.ROYAL,4078.97);
assert.equal(out.exactSpainMbwb.capEUR.REGAL,40789.77);
assert.equal(out.nearCapScreen.current.ROYAL.potEUR,1742.28);
assert.equal(out.nearCapScreen.current.REGAL.potEUR,15573.71);
assert.notEqual(out.nearCapScreen.current.ROYAL.potEUR,128414.5,'main Jackpot King pot must never be reused as Royal pot');
assert.equal(out.progress.cleanHardResetsByTier.ROYAL,1);
assert.equal(out.progress.cleanHardResetsByTier.REGAL,1);
assert.equal(out.progress.pooledTierHazardFitForbidden,true);
assert.equal(out.decision.positiveEVKnown,false);
assert.equal(out.decision.realMoneyAllowed,false);

const stale=buildInference({screen,recon,allNetwork,nowMs:Date.parse('2026-08-21T10:20:00.000Z')});
assert.equal(stale.potReadability.executionFresh,false);
assert.equal(stale.nearCapScreen.current,null);
assert.equal(stale.nearCapScreen.lastObservedReference.ROYAL.potEUR,1742.28);
assert.equal(stale.nearCapScreen.lastObservedReference.historicalOrResearchReferenceOnly,true);

console.log('jackpot-king-mbwb-live-source-v1.test.mjs: ok');
