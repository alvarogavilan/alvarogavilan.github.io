#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = 'loterias-ai';
const PREREG_PATH = path.join(ROOT, 'data/research/metapleno-v314-preregister.json');
const OUT_PATH = path.join(ROOT, 'data/research/metapleno-v314-execution-readiness.json');

const sha256 = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const preregRaw = fs.readFileSync(PREREG_PATH, 'utf8');
const prereg = JSON.parse(preregRaw);

const requiredFrozenContract = {
  frozenRankerArtifact: 'Immutable path/hash identifying the causal number-ranking mechanism selected before OOS.',
  frozenTicketCutoff: 'Exact rank/ticket cutoff used to define the boundary before OOS.',
  discoveryWindow: 'Chronological discovery interval used only for model/rule selection.',
  holdoutWindow: 'Chronological untouched OOS interval. Must not overlap discovery.',
  matchedCostNullSpec: 'Exact NULL generator with the same ticket/candidate budget as the tested mechanism.',
  multiplicityFamilySize: 'Number of hypotheses/comparisons included in the correction family.',
  multiplicityMethod: 'Frozen correction method (for example Holm or Bonferroni).',
  deterministicSeed: 'Frozen deterministic seed(s) for every stochastic NULL/permutation operation.',
  minimumEligibleEvents: 'Minimum number of qualifying 5/6 boundary events required before an inferential conclusion.',
  successMetric: 'Exact primary metric and direction of improvement used by the success gate.'
};

const aliases = {
  frozenRankerArtifact: ['frozenRankerArtifact', 'rankerArtifact', 'frozenRanker', 'rankerManifest'],
  frozenTicketCutoff: ['frozenTicketCutoff', 'ticketCutoff', 'rankCutoff'],
  discoveryWindow: ['discoveryWindow', 'trainWindow', 'selectionWindow'],
  holdoutWindow: ['holdoutWindow', 'oosWindow', 'validationWindow'],
  matchedCostNullSpec: ['matchedCostNullSpec', 'nullSpec', 'matchedCostNull'],
  multiplicityFamilySize: ['multiplicityFamilySize', 'hypothesisFamilySize', 'familySize'],
  multiplicityMethod: ['multiplicityMethod', 'correctionMethod'],
  deterministicSeed: ['deterministicSeed', 'seed', 'seeds'],
  minimumEligibleEvents: ['minimumEligibleEvents', 'minEligibleEvents', 'minimumSample'],
  successMetric: ['successMetric', 'primaryMetric', 'metric']
};

function findValue(keys) {
  const containers = [prereg, prereg.scope || {}, prereg.rules || {}, prereg.design || {}, prereg.freeze || {}, prereg.inference || {}];
  for (const obj of containers) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null && obj[key] !== '') return obj[key];
    }
  }
  return undefined;
}

const contract = Object.fromEntries(Object.entries(aliases).map(([field, keys]) => [field, findValue(keys)]));
const missing = Object.keys(requiredFrozenContract).filter(field => contract[field] === undefined);

const chronologyCheck = (() => {
  const d = contract.discoveryWindow;
  const h = contract.holdoutWindow;
  if (!d || !h) return { status: 'NOT_RUN', reason: 'windows_not_frozen' };
  const dEnd = d.end || d.to || (Array.isArray(d) ? d[1] : undefined);
  const hStart = h.start || h.from || (Array.isArray(h) ? h[0] : undefined);
  if (!dEnd || !hStart) return { status: 'NOT_RUN', reason: 'window_boundaries_not_parseable' };
  return dEnd < hStart ? { status: 'PASS', discoveryEnd: dEnd, holdoutStart: hStart } : { status: 'FAIL', discoveryEnd: dEnd, holdoutStart: hStart };
})();

const ready = missing.length === 0 && chronologyCheck.status === 'PASS';
const out = {
  version: 'v314-readiness-gate-1',
  family: prereg.family || 'SIXTH_NUMBER_BOUNDARY_RESCUE_AUDIT',
  generatedAt: new Date().toISOString(),
  preregistration: {
    path: PREREG_PATH,
    version: prereg.version,
    sha256: sha256(preregRaw)
  },
  invariantChecks: {
    trainSelectionPreHoldoutOnly: prereg.rules?.trainSelectionPreHoldoutOnly === true,
    freezeBeforeOOS: prereg.rules?.freezeBeforeOOS === true,
    noTargetOutcomeFeatures: prereg.rules?.noTargetOutcomeFeatures === true,
    noRetuningAfterHoldout: prereg.rules?.noRetuningAfterHoldout === true,
    matchedCostNullRequired: prereg.rules?.matchedCostNullRequired === true,
    multiplicityCorrectionRequired: prereg.rules?.multiplicityCorrectionRequired === true,
    realMoneyPassIsFalse: prereg.rules?.realMoneyPass === false,
    realStakeIsZero: Number(prereg.rules?.realStakeEUR) === 0
  },
  frozenContract: contract,
  missingFrozenFields: missing,
  requiredFrozenContract,
  chronologyCheck,
  archiveReadPerformed: false,
  discoveryDataReadPerformed: false,
  holdoutDataReadPerformed: false,
  targetOutcomeReadPerformed: false,
  retuningPerformed: false,
  realMoneyPass: false,
  realStakeEUR: 0,
  status: ready ? 'READY_FOR_EXECUTION' : 'BLOCKED_NO_COMPLETE_FROZEN_CONTRACT',
  decision: ready
    ? 'Execution may proceed only with an executor that verifies these exact frozen values before reading holdout outcomes.'
    : 'Do not read or score the holdout. Freeze every missing design field first; then rerun this gate.',
  scientificInterpretation: ready
    ? 'Readiness is procedural only; it is not evidence of predictive edge.'
    : 'No scientific conclusion about sixth-number rescue is permitted from v314 yet.'
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  status: out.status,
  missingFrozenFields: out.missingFrozenFields,
  holdoutDataReadPerformed: false,
  realMoneyPass: false
}, null, 2));

if (!ready) process.exitCode = 2;
