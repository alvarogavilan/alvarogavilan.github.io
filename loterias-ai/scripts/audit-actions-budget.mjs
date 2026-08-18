import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repo = path.resolve(__dirname, '..', '..');
const workflowsDir = path.join(repo, '.github', 'workflows');
const policyPath = path.join(repo, 'loterias-ai', 'config', 'actions-budget-policy.json');
const outputPath = path.join(repo, 'loterias-ai', 'data', 'actions-budget-audit.json');
const enforce = process.argv.includes('--enforce');

const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

function fieldCardinality(field, max) {
  const value = field.trim();
  if (value === '*') return max;
  const seen = new Set();
  for (const token of value.split(',')) {
    const part = token.trim();
    if (!part) continue;
    if (/^\*\/\d+$/.test(part)) {
      const step = Number(part.split('/')[1]);
      if (!Number.isFinite(step) || step <= 0) return null;
      for (let i = 0; i < max; i += step) seen.add(i);
      continue;
    }
    const rangeStep = part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
    if (rangeStep) {
      const start = Number(rangeStep[1]);
      const end = Number(rangeStep[2]);
      const step = Number(rangeStep[3] || 1);
      if (step <= 0 || start > end) return null;
      for (let i = start; i <= end && i < max; i += step) if (i >= 0) seen.add(i);
      continue;
    }
    if (/^\d+$/.test(part)) {
      const n = Number(part);
      if (n >= 0 && n < max) seen.add(n);
      else return null;
      continue;
    }
    return null;
  }
  return seen.size || null;
}

function runsPerActiveDay(cron) {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const minutes = fieldCardinality(fields[0], 60);
  const hours = fieldCardinality(fields[1], 24);
  if (minutes == null || hours == null) return null;
  return minutes * hours;
}

const files = fs.existsSync(workflowsDir)
  ? fs.readdirSync(workflowsDir).filter((name) => /^loterias-ai-.*\.ya?ml$/.test(name)).sort()
  : [];

const workflows = [];
let totalScheduledRunsPerActiveDay = 0;
let unknownSchedules = 0;

for (const name of files) {
  const relative = `.github/workflows/${name}`;
  const text = fs.readFileSync(path.join(workflowsDir, name), 'utf8');
  const crons = [...text.matchAll(/cron:\s*['\"]([^'\"]+)['\"]/g)].map((match) => match[1]);
  if (!crons.length) continue;

  const estimates = crons.map((cron) => ({ cron, runsPerActiveDay: runsPerActiveDay(cron) }));
  const knownRuns = estimates.filter((item) => Number.isFinite(item.runsPerActiveDay));
  const scheduledRunsPerActiveDay = knownRuns.reduce((sum, item) => sum + item.runsPerActiveDay, 0);
  unknownSchedules += estimates.length - knownRuns.length;
  totalScheduledRunsPerActiveDay += scheduledRunsPerActiveDay;

  const exception = policy.temporaryExceptions?.[relative] || null;
  const limit = Number(exception?.maxScheduledRunsPerActiveDay ?? policy.maxScheduledRunsPerActiveDay);
  workflows.push({
    workflow: relative,
    estimates,
    scheduledRunsPerActiveDay,
    limit,
    temporaryException: exception,
    overBudget: scheduledRunsPerActiveDay > limit
  });
}

const violations = workflows.filter((item) => item.overBudget);
const exceptionWorkflows = workflows.filter((item) => item.temporaryException);
const generatedAt = new Date().toISOString();
const audit = {
  version: 'actions-budget-audit-v1',
  generatedAt,
  policyVersion: policy.version,
  mode: enforce ? 'ENFORCE' : 'REPORT',
  summary: {
    workflowFilesScanned: files.length,
    scheduledWorkflows: workflows.length,
    totalScheduledRunsPerActiveDay,
    budgetViolations: violations.length,
    temporaryExceptionsInUse: exceptionWorkflows.length,
    unknownSchedules
  },
  policy: {
    maxScheduledRunsPerActiveDay: policy.maxScheduledRunsPerActiveDay,
    targetScheduledRunsPerActiveDay: policy.targetScheduledRunsPerActiveDay,
    highFrequencyResearchPollingAllowedByDefault: policy.policy?.highFrequencyResearchPollingAllowedByDefault === true
  },
  violations,
  temporaryExceptionsInUse: exceptionWorkflows,
  workflows
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`);

console.log(`ACTIONS_BUDGET scheduled=${workflows.length} runsPerActiveDay=${totalScheduledRunsPerActiveDay} violations=${violations.length} exceptions=${exceptionWorkflows.length}`);
for (const item of violations) console.log(`OVER_BUDGET ${item.workflow} runs=${item.scheduledRunsPerActiveDay} limit=${item.limit}`);

if (enforce && (violations.length > 0 || unknownSchedules > 0)) process.exit(1);
