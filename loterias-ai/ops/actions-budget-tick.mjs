import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repo = process.env.LOTERIAS_REPO || path.resolve(__dirname, '..', '..');
const stateDir = path.join(repo, '.loterias-mac-node');
const stampPath = path.join(stateDir, 'actions-budget-last-run.json');
const persistentAuditPath = path.join(stateDir, 'actions-budget-audit.json');
const transientAuditPath = path.join(repo, 'loterias-ai', 'data', 'actions-budget-audit.json');
const auditScript = path.join(repo, 'loterias-ai', 'scripts', 'audit-actions-budget.mjs');
const intervalMs = 6 * 60 * 60 * 1000;

fs.mkdirSync(stateDir, { recursive: true });

let previous = null;
try { previous = JSON.parse(fs.readFileSync(stampPath, 'utf8')); } catch {}
const lastRun = previous?.finishedAt ? Date.parse(previous.finishedAt) : 0;
if (Number.isFinite(lastRun) && Date.now() - lastRun < intervalMs) {
  console.log('ACTIONS_BUDGET_LOCAL skip=not_due');
  process.exit(0);
}

const startedAt = new Date().toISOString();
const result = spawnSync(process.execPath, [auditScript], {
  cwd: repo,
  env: process.env,
  encoding: 'utf8',
  timeout: 60_000,
  maxBuffer: 4 * 1024 * 1024
});

if (fs.existsSync(transientAuditPath)) {
  fs.copyFileSync(transientAuditPath, persistentAuditPath);
  fs.rmSync(transientAuditPath, { force: true });
}

const record = {
  startedAt,
  finishedAt: new Date().toISOString(),
  exitCode: result.status,
  success: result.status === 0 && !result.error,
  stdout: String(result.stdout || '').slice(-4000),
  stderr: String(result.stderr || result.error?.message || '').slice(-4000),
  auditPath: persistentAuditPath
};
fs.writeFileSync(stampPath, `${JSON.stringify(record, null, 2)}\n`);

console.log(`ACTIONS_BUDGET_LOCAL success=${record.success} exit=${result.status}`);
process.exit(record.success ? 0 : 1);
