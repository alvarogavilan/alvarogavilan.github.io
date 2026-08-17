#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import './v315-readiness-gate.mjs';

const ROOT = 'loterias-ai';
const OUT_PATH = `${ROOT}/data/research/metapleno-v315-execution-readiness.json`;
const PREREG_PATH = `${ROOT}/data/research/metapleno-v315-preregister.json`;
const SOURCE_PATH = `${ROOT}/data/research/meta-pleno-v138-bonoloto-graph-topology.json`;

const out = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
const prereg = JSON.parse(fs.readFileSync(PREREG_PATH, 'utf8'));
const sourceRaw = fs.readFileSync(SOURCE_PATH, 'utf8');
const sourceBlobContract = prereg.design?.sourceMechanismArtifact?.blobSha;
const source = JSON.parse(sourceRaw);

const strictInvariantChecks = {
  ...(out.invariantChecks || {}),
  contractMarkedFrozen: prereg.status === 'PREREGISTERED_CONTRACT_FROZEN',
  exactlyOneTransferFrozen: Array.isArray(prereg.candidateTransfers) && prereg.candidateTransfers.length === 1 && prereg.candidateTransfers[0] === 'bonoloto_to_primitiva',
  inverseDirectionExcluded: Array.isArray(prereg.excludedTransfers) && prereg.excludedTransfers.some(x => x.transfer === 'primitiva_to_bonoloto' && x.reason === 'ANTI_DUPLICATE_GUARD'),
  incompatibleEuromillonesExcluded: Array.isArray(prereg.excludedTransfers) && prereg.excludedTransfers.some(x => x.transfer === 'euromillones_main_numbers_to_6ofN_rank_family' && x.reason === 'REGIME_COMPATIBILITY_GUARD'),
  sourceFamilyFrozen: source.version === 'v138' && source.gameId === 'bonoloto' && source.family === 'DYNAMIC_COOCCURRENCE_GRAPH_TOPOLOGY' && Array.isArray(source.leaders) && source.leaders.length === 12,
  sourcePathFrozen: prereg.design?.sourceMechanismArtifact?.path === SOURCE_PATH,
  sourceBlobShaLooksImmutable: typeof sourceBlobContract === 'string' && /^[0-9a-f]{40}$/.test(sourceBlobContract),
  sharedSixOf49SupportFrozen: String(prereg.design?.transferMapping?.sharedSupport || '').includes('1..49') && String(prereg.design?.transferMapping?.sharedSupport || '').includes('6'),
  targetProspectiveOnly: prereg.design?.targetHoldoutWindow?.prospectiveOnly === true && prereg.design?.targetHoldoutWindow?.start === '2026-08-18',
  noTargetFitting: prereg.design?.transferMapping?.targetFitting === false && prereg.design?.transferMapping?.targetParameterSearch === false,
  budgetWithinCap: Number(prereg.design?.ticketBudget?.maximumTheoreticalCostEUR) <= 15 && Number(prereg.design?.ticketBudget?.hardProjectCapEUR) === 15 && Number(prereg.design?.ticketBudget?.realStakeEUR) === 0,
  matchedCostBudget: prereg.design?.matchedCostRandomBaselineSpec?.sameLineBudgetAsTransfer === true,
  nullTargetFree: prereg.design?.matchedCostRandomBaselineSpec?.usesTargetOutcomeForSelection === false,
  frozenMultiplicity: Number.isInteger(prereg.freeze?.multiplicityFamilySize) && prereg.freeze.multiplicityFamilySize === 12 && String(prereg.freeze?.multiplicityMethod || '').includes('Holm-Bonferroni'),
  deterministicSeedFrozen: Number.isInteger(prereg.freeze?.deterministicSeed),
  minimumTargetDrawsPositive: Number.isInteger(prereg.freeze?.minimumTargetDraws) && prereg.freeze.minimumTargetDraws >= 200,
  extremeAuditRequired: String(prereg.inference?.extremeEventAudit || '').includes('5/6') && String(prereg.inference?.extremeEventAudit || '').includes('6/6'),
  realMoneyStillBlocked: prereg.realMoneyPass === false && Number(prereg.realStakeEUR) === 0
};

const failedInvariants = Object.entries(strictInvariantChecks)
  .filter(([, passed]) => passed !== true)
  .map(([name]) => name);

out.invariantChecks = strictInvariantChecks;
out.failedInvariants = failedInvariants;
out.sourceArtifactAudit = {
  path: SOURCE_PATH,
  jsonVersion: source.version,
  gameId: source.gameId,
  family: source.family,
  frozenLeaderCount: Array.isArray(source.leaders) ? source.leaders.length : null,
  contractBlobSha: sourceBlobContract,
  contentSha256: crypto.createHash('sha256').update(sourceRaw).digest('hex')
};
out.targetOutcomeReadPerformed = false;
out.targetTrainingPerformed = false;
out.targetHyperparameterSearchPerformed = false;
out.retuningPerformed = false;
out.realMoneyPass = false;
out.realStakeEUR = 0;

if (failedInvariants.length > 0) {
  out.status = 'BLOCKED_INVARIANT_FAILURE';
  out.decision = 'Do not read prospective Primitiva outcomes. Repair the frozen contract first.';
}

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  status: out.status,
  missingFrozenFields: out.missingFrozenFields,
  failedInvariants,
  targetOutcomeReadPerformed: false,
  realMoneyPass: false,
  realStakeEUR: 0
}, null, 2));

if (failedInvariants.length > 0 || out.status !== 'READY_FOR_EXECUTION') process.exitCode = 2;
