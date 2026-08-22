import {
  GRAPHQL_ENDPOINT, GRAPHQL_QUERY, graphqlRequestInit, parseGraphqlBody,
  detectResetEvents, evaluateTikiAlicePairedReset, jpkJointCapture,
  PRIORITY_COUNTERS, TIKI_ALICE_FROZEN_GATE,
} from './core-v1.mjs';
import { openDb, addSamples, trimSamples, getAllSamples, addResetEvents, getAllResetEvents, addGap, getAllGaps, clearAll } from './storage.mjs';

const $ = (id) => document.getElementById(id);
const state = {
  db: null,
  polling: false,
  pollTimer: null,
  pollSeconds: 45,
  previousByKey: null,
  previousObservedAt: null,
  wakeLock: null,
  hiddenSince: null,
  corsBlocked: null,
  lastError: null,
};

function log(msg) {
  const el = $('log');
  const line = document.createElement('div');
  line.textContent = `[${new Date().toISOString()}] ${msg}`;
  el.prepend(line);
  while (el.childNodes.length > 200) el.removeChild(el.lastChild);
}

function setStatus(text, cls) {
  const el = $('status');
  el.textContent = text;
  el.className = `status ${cls || ''}`;
}

function renderCounters(currentByKey) {
  const el = $('counters');
  el.innerHTML = '';
  for (const c of PRIORITY_COUNTERS) {
    const key = `${c.network}:${c.id}`;
    const row = (currentByKey || {})[key];
    const div = document.createElement('div');
    div.className = 'counter-row';
    div.textContent = `${key}: ${row ? row.amountEUR.toFixed(2) + ' EUR' : 'not in current response'}`;
    el.appendChild(div);
  }
}

function renderResetEvents(events) {
  const el = $('resets');
  el.innerHTML = '';
  if (!events.length) { el.textContent = 'No reset events captured yet.'; return; }
  for (const e of [...events].reverse().slice(0, 50)) {
    const div = document.createElement('div');
    div.className = 'reset-row';
    div.textContent = `${e.observedAt} ${e.key}: ${e.previousAmountEUR.toFixed(2)} -> ${e.currentAmountEUR.toFixed(2)} EUR (drop ${(e.dropFraction * 100).toFixed(1)}%)`;
    el.appendChild(div);
  }
}

async function pollOnce() {
  const observedAt = new Date().toISOString();
  let body = null, fetchOk = false, fetchErrorName = null;
  try {
    const r = await fetch(GRAPHQL_ENDPOINT, graphqlRequestInit());
    fetchOk = r.ok;
    if (r.ok) body = await r.json();
    if (state.corsBlocked !== false) { state.corsBlocked = false; setStatus('WATCH ACTIVE — KEEP THIS PAGE OPEN', 'ok'); }
  } catch (e) {
    // A real cross-origin CORS rejection surfaces to fetch() as a generic
    // TypeError with no response object at all - this is the definitive,
    // authoritative, in-browser CORS test. If this ever fires, CORS is
    // blocked for real, regardless of what the server-side preflight probe
    // predicted.
    fetchErrorName = e?.name || 'Error';
    state.lastError = `${fetchErrorName}: ${e?.message || e}`;
    if (fetchErrorName === 'TypeError') {
      state.corsBlocked = true;
      setStatus('CORS BLOCKED — direct browser fetch failed. Use the iOS Shortcut fallback.', 'blocked');
      log(`CORS/network failure: ${state.lastError}`);
      stopWatch();
      return;
    }
    log(`Fetch error (not CORS): ${state.lastError}`);
    return;
  }
  if (!fetchOk || !body) { log(`HTTP/response error at ${observedAt}`); return; }

  const { canonicalRows, currentByKey, ambiguousKeys } = parseGraphqlBody(body);
  const sampleRows = canonicalRows.map((r) => ({ observedAt, network: r.network, id: r.id, amountEUR: r.amountEUR }));
  await addSamples(state.db, sampleRows);
  await trimSamples(state.db);

  const events = detectResetEvents(currentByKey, state.previousByKey, observedAt, state.previousObservedAt);
  if (events.length) {
    await addResetEvents(state.db, events);
    for (const e of events) log(`RESET DETECTED: ${e.key} ${e.previousAmountEUR} -> ${e.currentAmountEUR} EUR`);

    const paired = evaluateTikiAlicePairedReset(events);
    if (paired) {
      log('PROSPECTIVE_PAIRED_RESET_CANDIDATE (Tiki/Alice) - exported for external review, no auto-promotion.');
      $('pairedCandidate').textContent = JSON.stringify(paired, null, 2);
      $('pairedCandidate').hidden = false;
    }

    const jpk = jpkJointCapture(currentByKey);
    if (events.some((e) => e.key.startsWith('blueprint:JACKPOTKING'))) {
      log(`JPK reset-adjacent sample captured (tiers present: ${Object.values(jpk.rows).filter(Boolean).length}/3).`);
    }
  }

  state.previousByKey = currentByKey;
  state.previousObservedAt = observedAt;
  if (ambiguousKeys.length) log(`Ambiguous keys this poll (excluded from reset detection): ${ambiguousKeys.join(', ')}`);

  renderCounters(currentByKey);
  const allEvents = await getAllResetEvents(state.db);
  renderResetEvents(allEvents);
  $('lastPoll').textContent = observedAt;
}

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) { log('Wake Lock API not supported on this browser - screen may sleep.'); return; }
  try {
    state.wakeLock = await navigator.wakeLock.request('screen');
    state.wakeLock.addEventListener('release', () => log('Wake lock released.'));
    log('Wake lock acquired.');
  } catch (e) {
    log(`Wake lock request failed: ${e?.message || e}`);
  }
}

function releaseWakeLock() {
  if (state.wakeLock) { state.wakeLock.release().catch(() => {}); state.wakeLock = null; }
}

async function startWatch() {
  if (state.polling) return;
  state.polling = true;
  state.pollSeconds = Math.min(60, Math.max(30, Number($('pollSeconds').value) || 45));
  setStatus('WATCH ACTIVE — KEEP THIS PAGE OPEN', 'ok');
  $('startBtn').disabled = true;
  $('stopBtn').disabled = false;
  await requestWakeLock();
  await pollOnce();
  state.pollTimer = setInterval(pollOnce, state.pollSeconds * 1000);
}

function stopWatch() {
  state.polling = false;
  clearInterval(state.pollTimer);
  state.pollTimer = null;
  releaseWakeLock();
  $('startBtn').disabled = false;
  $('stopBtn').disabled = true;
  if (state.corsBlocked !== true) setStatus('STOPPED', '');
}

async function exportEvidence() {
  const samples = await getAllSamples(state.db);
  const resetEvents = await getAllResetEvents(state.db);
  const gaps = await getAllGaps(state.db);
  const out = {
    version: 'edge-live-watch-mobile-export-v1',
    exportedAt: new Date().toISOString(),
    device: 'IPHONE_SAFARI_PWA',
    pollSeconds: state.pollSeconds,
    tikiAliceFrozenGate: TIKI_ALICE_FROZEN_GATE,
    samples, resetEvents, gaps,
    guards: { noAutoCommit: true, noInterpolationAcrossGaps: true, economicPromotionAllowed: false, realMoneyAllowed: false },
  };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `edge-live-watch-export-${out.exportedAt.replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  log(`Exported ${samples.length} samples, ${resetEvents.length} reset events, ${gaps.length} gaps.`);
}

async function clearEvidence() {
  await clearAll(state.db);
  state.previousByKey = null;
  state.previousObservedAt = null;
  renderCounters(null);
  renderResetEvents([]);
  log('Local evidence cleared.');
}

document.addEventListener('visibilitychange', async () => {
  if (document.hidden) {
    state.hiddenSince = new Date().toISOString();
  } else if (state.hiddenSince) {
    const now = new Date().toISOString();
    const gapSeconds = (Date.parse(now) - Date.parse(state.hiddenSince)) / 1000;
    if (gapSeconds > 5) {
      const gap = { gapStartAt: state.hiddenSince, gapEndAt: now, gapSeconds };
      await addGap(state.db, gap);
      log(`Background gap recorded: ${gapSeconds.toFixed(0)}s (no data interpolated).`);
    }
    state.hiddenSince = null;
    if (state.polling) await requestWakeLock();
  }
});

async function init() {
  state.db = await openDb();
  renderCounters(null);
  renderResetEvents(await getAllResetEvents(state.db));
  $('startBtn').addEventListener('click', startWatch);
  $('stopBtn').addEventListener('click', stopWatch);
  $('exportBtn').addEventListener('click', exportEvidence);
  $('clearBtn').addEventListener('click', clearEvidence);
  $('stopBtn').disabled = true;
  setStatus('STOPPED', '');
  log('EDGE Mobile watcher ready. Press START WATCH to begin.');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((e) => log(`Service worker registration failed: ${e?.message || e}`));
  }
}

init();
