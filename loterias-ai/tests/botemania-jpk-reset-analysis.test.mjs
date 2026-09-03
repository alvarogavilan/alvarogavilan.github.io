import assert from 'node:assert/strict';
import {classifyBotemaniaJpkDropRows,summarizeBotemaniaJpkResetGroups} from '../edge-backend/src/botemania-jpk-reset-analysis-v1.mjs';

const rows=[
  {observed_at_ms:1000,observed_at:'2026-09-03T00:00:01Z',type:'DROP_CANDIDATE',meter_key:'blueprint:JACKPOTKING_ROYAL',before_eur:3900,after_eur:1500,delta_eur:-2400},
  {observed_at_ms:2000,observed_at:'2026-09-03T00:00:02Z',type:'DROP_CANDIDATE',meter_key:'blueprint:JACKPOTKING_REGAL',before_eur:39000,after_eur:15000,delta_eur:-24000},
  {observed_at_ms:2000,observed_at:'2026-09-03T00:00:02Z',type:'DROP_CANDIDATE',meter_key:'blueprint:JACKPOTKING_ROYAL',before_eur:3800,after_eur:1400,delta_eur:-2400},
  {observed_at_ms:3000,observed_at:'2026-09-03T00:00:03Z',type:'DROP_CANDIDATE',meter_key:'blueprint:JACKPOTKING',before_eur:130000,after_eur:129999,delta_eur:-1},
  {observed_at_ms:4000,observed_at:'2026-09-03T00:00:04Z',type:'METER_CHANGE',meter_key:'blueprint:JACKPOTKING_ROYAL',before_eur:1500,after_eur:1501,delta_eur:1},
];
const groups=classifyBotemaniaJpkDropRows(rows);
assert.equal(groups.length,3);
const clean=groups.find(g=>g.observedAtMs===1000);
assert.equal(clean.classification,'CLEAN_SINGLE_TIER_RESET_CANDIDATE');
assert.equal(clean.rows[0].tier,'ROYAL');
const multi=groups.find(g=>g.observedAtMs===2000);
assert.equal(multi.classification,'AMBIGUOUS_MULTI_TIER_DROP');
const weak=groups.find(g=>g.observedAtMs===3000);
assert.equal(weak.classification,'WEAK_OR_DUPLICATE_DROP');
const summary=summarizeBotemaniaJpkResetGroups(groups);
assert.equal(summary.cleanSingleTierResetCandidates,1);
assert.equal(summary.byTier.ROYAL.cleanResetCandidates,1);
assert.equal(summary.byTier.REGAL.cleanResetCandidates,0);
assert.equal(summary.inferenceLimits.resetHistoryAloneDoesNotIdentifySelectedTitleHazardPerEUR,true);
assert.equal(summary.decision,'NO_PLAY');
assert.equal(summary.realStakeEUR,0);
console.log('botemania-jpk-reset-analysis.test.mjs: PASS');
