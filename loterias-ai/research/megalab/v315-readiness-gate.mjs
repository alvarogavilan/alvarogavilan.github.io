#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = 'loterias-ai';
const PREREG_PATH = path.join(ROOT, 'data/research/metapleno-v315-preregister.json');
const OUT_PATH = path.join(ROOT, 'data/research/metapleno-v315-execution-readiness.json');
const sha256 = value => crypto.createHash('sha256').update(String(value)).digest('hex');

const preregRaw = fs.readFileSync(PREREG_PATH, 'utf8');
const prereg = JSON.parse(preregRaw);

const requiredFrozenContract = {
  sourceMechanismArtifact: 'Immutable path/hash for the mechanism trained only on the source game.',
  sourceTrainingWindow: 'Chronological source-only training/selection interval.',
  targetHoldoutWindow: 'Untouched target-game evaluation interval.',
  transferMapping: 'Deterministic mapping from source representation/ranks into the target game without target fitting.',
  regimeCompatibilityTest: 'Frozen compatibility criteria evaluated without target outcomes.',
  ticketBudget: 'Exact target ticket/candidate budget used by both transfer and NULL.',
  matchedCostRandomBaselineSpec: 'Exact matched-cost random baseline definition.',
  marginalFrequencyBaselineSpec: 'Frozen marginal-frequency baseline required by the failure gate.',
  recencyBaselineSpec: 'Frozen recency baseline required by the failure gate.',
  multiplicityFamilySize: 'Number of candidate transfers/comparisons in the corrected family.',
  multiplicityMethod: 'Frozen correction method.',
  deterministicSeed: 'Frozen seed(s) for all stochastic operations.',
  minimumTargetDraws: 'Minimum target holdout sample for an inferential conclusion.',
  primaryMetric: 'Exact primary transfer metric and direction of improvement.'
};

const aliases = {
  sourceMechanismArtifact: ['sourceMechanismArtifact','frozenSourceArtifact','sourceModelArtifact','sourceManifest'],
  sourceTrainingWindow: ['sourceTrainingWindow','trainingWindow','sourceWindow'],
  targetHoldoutWindow: ['targetHoldoutWindow','holdoutWindow','targetWindow','oosWindow'],
  transferMapping: ['transferMapping','mapping','rankMapping'],
  regimeCompatibilityTest: ['regimeCompatibilityTest','compatibilityTest','regimeTest'],
  ticketBudget: ['ticketBudget','candidateBudget','budgetTickets'],
  matchedCostRandomBaselineSpec: ['matchedCostRandomBaselineSpec','matchedCostNullSpec','randomBaselineSpec'],
  marginalFrequencyBaselineSpec: ['marginalFrequencyBaselineSpec','frequencyBaselineSpec'],
  recencyBaselineSpec: ['recencyBaselineSpec'],
  multiplicityFamilySize: ['multiplicityFamilySize','hypothesisFamilySize','familySize'],
  multiplicityMethod: ['multiplicityMethod','correctionMethod'],
  deterministicSeed: ['deterministicSeed','seed','seeds'],
  minimumTargetDraws: ['minimumTargetDraws','minimumSample','minTargetDraws'],
  primaryMetric: ['primaryMetric','successMetric','metric']
};

function findValue(keys) {
  const containers = [prereg, prereg.rules || {}, prereg.design || {}, prereg.freeze || {}, prereg.inference || {}];
  for (const obj of containers) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null && obj[key] !== '') return obj[key];
    }
  }
  return undefined;
}

const contract = Object.fromEntries(Object.entries(aliases).map(([field, keys]) => [field, findValue(keys)]));
const missing = Object.keys(requiredFrozenContract).filter(field => contract[field] === undefined);

const invariantChecks = {
  sourceGameTrainingOnly: prereg.rules?.sourceGameTrainingOnly === true,
  targetGameNoTraining: prereg.rules?.targetGameNoTraining === true,
  targetGameNoHyperparameterSearch: prereg.rules?.targetGameNoHyperparameterSearch === true,
  freezeBeforeTargetEvaluation: prereg.rules?.freezeBeforeTargetEvaluation === true,
  regimeCompatibilityRequired: prereg.rules?.regimeCompatibilityRequired === true,
  matchedCostRandomBaselineRequired: prereg.rules?.matchedCostRandomBaselineRequired === true,
  multiplicityCorrectionRequired: prereg.rules?.multiplicityCorrectionRequired === true,
  noRetuningAfterTargetResults: prereg.rules?.noRetuningAfterTargetResults === true,
  realMoneyPassIsFalse: prereg.rules?.realMoneyPass === false,
  realStakeIsZero: Number(prereg.rules?.realStakeEUR) === 0
};

const candidateTransfersFrozen = Array.isArray(prereg.candidateTransfers) && prereg.candidateTransfers.length > 0;
const allInvariantsPass = Object.values(invariantChecks).every(Boolean);
const ready = missing.length === 0 && candidateTransfersFrozen && allInvariantsPass;

const out = {
  version: 'v315-readiness-gate-1',
  family: prereg.family || 'CROSS_GAME_TRANSFER_AUDIT',
  generatedAt: new Date().toISOString(),
  preregistration: { path: PREREG_PATH, version: prereg.version, sha256: sha256(preregRaw) },
  candidateTransfers: prereg.candidateTransfers || [],
  candidateTransfersFrozen,
  invariantChecks,
  frozenContract: contract,
  missingFrozenFields: missing,
  requiredFrozenContract,
  sourceDataReadPerformed: false,
  targetDataReadPerformed: false,
  targetOutcomeReadPerformed: false,
  targetTrainingPerformed: false,
  targetHyperparameterSearchPerformed: false,
  retuningPerformed: false,
  realMoneyPass: false,
  realStakeEUR: 0,
  status: ready ? 'READY_FOR_EXECUTION' : 'BLOCKED_NO_COMPLETE_FROZEN_TRANSFER_CONTRACT',
  decision: ready
    ? 'Transfer evaluation may proceed only with an executor that verifies this exact contract before reading target outcomes.'
    : 'Do not read target outcomes. Freeze every missing transfer, baseline, budget and inference field first; then rerun this gate.',
  scientificInterpretation: ready
    ? 'Readiness is procedural only and is not evidence that any cross-game transfer exists.'
    : 'No scientific conclusion about cross-game transfer is permitted from v315 yet.'
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({status:out.status,missingFrozenFields:out.missingFrozenFields,targetOutcomeReadPerformed:false,realMoneyPass:false},null,2));
if (!ready) process.exitCode = 2;
