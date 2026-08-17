#!/usr/bin/env node
import fs from 'node:fs';
import './v314-readiness-gate.mjs';

const OUT_PATH = 'loterias-ai/data/research/metapleno-v314-execution-readiness.json';
const PREREG_PATH = 'loterias-ai/data/research/metapleno-v314-preregister.json';
const out = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
const prereg = JSON.parse(fs.readFileSync(PREREG_PATH, 'utf8'));

const strictInvariantChecks = {
  ...(out.invariantChecks || {}),
  contractMarkedFrozen: prereg.status === 'PREREGISTERED_CONTRACT_FROZEN',
  antiDuplicateGuardRequired: prereg.rules?.antiDuplicateGuardRequired === true,
  prospectiveHoldoutOnly: prereg.design?.holdoutWindow?.prospectiveOnly === true,
  auditOnlyNoPoolMutation: prereg.design?.frozenTicketCutoff?.actionPolicy?.startsWith('audit only') === true,
  nullCostMatched: prereg.design?.matchedCostNullSpec?.nullChangesTicketCost === false,
  nullTargetFree: prereg.design?.matchedCostNullSpec?.nullUsesTargetOutcomeForSelection === false,
  positiveMultiplicityFamily: Number.isInteger(prereg.freeze?.multiplicityFamilySize) && prereg.freeze.multiplicityFamilySize > 0,
  deterministicSeedFrozen: Number.isInteger(prereg.freeze?.deterministicSeed),
  minimumEligibleEventsPositive: Number.isInteger(prereg.freeze?.minimumEligibleEvents) && prereg.freeze.minimumEligibleEvents > 0
};

const failedInvariants = Object.entries(strictInvariantChecks)
  .filter(([, passed]) => passed !== true)
  .map(([name]) => name);

out.invariantChecks = strictInvariantChecks;
out.failedInvariants = failedInvariants;
if (failedInvariants.length > 0) {
  out.status = 'BLOCKED_INVARIANT_FAILURE';
  out.decision = 'Do not access or score prospective outcomes until every preregistration invariant passes.';
  process.exitCode = 2;
}

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  status: out.status,
  missingFrozenFields: out.missingFrozenFields,
  failedInvariants,
  chronologyCheck: out.chronologyCheck,
  holdoutDataReadPerformed: out.holdoutDataReadPerformed
}, null, 2));
