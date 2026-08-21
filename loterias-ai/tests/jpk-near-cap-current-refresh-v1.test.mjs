import assert from 'node:assert/strict';
import { refreshJpkNearCapCurrent } from '../casino/jackpots/jpk-near-cap-current-refresh-v1.mjs';

const ev={
  version:'test-jpk-model',
  inputs:{
    baseRtp:0.9332,
    activeContributionShares:{ROYAL:0.0046,REGAL:0.0046,JACKPOT_KING:0.014},
    reserveShares:{ROYAL:0.00135,REGAL:0.00135,JACKPOT_KING:0.0041},
    capHypothesisEUR:{ROYAL:4078.97,REGAL:40789.77},
    seedHypothesisEUR:{ROYAL:500,REGAL:5000},
    alphaGrid:[1,2]
  },
  model:{family:'HIDDEN_DROP_THRESHOLD_BETA_ALPHA_1_ON_SEED_TO_CAP'},
  current:{observedAt:'2026-08-20T00:00:00Z',potsEUR:{JACKPOT_KING:1,REGAL:2,ROYAL:3}},
  thresholdSensitivity:{ZERO_CONSERVATIVE:{royalOnlyNoOtherJackpotCredit:{min:.9,max:.95}}},
  decision:{currentPositiveEvProven:true,currentScreenPass:true,exactHazardKnown:false,realMoneyAllowed:true},
  guards:{noScreenPassAsProof:true}
};
const live={
  observedAt:'2026-08-21T12:30:00.000Z',
  currentByKey:{
    'blueprint:JACKPOTKING':{amountEUR:128431.96},
    'blueprint:JACKPOTKING_REGAL':{amountEUR:15579.45},
    'blueprint:JACKPOTKING_ROYAL':{amountEUR:1748.02}
  }
};
const out=refreshJpkNearCapCurrent(ev,live,'2026-08-21T12:30:01.000Z');
assert.equal(out.version,'test-jpk-model+live-current-refresh-v1');
const twice=refreshJpkNearCapCurrent(out,live,'2026-08-21T12:30:02.000Z');
assert.equal(twice.version,'test-jpk-model+live-current-refresh-v1','repeated live refresh must not grow the version suffix');
const legacyRepeated={...ev,version:'test-jpk-model+live-current-refresh-v1+live-current-refresh-v1+live-current-refresh-v1'};
assert.equal(refreshJpkNearCapCurrent(legacyRepeated,live).version,'test-jpk-model+live-current-refresh-v1','existing repeated suffixes must collapse on next refresh');
assert.equal(out.current.observedAt,live.observedAt);
assert.deepEqual(out.current.potsEUR,{JACKPOT_KING:128431.96,REGAL:15579.45,ROYAL:1748.02});
assert.equal(out.current.sourceClass,'ALL_NETWORK_BLUEPRINT_EXACT_IDS');
assert.equal(out.current.scenarios.length,4);
assert.equal(out.decision.currentPositiveEvProven,false);
assert.equal(out.decision.realMoneyAllowed,false);
assert.equal(out.decision.automaticBettingAllowed,false);
assert.equal(out.decision.liveCurrentRefreshOnly,true);
assert.equal(out.guards.frozenModelInputsNotRetuned,true);
assert.equal(out.guards.thresholdSensitivityNotRetuned,true);
assert.equal(out.guards.liveRefreshDoesNotValidateSeed,true);
assert.equal(out.guards.liveRefreshDoesNotValidateHazard,true);
assert.equal(out.guards.realMoneyAllowed,false);
assert.deepEqual(out.thresholdSensitivity,ev.thresholdSensitivity);
assert.deepEqual(out.inputs,ev.inputs);

assert.throws(()=>refreshJpkNearCapCurrent(ev,{observedAt:live.observedAt,currentByKey:{}}),/incomplete exact Blueprint JPK live state/);
assert.throws(()=>refreshJpkNearCapCurrent({...ev,model:{family:'OTHER'}},live),/unsupported JPK sensitivity model family/);

console.log('jpk-near-cap-current-refresh-v1.test.mjs: PASS');
