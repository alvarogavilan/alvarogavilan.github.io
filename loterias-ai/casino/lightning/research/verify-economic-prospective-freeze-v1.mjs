#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const FILE='loterias-ai/casino/lightning/evidence/economic-multiplier-window-prospective-freeze-v1.json';
const f=JSON.parse(fs.readFileSync(FILE,'utf8'));

assert.equal(f.version,'economic-multiplier-window-prospective-freeze-v1','freeze version changed');
assert.equal(f.frozenAt,'2026-08-17T21:27:45Z','v1 frozenAt changed; create v2 instead');
assert.equal(f.mode,'PAPER_ONLY','v1 mode changed');
assert.equal(f.origin?.sourceRoundsAtFreeze,2073,'v1 source round boundary changed');
assert.equal(f.frozenRule?.stateObservedAfterCompletedRound,true,'v1 state observation policy changed');
assert.equal(f.frozenRule?.roundsSinceLastWinningLightningAtLeast,8,'v1 gap threshold changed; create v2 instead');
assert.equal(f.frozenRule?.predictNextRounds,7,'v1 horizon changed; create v2 instead');
assert.equal(f.frozenRule?.noRetuning,true,'v1 no-retuning guard removed');
assert.equal(f.prospectiveEpisodeProtocol?.onlyRoundsWithTimestampAfterFrozenAt,true,'v1 prospective timestamp boundary changed');
assert.equal(f.prospectiveEpisodeProtocol?.episodesDoNotOverlap,true,'v1 overlap policy changed');
assert.equal(f.frozenNull?.winnerLightningPerRoundRate,0.067053,'v1 per-round null changed');
assert.equal(f.frozenNull?.iidProbabilityAtLeastOneIn7,0.384823,'v1 primary null changed');
assert.equal(f.frozenNull?.empiricalAllAnchor7RoundRateAtFreeze,0.376573,'v1 secondary null changed');
assert.equal(f.frozenNull?.primaryComparator,'iidProbabilityAtLeastOneIn7','v1 primary comparator changed');
assert.equal(f.gates?.minimumClosedEpisodesForDirectionalRead,30,'v1 directional sample gate changed');
assert.equal(f.gates?.minimumClosedEpisodesForFormalRead,100,'v1 formal sample gate changed');
assert.equal(f.gates?.minimumProspectivePaperRoundsBeforeAnyPromotion,10000,'v1 promotion exposure gate changed');
assert.equal(f.gates?.requirePositiveLiftVsBothFrozenNulls,true,'v1 dual-null gate changed');
assert.equal(f.gates?.requireConfidenceIntervalAndCalibration,true,'v1 CI/calibration gate changed');
assert.equal(f.gates?.requireSeparateNumberSelectionEdge,true,'v1 number-edge gate changed');
assert.equal(f.gates?.realMoneyAllowed,false,'v1 real-money firewall changed');
assert.match(String(f.immutability||''),/Any change creates v2/i,'v1 immutability declaration missing');

console.log('IMMUTABLE_FREEZE_V1_OK');
