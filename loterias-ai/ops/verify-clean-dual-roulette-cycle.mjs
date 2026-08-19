#!/usr/bin/env node
import fs from 'node:fs';

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const must = (condition, message) => { if (!condition) throw new Error(message); };
const E = 'loterias-ai/casino/lightning/evidence';
const X = 'loterias-ai/casino/xxxtreme/evidence';

const s = read(`${E}/authoritative-segment-v2-status.json`);
must(s.freezeVersion === 'authoritative-segment-v2-freeze', 'clean segment freeze drift');
must(s.guards?.strictlyPostBarrier === true, 'clean segment barrier regression');
must(s.guards?.oldAmbiguousGapImported === false, 'clean segment ambiguous-gap regression');
must(s.guards?.realMoneyAllowed === false, 'clean segment real-money regression');
must(s.continuity?.bridgeSafe === true, 'clean segment continuity regression');

const t = read(`${E}/timing-replication-v3-status.json`);
if (Number(t.progress?.closedEpisodes) < 200) {
  must(t.final === null, 'timing v3 early final');
  must(t.disclosure?.performanceHidden === true, 'timing v3 interim performance disclosure');
  must(t.disclosure?.pValueHidden === true, 'timing v3 interim p-value disclosure');
}
must(t.guards?.realMoneyAllowed === false, 'timing v3 real-money regression');

const t4 = read(`${E}/timing-replication-v4-status.json`);
must(t4.freezeVersion === 'timing-replication-v4-freeze-v1', 'timing v4 freeze drift');
must(t4.guards?.preRegisteredBeforeV3Final === true, 'timing v4 preregistration drift');
must(t4.guards?.activationIndependentOfV3Outcome === true, 'timing v4 activation drift');
must(t4.guards?.realMoneyAllowed === false, 'timing v4 real-money regression');
if (Number(t4.progress?.closedEpisodes) < 200) {
  must(t4.final === null, 'timing v4 early final');
  must(t4.disclosure?.performanceHidden === true, 'timing v4 interim performance disclosure');
  must(t4.disclosure?.pValueHidden === true, 'timing v4 interim p-value disclosure');
}
if (t.final) must(t4.activation?.anchorV3FinalBoundaryClosedAt === t.final.finalBoundaryClosedAt, 'timing v4 boundary anchor mismatch');
must(t4.activation?.preBoundaryStateUsed === false, 'timing v4 pre-boundary state regression');

const p = read(`${E}/physical-rng-prospective-v2-status.json`);
if (Number(p.progress?.roundsUsedForV2) < 5000) {
  must(p.final === null, 'physical v2 early final');
  must(p.disclosure?.observedStatisticsHidden === true, 'physical v2 interim statistics disclosure');
  must(p.disclosure?.pValuesHidden === true, 'physical v2 interim p-value disclosure');
}
must(p.guards?.realMoneyAllowed === false, 'physical v2 real-money regression');

const n = read(`${E}/economic-number-selection-prospective-status-v2.json`);
must(n.algorithmCustody?.sourceEngineGitBlobSha === '1e9431d663b6f5ced9dcb24a9d6074bb6bea3874', 'number v2 custody drift');
must(n.guards?.v1SelectorAlgorithmUnchanged === true, 'number v2 selector drift');
must(n.guards?.cleanWarmupNotScored === true, 'number v2 warmup regression');
must(n.guards?.realMoneyAllowed === false, 'number v2 real-money regression');
if (Number(n.progress?.eligibleFutureRounds) < 5000) must(n.disclosure?.candidatePerformanceHidden === true, 'number v2 interim ranking disclosure');

const l = read(`${E}/prospective-lag8-clean-v2-status-v1.json`);
must(l.freezeVersion === 'lightning-prospective-lag8-clean-v2-freeze-v1', 'lag8 v2 freeze drift');
must(l.guards?.first1000Only === true && l.guards?.noOptionalStopping === true, 'lag8 v2 stopping drift');
must(l.guards?.realMoneyAllowed === false, 'lag8 v2 real-money regression');
if (Number(l.progress?.comparisonsUsed) < 1000) {
  must(l.final === null, 'lag8 v2 early final');
  must(l.disclosure?.performanceHidden === true && l.disclosure?.pValueHidden === true && l.disclosure?.directionHidden === true, 'lag8 v2 interim disclosure');
}

const l3 = read(`${E}/prospective-lag8-clean-v3-status-v1.json`);
must(l3.freezeVersion === 'lightning-prospective-lag8-clean-v3-freeze-v1', 'lag8 v3 freeze drift');
must(l3.guards?.preRegisteredBeforeV2Final === true && l3.guards?.activationIndependentOfV2Outcome === true && l3.guards?.postBoundarySampleOnly === true, 'lag8 v3 protocol drift');
must(l3.guards?.realMoneyAllowed === false, 'lag8 v3 real-money regression');
if (Number(l3.progress?.comparisonsUsed) < 1000) {
  must(l3.final === null, 'lag8 v3 early final');
  must(l3.disclosure?.performanceHidden === true && l3.disclosure?.pValueHidden === true && l3.disclosure?.directionHidden === true, 'lag8 v3 interim disclosure');
}
if (l.gates?.fixedBoundaryComplete === true) must(l3.activation?.anchorV2FinalComparisonAt === l.progress?.lastEligibleAt, 'lag8 v3 boundary anchor mismatch');

const f = read(`${E}/prospective-lag-family-clean-v2-status-v1.json`);
must(f.freezeVersion === 'lightning-prospective-lag-family-clean-v2-freeze-v1', 'lag family freeze drift');
must(f.guards?.first5000Only === true && f.guards?.noOptionalStopping === true && f.guards?.perCandidateAlpha === 0.0005, 'lag family protocol drift');
must(f.guards?.realMoneyAllowed === false, 'lag family real-money regression');
if (Number(f.progress?.comparisonsUsed) < 5000) must(f.final === null && f.disclosure?.candidatePerformanceHidden === true && f.disclosure?.candidateRankingHidden === true && f.disclosure?.pValuesHidden === true, 'lag family interim disclosure');

const q = read(`${E}/prospective-past-lucky-family-clean-v2-status-v1.json`);
must(q.freezeVersion === 'lightning-prospective-past-lucky-family-clean-v2-freeze-v1', 'past-lucky freeze drift');
must(q.guards?.pastInformationOnly === true && q.guards?.currentRoundLuckySelectionForbidden === true && q.guards?.first5000Only === true && q.guards?.perCandidateAlpha === 0.0025, 'past-lucky protocol drift');
must(q.guards?.realMoneyAllowed === false, 'past-lucky real-money regression');
if (Number(q.progress?.roundsUsed) < 5000) must(q.final === null && q.disclosure?.candidatePerformanceHidden === true && q.disclosure?.candidateRankingHidden === true && q.disclosure?.roiHidden === true && q.disclosure?.pValuesHidden === true, 'past-lucky interim disclosure');

const tr = read(`${E}/prospective-transition-family-v1-status.json`);
must(tr.freezeVersion === 'lightning-prospective-transition-family-v1-freeze', 'transition family freeze drift');
must(tr.guards?.pastInformationOnly === true && tr.guards?.currentRoundWinnerForbiddenForSelection === true && tr.guards?.currentRoundLuckySelectionForbidden === true, 'transition family information leak');
must(tr.guards?.realMoneyAllowed === false, 'transition family real-money regression');
if (Number(tr.progress?.roundsUsed) < 5000) must(tr.final === null && tr.disclosure?.candidatePerformanceHidden === true && tr.disclosure?.candidateRankingHidden === true && tr.disclosure?.pValuesHidden === true, 'transition family interim disclosure');

if (fs.existsSync(`${X}/authoritative-segment-v1-status.json`)) {
  const x = read(`${X}/authoritative-segment-v1-status.json`);
  must(x.freezeVersion === 'xxxtreme-authoritative-segment-v1-freeze', 'XXXtreme segment freeze drift');
  must(x.guards?.strictlyPostBarrier === true && x.guards?.mergeWithLightningForbidden === true, 'XXXtreme segment isolation drift');
  must(x.crossStream?.independentByRoundId === true && x.continuity?.bridgeSafe === true, 'XXXtreme continuity or independence drift');
  must(x.guards?.realMoneyAllowed === false, 'XXXtreme segment real-money regression');
}

if (fs.existsSync(`${X}/prospective-transition-family-v1-status.json`)) {
  const xt = read(`${X}/prospective-transition-family-v1-status.json`);
  must(xt.freezeVersion === 'xxxtreme-prospective-transition-family-v1-freeze', 'XXXtreme transition freeze drift');
  must(xt.guards?.preBarrierPredictiveStateUsed === false, 'XXXtreme transition pre-barrier state leak');
  must(xt.guards?.realMoneyAllowed === false, 'XXXtreme transition real-money regression');
  if (Number(xt.progress?.roundsScored) < 5000) must(xt.final === null && xt.disclosure?.candidatePerformanceHidden === true && xt.disclosure?.candidateRankingHidden === true && xt.disclosure?.pValuesHidden === true, 'XXXtreme transition interim disclosure');
  const xs = xt.selectedFamilyV1;
  if (xs) {
    must(xs.gates?.economicInterpretationAllowed === false && xs.gates?.realMoneyAllowed === false, 'XXXtreme selected-family economic safety drift');
    if (Number(xs.progress?.roundsScored) < 3000) must(xs.final === null && xs.disclosure?.candidatePerformanceHidden === true && xs.disclosure?.candidateRankingHidden === true && xs.disclosure?.pValuesHidden === true, 'XXXtreme selected-family interim disclosure');
  }
}

console.log('DUAL_ROULETTE_CYCLE_SAFETY_OK');
