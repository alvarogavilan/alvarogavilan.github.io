import {
  GRAPHQL_ENDPOINT, graphqlBrowserRequestInit, parseGraphqlBody,
  processPoll, jpkJointCapture, resolveObservedAt, createPollScheduler,
  PRIORITY_COUNTERS, TIKI_ALICE_FROZEN_GATE,
} from './core-v1.mjs';

// Well under the 30-60s poll cadence, so a hung request never stacks up
// against the next scheduled cycle - createPollScheduler already prevents
// overlap regardless, but a bounded per-request timeout keeps a single
// stuck request from silently pinning the watcher for the full session.
const FETCH_TIMEOUT_MS = 15000;
import {
  openDb, addSamples, trimSamples, getAllSamples,
  addResetEvents, getAllResetEvents,
  addContaminatedEvents, getAllContaminatedEvents,
  addGap, getAllGaps, clearAll,
} from './storage.mjs';

const $ = (id) => document.getElementById(id);
const state = {
  db: null,
  polling: false,
  pollSeconds: 45,
  previousState: null, // { byKey, observedAt } | null - fed straight into processPoll()
  pendingBackgroundGapSeconds: 0, // accumulated since the last successful poll, consumed and reset by each pollOnce()
  wakeLock: null,
  hiddenSince: null,
  // null = not yet determined; false = a fetch has succeeded; true = a real
  // in-browser fetch failure occurred (CORS, network, DNS, offline - a bare
  // fetch() TypeError cannot distinguish which, so this is reported as
  // CORS_OR_NETWORK_BLOCKED, never asserted to specifically be CORS).
  fetchBlocked: null,
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
  if (!events.length) { el.textContent = 'No clean reset events captured yet.'; return; }
  for (const e of [...events].reverse().slice(0, 50)) {
    const div = document.createElement('div');
    div.className = 'reset-row';
    div.textContent = `${e.observedAt} ${e.key}: ${e.previousAmountEUR.toFixed(2)} -> ${e.currentAmountEUR.toFixed(2)} EUR (drop ${(e.dropFraction * 100).toFixed(1)}%)`;
    el.appendChild(div);
  }
}

function renderContaminatedEvents(events) {
  const el = $('contaminated');
  if (!events.length) { el.textContent = 'None.'; return; }
  el.innerHTML = '';
  for (const e of [...events].reverse().slice(0, 20)) {
    const div = document.createElement('div');
    div.className = 'reset-row contaminated-row';
    div.textContent = `${e.observedAt} ${e.key}: ${e.previousAmountEUR.toFixed(2)} -> ${e.currentAmountEUR.toFixed(2)} EUR — gap ${e.coverageGapSeconds.toFixed(0)}s, NOT eligible for clean reset / pairing / hazard`;
    el.appendChild(div);
  }
}

async function pollOnce() {
  // Scientific observation time = when the response was actually received
  // and parsed, NOT when the request was sent - a slow request must never
  // be attributed to the earlier moment (see resolveObservedAt()).
  const requestStartedAt = new Date().toISOString();
  let body = null, fetchOk = false;
  try {
    const r = await fetch(GRAPHQL_ENDPOINT, { ...graphqlBrowserRequestInit(), signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    fetchOk = r.ok;
    if (r.ok) body = await r.json();
    if (state.fetchBlocked !== false) { state.fetchBlocked = false; setStatus('WATCH ACTIVE — KEEP THIS PAGE OPEN', 'ok'); }
  } catch (e) {
    const errorName = e?.name || 'Error';
    state.lastError = `${errorName}: ${e?.message || e}`;
    if (errorName === 'TimeoutError' || errorName === 'AbortError') {
      // A single slow/hung request - not a CORS or persistent network
      // failure. Produces no sample and no reset event; previousState is
      // left untouched, so the wall-clock gap this creates is picked up
      // automatically by evaluateCoverageGap() on the NEXT successful poll
      // (which will correctly see it as a missed expected poll if enough
      // time elapsed) - no interpolation, no guessing.
      await addGap(state.db, { gapStartAt: requestStartedAt, gapEndAt: new Date().toISOString(), gapSeconds: FETCH_TIMEOUT_MS / 1000, reason: 'POLL_TIMEOUT' });
      log(`Poll request timed out after ${FETCH_TIMEOUT_MS / 1000}s - no sample, no reset, coverage gap recorded.`);
      return;
    }
    // A cross-origin CORS rejection surfaces to fetch() as a generic
    // TypeError with no response object - but so does being offline, a DNS
    // failure, a TLS error, or a browser network policy block. A bare
    // TypeError alone cannot distinguish CORS from those, so this is
    // reported honestly as CORS_OR_NETWORK_BLOCKED, never asserted to
    // specifically be CORS.
    state.fetchBlocked = true;
    setStatus('DIRECT_BROWSER_FETCH_FAILED — USE_IOS_SHORTCUT_FALLBACK', 'blocked');
    log(`Direct browser fetch failed (CORS_OR_NETWORK_BLOCKED): ${state.lastError}`);
    stopWatch();
    return;
  }
  const observedAt = resolveObservedAt({ requestStartedAt, responseReceivedAt: new Date().toISOString() });
  if (!fetchOk || !body) { log(`HTTP/response error at ${observedAt}`); return; }

  const { canonicalRows, currentByKey, ambiguousKeys } = parseGraphqlBody(body);
  const sampleRows = canonicalRows.map((r) => ({ observedAt, requestStartedAt, network: r.network, id: r.id, amountEUR: r.amountEUR }));
  await addSamples(state.db, sampleRows);
  await trimSamples(state.db);

  const result = processPoll({
    currentByKey,
    previousState: state.previousState,
    observedAt,
    backgroundGapSeconds: state.pendingBackgroundGapSeconds,
    pollSeconds: state.pollSeconds,
  });
  state.pendingBackgroundGapSeconds = 0;

  if (!result.coverage.continuousCoverage && state.previousState) {
    const reason = result.coverage.missedExpectedPoll ? 'missed expected poll' : 'background gap';
    log(`Coverage gap since last poll (${reason}): ${result.coverage.coverageGapSeconds.toFixed(0)}s — reset detection skipped for this pair, rebaselining.`);
  }

  if (result.resetEvents.length) {
    await addResetEvents(state.db, result.resetEvents);
    for (const e of result.resetEvents) log(`RESET DETECTED (clean): ${e.key} ${e.previousAmountEUR} -> ${e.currentAmountEUR} EUR`);

    if (result.pairedCandidate) {
      log('PROSPECTIVE_PAIRED_RESET_CANDIDATE (Tiki/Alice) - exported for external review, no auto-promotion.');
      $('pairedCandidate').textContent = JSON.stringify(result.pairedCandidate, null, 2);
      $('pairedCandidate').hidden = false;
    }

    const jpk = jpkJointCapture(currentByKey);
    if (result.resetEvents.some((e) => e.key.startsWith('blueprint:JACKPOTKING'))) {
      log(`JPK clean reset-adjacent sample captured (tiers present: ${Object.values(jpk.rows).filter(Boolean).length}/3).`);
    }
  }

  if (result.contaminatedEvents.length) {
    await addContaminatedEvents(state.db, result.contaminatedEvents);
    for (const e of result.contaminatedEvents) log(`RESET_ACROSS_COVERAGE_GAP (ineligible, audit only): ${e.key} ${e.previousAmountEUR} -> ${e.currentAmountEUR} EUR`);
  }

  state.previousState = result.newState;
  if (ambiguousKeys.length) log(`Ambiguous keys this poll (excluded from reset detection): ${ambiguousKeys.join(', ')}`);

  renderCounters(currentByKey);
  renderResetEvents(await getAllResetEvents(state.db));
  renderContaminatedEvents(await getAllContaminatedEvents(state.db));
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

// A fresh scheduler is created per watch session (pollSeconds is fixed for
// the duration of a run - the input isn't live-editable while watching).
// Scheduling the next cycle only after pollOnce() fully settles makes
// overlapping/out-of-order polls structurally impossible - see
// createPollScheduler()'s own docstring in core-v1.mjs.
let scheduler = null;

async function startWatch() {
  if (state.polling) return;
  state.polling = true;
  state.pollSeconds = Math.min(60, Math.max(30, Number($('pollSeconds').value) || 45));
  setStatus('WATCH ACTIVE — KEEP THIS PAGE OPEN', 'ok');
  $('startBtn').disabled = true;
  $('stopBtn').disabled = false;
  await requestWakeLock();
  scheduler = createPollScheduler({ runPoll: pollOnce, delayMs: state.pollSeconds * 1000 });
  scheduler.start();
}

function stopWatch() {
  state.polling = false;
  if (scheduler) { scheduler.stop(); scheduler = null; }
  releaseWakeLock();
  $('startBtn').disabled = false;
  $('stopBtn').disabled = true;
  if (state.fetchBlocked !== true) setStatus('STOPPED', '');
}

async function exportEvidence() {
  const samples = await getAllSamples(state.db);
  const resetEvents = await getAllResetEvents(state.db);
  const contaminatedResetEvents = await getAllContaminatedEvents(state.db);
  const gaps = await getAllGaps(state.db);
  const out = {
    version: 'edge-live-watch-mobile-export-v1',
    exportedAt: new Date().toISOString(),
    device: 'IPHONE_SAFARI_PWA',
    pollSeconds: state.pollSeconds,
    tikiAliceFrozenGate: TIKI_ALICE_FROZEN_GATE,
    samples, resetEvents, contaminatedResetEvents, gaps,
    guards: {
      noAutoCommit: true,
      noInterpolationAcrossGaps: true,
      contaminatedEventsExcludedFromResetEvents: true,
      economicPromotionAllowed: false,
      realMoneyAllowed: false,
    },
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
  log(`Exported ${samples.length} samples, ${resetEvents.length} clean reset events, ${contaminatedResetEvents.length} contaminated events, ${gaps.length} gaps.`);
}

async function clearEvidence() {
  await clearAll(state.db);
  state.previousState = null;
  state.pendingBackgroundGapSeconds = 0;
  renderCounters(null);
  renderResetEvents([]);
  renderContaminatedEvents([]);
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
      // Accumulated (not overwritten) so multiple short backgroundings
      // between two polls are never silently dropped.
      state.pendingBackgroundGapSeconds += gapSeconds;
      log(`Background gap recorded: ${gapSeconds.toFixed(0)}s (no data interpolated; next poll's reset detection will be skipped and rebaselined).`);
    }
    state.hiddenSince = null;
    if (state.polling) await requestWakeLock();
  }
});

async function init() {
  state.db = await openDb();
  renderCounters(null);
  renderResetEvents(await getAllResetEvents(state.db));
  renderContaminatedEvents(await getAllContaminatedEvents(state.db));
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
