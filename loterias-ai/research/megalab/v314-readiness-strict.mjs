#!/usr/bin/env node
import fs from 'node:fs';
import './v314-readiness-gate.mjs';

const OUT_PATH = 'loterias-ai/data/research/metapleno-v314-execution-readiness.json';
const out = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
const failedInvariants = Object.entries(out.invariantChecks || {})
  .filter(([, passed]) => passed !== true)
  .map(([name]) => name);

out.failedInvariants = failedInvariants;
if (failedInvariants.length > 0) {
  out.status = 'BLOCKED_INVARIANT_FAILURE';
  out.decision = 'Do not access or score prospective outcomes until every preregistration invariant passes.';
  process.exitCode = 2;
}

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  status: out.status,
  failedInvariants,
  holdoutDataReadPerformed: out.holdoutDataReadPerformed
}, null, 2));
