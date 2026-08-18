import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repo = process.env.LOTERIAS_REPO || path.resolve(__dirname, '..', '..');
const configPath = process.env.LOTERIAS_RUNTIME_CONFIG || path.join(repo, 'loterias-ai', 'config', 'lab-runtime.json');
const localStateDir = path.join(repo, '.loterias-mac-node');
const runtimeRoot = process.env.LOTERIAS_RUNTIME_ROOT || path.join(os.homedir(), '.loterias-ai-runtime');
const workspace = path.join(runtimeRoot, 'workspace');
const logsDir = path.join(localStateDir, 'logs');
const cacheDir = path.join(localStateDir, 'evidence-cache');
const statePath = path.join(localStateDir, 'runtime-state.json');
const statusPath = path.join(localStateDir, 'runtime-status.json');

for (const dir of [localStateDir, runtimeRoot, logsDir, cacheDir]) fs.mkdirSync(dir, { recursive: true });

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file, value) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || repo,
    env: options.env || process.env,
    encoding: 'utf8',
    timeout: options.timeoutMs || 30_000,
    maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function gitHead() {
  const result = run('/usr/bin/git', ['rev-parse', 'HEAD'], { cwd: repo, timeoutMs: 10_000 });
  return result.status === 0 ? String(result.stdout || '').trim() : 'unavailable';
}

function restoreCachedEvidence() {
  if (!fs.existsSync(cacheDir)) return 0;
  let restored = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const source = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(source);
        continue;
      }
      if (!entry.isFile()) continue;
      const relative = path.relative(cacheDir, source);
      const target = path.join(workspace, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
      restored += 1;
    }
  };
  walk(cacheDir);
  return restored;
}

function copySourceWorkspace(sourceHead, state) {
  const marker = path.join(workspace, '.loterias-runtime-head');
  let markerHead = null;
  try { markerHead = fs.readFileSync(marker, 'utf8').trim(); } catch {}
  if (markerHead === sourceHead && fs.existsSync(path.join(workspace, 'loterias-ai'))) return { refreshed: false, restored: 0 };

  fs.rmSync(workspace, { recursive: true, force: true });
  fs.mkdirSync(workspace, { recursive: true });
  fs.cpSync(repo, workspace, {
    recursive: true,
    filter(src) {
      const relative = path.relative(repo, src);
      if (!relative) return true;
      const first = relative.split(path.sep)[0];
      return first !== '.git' && first !== '.loterias-mac-node';
    }
  });
  const restored = restoreCachedEvidence();
  fs.writeFileSync(marker, `${sourceHead}\n`);
  state.workspaceHead = sourceHead;
  state.workspaceSyncedAt = new Date().toISOString();
  state.cachedEvidenceRestored = restored;
  return { refreshed: true, restored };
}

function tail(value, max = 4000) {
  const text = String(value || '');
  return text.length <= max ? text : text.slice(text.length - max);
}

function cacheOutputs(task) {
  const copied = [];
  for (const relative of task.outputs || []) {
    const source = path.join(workspace, relative);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
    const target = path.join(cacheDir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    copied.push(relative);
  }
  return copied;
}

const config = readJson(configPath, null);
if (!config || !Array.isArray(config.tasks)) {
  writeJsonAtomic(statusPath, {
    generatedAt: new Date().toISOString(),
    health: 'error',
    error: 'INVALID_OR_MISSING_RUNTIME_CONFIG',
    configPath
  });
  process.exit(1);
}

const state = readJson(statePath, {
  version: 1,
  createdAt: new Date().toISOString(),
  workspaceHead: null,
  tasks: {}
});
state.tasks ||= {};

const startedAt = Date.now();
const sourceHead = gitHead();
let workspaceRefreshed = false;
let cachedEvidenceRestored = 0;
try {
  const sync = copySourceWorkspace(sourceHead, state);
  workspaceRefreshed = sync.refreshed;
  cachedEvidenceRestored = sync.restored;
} catch (error) {
  writeJsonAtomic(statusPath, {
    generatedAt: new Date().toISOString(),
    health: 'error',
    sourceHead,
    error: 'WORKSPACE_SYNC_FAILED',
    detail: String(error?.stack || error)
  });
  process.exit(1);
}

const now = Date.now();
const maxTasks = Math.max(1, Number(config.maxTasksPerTick || 1));
const tasks = config.tasks
  .filter((task) => task && task.enabled !== false && task.id && task.run)
  .sort((a, b) => Number(a.priority || 100) - Number(b.priority || 100));

let executed = 0;
const events = [];

for (const task of tasks) {
  if (executed >= maxTasks) break;
  const previous = state.tasks[task.id] || {};
  const intervalMs = Math.max(60_000, Number(task.everyMinutes || 60) * 60_000);
  const nextEligibleAt = previous.nextEligibleAt ? Date.parse(previous.nextEligibleAt) : 0;
  if (Number.isFinite(nextEligibleAt) && nextEligibleAt > now) continue;

  const missingEnv = (task.requiresEnv || []).filter((name) => !process.env[name]);
  if (missingEnv.length) {
    const retryMs = Math.max(intervalMs, 60 * 60_000);
    state.tasks[task.id] = {
      ...previous,
      lastAttemptAt: new Date().toISOString(),
      lastStatus: 'SKIPPED_MISSING_ENV',
      missingEnv,
      nextEligibleAt: new Date(now + retryMs).toISOString()
    };
    events.push({ id: task.id, status: 'SKIPPED_MISSING_ENV', missingEnv });
    continue;
  }

  const taskStarted = Date.now();
  const env = { ...process.env, ...(task.env || {}) };
  const timeoutMs = Math.max(10_000, Number(task.timeoutSeconds || 300) * 1000);
  const result = run('/bin/bash', ['-lc', task.run], { cwd: workspace, env, timeoutMs });
  const durationMs = Date.now() - taskStarted;
  const success = result.status === 0 && !result.error;
  const copiedOutputs = cacheOutputs(task);
  const logPath = path.join(logsDir, `${task.id}.log`);
  fs.appendFileSync(logPath,
    `\n[${new Date().toISOString()}] status=${success ? 'SUCCESS' : 'FAILED'} exit=${result.status} durationMs=${durationMs}\n` +
    `${result.stdout || ''}${result.stderr || ''}\n`
  );

  const failureRetryMs = Math.min(intervalMs, 15 * 60_000);
  state.tasks[task.id] = {
    ...previous,
    lastAttemptAt: new Date().toISOString(),
    ...(success ? { lastSuccessAt: new Date().toISOString() } : { lastFailureAt: new Date().toISOString() }),
    lastStatus: success ? 'SUCCESS' : 'FAILED',
    exitCode: result.status,
    durationMs,
    copiedOutputs,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr || result.error?.message),
    nextEligibleAt: new Date(now + (success ? intervalMs : failureRetryMs)).toISOString()
  };
  events.push({ id: task.id, status: success ? 'SUCCESS' : 'FAILED', durationMs, copiedOutputs });
  executed += 1;
}

state.updatedAt = new Date().toISOString();
state.sourceHead = sourceHead;
state.workspaceRefreshedLastTick = workspaceRefreshed;
state.cachedEvidenceRestoredLastTick = cachedEvidenceRestored;
writeJsonAtomic(statePath, state);

const configured = tasks.length;
const failures = Object.values(state.tasks).filter((task) => task?.lastStatus === 'FAILED').length;
const missingEnvTasks = Object.values(state.tasks).filter((task) => task?.lastStatus === 'SKIPPED_MISSING_ENV').length;
writeJsonAtomic(statusPath, {
  generatedAt: new Date().toISOString(),
  health: failures ? 'degraded' : 'ok',
  mode: config.mode,
  sourceHead,
  workspace,
  workspaceRefreshed,
  cachedEvidenceRestored,
  configuredTasks: configured,
  executedThisTick: executed,
  missingEnvTasks,
  failures,
  elapsedMs: Date.now() - startedAt,
  events,
  policy: config.policy
});

console.log(`LOTERIAS_LOCAL_RUNTIME health=${failures ? 'degraded' : 'ok'} executed=${executed} configured=${configured} head=${sourceHead}`);
