// EDGE LIVE presentation + fail-closed direct monitor.
// The browser polls the public Botemania jackpot feed while EDGE is running,
// overlays fresh values on every mapped radar card, and persists a compact local
// scientific history. It NEVER invents thresholds or promotes real money unless
// an explicitly enabled, fully verified execution contract passes every gate.

const ART_BY_NAME = new Map([
  ["Fishin' Frenzy: Jackpot King", 'https://assets.ballys.com/m/76ed09cf022ed4d0/original/es-gametiles-fishin-frenzy-jpk-fishin-frenzy-jpk-tile-25-972.webp'],
  ['Ultimate Video Poker — Jotas o Mejor Progresivo', 'https://assets.ballys.com/m/7e75074eb43be1d7/original/es-gametiles-ultimate-video-poker-ultimate-video-poker-tile-25-972.webp'],
  ['Danza de los Diamantes — Diamond Bonanza 25c', 'https://assets.ballys.com/m/6bf05c92590cc68b/original/es-gametiles-danza-de-los-diamantes-danza-de-los-diamantes-tile-25-972.webp'],
  ['Burbujas Saltarinas', 'https://assets.ballys.com/m/6f3c2297e54e8275/original/es-gametiles-bouncy-bubbles-bouncy-bubbles-tile-25-972.webp'],
  ['Tiki Templo', 'https://assets.ballys.com/m/2af47352b4975982/original/es-gametiles-tiki-templo-tiki-templo-tile-25-972.webp'],
]);

const CONTRACT_URL = './evidence/client-execution-contract-v1.json';
const MULTI_PLAN_URL = './evidence/edge-live-multi-execution-plan-v1.json';
const BOT_GRAPHQL = 'https://www.botemania.es/es/graphql';
const BOT_QUERY = `query loadJackpots {
  jackpots { id amount }
  redTigerJackpots { id amount }
  blueprintJackpots { id amount }
}`;
const DIRECT_VISIBLE_POLL_MS = 2000;
const DIRECT_HIDDEN_POLL_MS = 5000;
const DIRECT_FRESH_SECONDS = 10;
const JPK_MBWB_CAPS_EUR = { ROYAL: 4078.97, REGAL: 40789.77 };
const ALLOWED_MONITOR_PREFIXES = ['generic:', 'redTiger:', 'blueprint:'];
const REQUIRED_VERIFICATION_FLAGS = [
  'identityVerified',
  'thresholdVerified',
  'stakeVerified',
  'strategyVerified',
  'rulesFingerprintVerified',
  'prospectiveValidationPassed',
];

const $ = (id) => document.getElementById(id);
const text = (id) => ($(id)?.textContent || '').trim();
const finite = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
const positive = (v) => finite(v) && Number(v) > 0;
const money = (v) => Number(v).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const madridTime = (t) => {
  const d = new Date(t);
  return Number.isFinite(d.getTime())
    ? new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(d)
    : '—';
};
const ageSeconds = (t) => {
  const n = Date.parse(t || '');
  return Number.isFinite(n) ? Math.max(0, Math.floor((Date.now() - n) / 1000)) : null;
};
const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };

const monitor = {
  plan: null,
  lanesByName: new Map(),
  amountByKey: {},
  directAt: null,
  directOk: false,
  canonicalCount: 0,
  ambiguousCount: 0,
  polling: false,
  errorStreak: 0,
  lastSampleByKey: new Map(),
  lastChangeMsByKey: new Map(),
  dbPromise: null,
  storagePersistent: false,
};

const contractState = {
  contract: null,
  validation: { ok: false, reason: 'CONTRACT_NOT_LOADED' },
};

function parseDisplayedEuro(value) {
  const s = String(value || '').replace(/\s/g, '').replace(/€/g, '');
  if (!s || s === '—') return null;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function directFresh() {
  const age = ageSeconds(monitor.directAt);
  return monitor.directOk && age !== null && age <= DIRECT_FRESH_SECONDS;
}

function decorateRadar() {
  for (const card of document.querySelectorAll('#radarList .laneCard')) {
    if (card.dataset.artDecorated === '1') continue;
    const top = card.querySelector('.laneTop');
    const title = top?.querySelector('b')?.textContent?.trim();
    if (!top || !title) continue;
    const art = ART_BY_NAME.get(title);
    const visual = art ? document.createElement('img') : document.createElement('div');
    visual.className = art ? 'laneVisual' : 'laneVisual laneVisualUnknown';
    if (art) {
      visual.src = art;
      visual.alt = title;
      visual.loading = 'lazy';
      visual.referrerPolicy = 'no-referrer';
    } else {
      visual.textContent = '?';
      visual.title = 'Arte no mostrado hasta cerrar la identidad exacta del juego';
    }
    top.prepend(visual);
    card.dataset.artDecorated = '1';
  }
}

function syncJpkCapProgress() {
  const isJpk = text('gameSubtitle') === 'JACKPOT KING';
  let box = $('jpkCapProgress');
  if (!isJpk) {
    if (box) box.remove();
    return;
  }
  const royal = parseDisplayedEuro(text('potValue3'));
  const regal = parseDisplayedEuro(text('potValue2'));
  if (!Number.isFinite(royal) || !Number.isFinite(regal)) return;
  if (!box) {
    box = document.createElement('div');
    box.id = 'jpkCapProgress';
    box.style.cssText = 'position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#ffffff14;border-top:1px solid #ffffff18;color:#dcebe4';
    document.querySelector('#gameCard .pots')?.insertAdjacentElement('afterend', box);
  }
  const cell = (name, value, cap) => {
    const pct = value / cap * 100;
    const remaining = Math.max(0, cap - value);
    return `<div style="padding:10px 8px;background:#061a15e8;text-align:center"><div style="font-size:7px;font-weight:950;color:#91b4a5">${name} · % DEL MBWB</div><div style="font-size:14px;font-weight:1000;margin-top:4px">${pct.toFixed(1)}%</div><div style="font-size:7px;color:#9fb6ab;margin-top:2px">faltan ${money(remaining)} al límite</div></div>`;
  };
  const html = `${cell('ROYAL', royal, JPK_MBWB_CAPS_EUR.ROYAL)}${cell('REGAL', regal, JPK_MBWB_CAPS_EUR.REGAL)}<div style="grid-column:1/-1;padding:6px 8px;background:#06140f;text-align:center;font-size:7px;color:#789083">Proximidad al límite MBWB · NO es todavía un umbral +EV</div>`;
  if (box.innerHTML !== html) box.innerHTML = html;
}

async function refreshPlan() {
  try {
    const r = await fetch(`${MULTI_PLAN_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    const p = await r.json();
    monitor.plan = p;
    const lanes = Array.isArray(p?.lanes) ? p.lanes : [];
    monitor.lanesByName = new Map(lanes.map((lane) => [String(lane?.game?.name || '').trim(), lane]).filter(([name]) => name));
  } catch {
    monitor.plan = null;
    monitor.lanesByName = new Map();
  }
}

function canonicalize(body) {
  const rows = [];
  const add = (network, items) => {
    for (const x of Array.isArray(items) ? items : []) {
      const id = String(x?.id ?? '');
      const amountEUR = Number(x?.amount);
      if (id && Number.isFinite(amountEUR)) rows.push({ key: `${network}:${id}`, amountEUR });
    }
  };
  add('generic', body?.data?.jackpots);
  add('redTiger', body?.data?.redTigerJackpots);
  add('blueprint', body?.data?.blueprintJackpots);
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.key)) grouped.set(row.key, []);
    grouped.get(row.key).push(row.amountEUR);
  }
  const canonical = {};
  let ambiguous = 0;
  for (const [key, values] of grouped) {
    const unique = [...new Set(values.map((n) => Number(n).toFixed(6)))];
    if (unique.length === 1) canonical[key] = Number(values[0]);
    else ambiguous += 1;
  }
  return { canonical, ambiguous };
}

function openHistoryDb() {
  if (monitor.dbPromise) return monitor.dbPromise;
  monitor.dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('INDEXEDDB_UNAVAILABLE'));
    const req = indexedDB.open('edge-live-meter-history-v1', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('minuteSnapshots')) db.createObjectStore('minuteSnapshots', { keyPath: 'minuteEpoch' });
      if (!db.objectStoreNames.contains('events')) {
        const s = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        s.createIndex('observedAtMs', 'observedAtMs');
        s.createIndex('key', 'key');
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('INDEXEDDB_OPEN_FAILED'));
  });
  return monitor.dbPromise;
}

async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) monitor.storagePersistent = await navigator.storage.persist();
    await openHistoryDb();
  } catch {
    monitor.storagePersistent = false;
  }
}

async function persistMinuteSnapshot(amountByKey, observedAt) {
  try {
    const db = await openHistoryDb();
    const observedAtMs = Date.parse(observedAt);
    const minuteEpoch = Math.floor(observedAtMs / 60000) * 60000;
    const tx = db.transaction(['minuteSnapshots', 'meta'], 'readwrite');
    tx.objectStore('minuteSnapshots').put({
      minuteEpoch,
      observedAt,
      observedAtMs,
      meters: amountByKey,
      source: 'BOTEMANIA_PUBLIC_GRAPHQL_DIRECT',
    });
    tx.objectStore('meta').put({ key: 'lastDirectSnapshot', observedAt, observedAtMs, canonicalCount: Object.keys(amountByKey).length });
  } catch {
    // Storage failure must never affect the fail-closed wagering decision.
  }
}

async function persistEvent(event) {
  try {
    const db = await openHistoryDb();
    const tx = db.transaction('events', 'readwrite');
    tx.objectStore('events').add(event);
  } catch {
    // Best-effort scientific archive only.
  }
}

function observeChanges(amountByKey, observedAt) {
  const nowMs = Date.parse(observedAt);
  for (const [key, amountEUR] of Object.entries(amountByKey)) {
    const prev = monitor.lastSampleByKey.get(key);
    if (!prev) {
      monitor.lastChangeMsByKey.set(key, nowMs);
    } else if (Math.abs(amountEUR - prev.amountEUR) >= 0.000001) {
      monitor.lastChangeMsByKey.set(key, nowMs);
      const dropEUR = prev.amountEUR - amountEUR;
      if (dropEUR > 0.01) {
        persistEvent({
          type: 'DROP_CANDIDATE',
          key,
          observedAt,
          observedAtMs: nowMs,
          beforeEUR: prev.amountEUR,
          afterEUR: amountEUR,
          dropEUR,
          previousObservedAt: prev.observedAt,
          source: 'BOTEMANIA_PUBLIC_GRAPHQL_DIRECT',
        });
      }
    }
    monitor.lastSampleByKey.set(key, { amountEUR, observedAt });
  }
}

async function probeMeters() {
  if (monitor.polling) return;
  monitor.polling = true;
  try {
    const r = await fetch(BOT_GRAPHQL, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', venture: 'botemania_es' },
      body: JSON.stringify({ operationName: 'loadJackpots', variables: {}, query: BOT_QUERY }),
      cache: 'no-store',
    });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    const body = await r.json();
    const { canonical, ambiguous } = canonicalize(body);
    if (!Object.keys(canonical).length) throw new Error('NO_CANONICAL_METERS');
    const observedAt = new Date().toISOString();
    observeChanges(canonical, observedAt);
    monitor.amountByKey = canonical;
    monitor.directAt = observedAt;
    monitor.directOk = true;
    monitor.canonicalCount = Object.keys(canonical).length;
    monitor.ambiguousCount = ambiguous;
    monitor.errorStreak = 0;
    persistMinuteSnapshot(canonical, observedAt);
  } catch {
    monitor.errorStreak += 1;
    if (ageSeconds(monitor.directAt) > DIRECT_FRESH_SECONDS) monitor.directOk = false;
  } finally {
    monitor.polling = false;
  }
}

function scheduleProbeLoop() {
  const run = async () => {
    await probeMeters();
    const base = document.hidden ? DIRECT_HIDDEN_POLL_MS : DIRECT_VISIBLE_POLL_MS;
    const backoff = monitor.errorStreak ? Math.min(30000, base * Math.pow(2, Math.min(4, monitor.errorStreak))) : base;
    setTimeout(run, backoff);
  };
  run();
}

function findGridValue(card, label) {
  const cell = [...card.querySelectorAll('.laneGrid > div')].find((d) => d.querySelector('small')?.textContent?.trim() === label);
  return cell?.querySelector('b') || null;
}

function movementForKey(key) {
  const changed = monitor.lastChangeMsByKey.get(key);
  if (!Number.isFinite(changed)) return { label: 'N/D', stasis: null };
  const stasis = Math.max(0, Math.floor((Date.now() - changed) / 1000));
  return { label: stasis <= 10 ? 'SÍ' : 'NO', stasis };
}

function directKeyForLane(lane) {
  const k = lane?.monitor?.key;
  return typeof k === 'string' ? k : null;
}

function ensureDirectBadge(card, label) {
  let badge = card.querySelector('.edgeDirectBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'edgeDirectBadge';
    badge.style.cssText = 'display:inline-block;margin-top:7px;padding:4px 7px;border-radius:999px;border:1px solid #29df8655;background:#29df8612;color:#55e99b;font-size:7px;font-weight:1000;letter-spacing:.04em';
    card.querySelector('.laneMeta')?.insertAdjacentElement('afterend', badge);
  }
  setText(badge, label);
}

function overlayDirectRadar() {
  if (!directFresh()) return;
  for (const card of document.querySelectorAll('#radarList .laneCard')) {
    const title = card.querySelector('.laneTop b')?.textContent?.trim();
    if (!title) continue;
    const lane = monitor.lanesByName.get(title);
    if (!lane) continue;
    const key = directKeyForLane(lane);
    if (!key) {
      if (title === "Fishin' Frenzy: Jackpot King" && finite(monitor.amountByKey['blueprint:JACKPOTKING_ROYAL'])) {
        setText(findGridValue(card, 'ÚLTIMA OBS.'), madridTime(monitor.directAt));
        setText(findGridValue(card, 'EDAD DATO'), `${ageSeconds(monitor.directAt)}s`);
        ensureDirectBadge(card, `DIRECTO · red JPK · ${DIRECT_VISIBLE_POLL_MS / 1000}s`);
      }
      continue;
    }
    const amount = monitor.amountByKey[key];
    if (!Number.isFinite(amount)) continue;
    const mv = movementForKey(key);
    setText(findGridValue(card, 'CONTADOR'), money(amount));
    setText(findGridValue(card, 'ÚLTIMA OBS.'), madridTime(monitor.directAt));
    setText(findGridValue(card, 'EDAD DATO'), `${ageSeconds(monitor.directAt)}s`);
    setText(findGridValue(card, 'MOVIMIENTO'), mv.label);
    if (mv.stasis !== null) setText(findGridValue(card, 'ESTASIS'), `${mv.stasis}s`);
    ensureDirectBadge(card, `DIRECTO · ${key} · ${DIRECT_VISIBLE_POLL_MS / 1000}s`);
  }
}

function overlayTopDirectStatus() {
  if (!directFresh()) return;
  const gameTitle = text('gameTitle');
  const lane = monitor.lanesByName.get(gameTitle);
  const laneKey = directKeyForLane(lane);
  const jpk = gameTitle === "Fishin' Frenzy: Jackpot King" && Number.isFinite(monitor.amountByKey['blueprint:JACKPOTKING_ROYAL']);
  if (!jpk && (!laneKey || !Number.isFinite(monitor.amountByKey[laneKey]))) return;
  const age = ageSeconds(monitor.directAt);
  setText($('observed'), madridTime(monitor.directAt));
  setText($('freshness'), `${age}s`);
  if ($('freshness')) $('freshness').className = age <= DIRECT_FRESH_SECONDS ? 'ok' : 'bad';
  const archive = monitor.storagePersistent ? 'ARCHIVO LOCAL PERSISTENTE' : 'ARCHIVO LOCAL';
  setText($('channel'), `DIRECTO · ${monitor.canonicalCount} IDs válidos${monitor.ambiguousCount ? ` · ${monitor.ambiguousCount} ambiguos` : ''} · ~${DIRECT_VISIBLE_POLL_MS / 1000}s · ${archive}`);
}

function validateContract(c) {
  if (!c || typeof c !== 'object') return { ok: false, reason: 'CONTRACT_MISSING' };
  if (c.enabled !== true) return { ok: false, reason: 'CONTRACT_DISABLED' };
  if (c.realMoneyAllowed !== true) return { ok: false, reason: 'REAL_MONEY_NOT_ALLOWED' };
  if (c.scientificGatePassed !== true) return { ok: false, reason: 'SCIENTIFIC_GATE_NOT_PASSED' };
  if (c.operator !== 'botemania-es') return { ok: false, reason: 'UNSUPPORTED_OPERATOR' };
  for (const k of REQUIRED_VERIFICATION_FLAGS) {
    if (c?.verification?.[k] !== true) return { ok: false, reason: `VERIFY_${k}` };
  }
  if (typeof c?.game?.id !== 'string' || !c.game.id.trim()) return { ok: false, reason: 'GAME_ID_MISSING' };
  if (typeof c?.game?.name !== 'string' || !c.game.name.trim()) return { ok: false, reason: 'GAME_NAME_MISSING' };
  if (typeof c?.game?.url !== 'string' || !/^https:\/\/www\.botemania\.es\//.test(c.game.url)) return { ok: false, reason: 'GAME_URL_INVALID' };
  const conditions = Array.isArray(c.conditions) ? c.conditions : [];
  if (!conditions.length) return { ok: false, reason: 'NO_THRESHOLD_CONDITIONS' };
  for (const x of conditions) {
    if (typeof x?.monitorKey !== 'string' || !ALLOWED_MONITOR_PREFIXES.some((p) => x.monitorKey.startsWith(p))) return { ok: false, reason: 'MONITOR_KEY_INVALID' };
    if (!['GTE', 'LTE'].includes(x?.comparator)) return { ok: false, reason: 'COMPARATOR_INVALID' };
    if (!positive(x?.thresholdEUR)) return { ok: false, reason: 'THRESHOLD_INVALID' };
  }
  const stake = Number(c?.order?.stakePerSpinEUR);
  const maxSpins = Number(c?.order?.maxSpins);
  const maxTotal = Number(c?.order?.maxTotalStakeEUR);
  if (!positive(stake)) return { ok: false, reason: 'STAKE_INVALID' };
  if (!Number.isInteger(maxSpins) || maxSpins <= 0) return { ok: false, reason: 'MAX_SPINS_INVALID' };
  if (!positive(maxTotal) || maxTotal + 1e-9 < stake * maxSpins) return { ok: false, reason: 'BUDGET_INCONSISTENT' };
  const from = c?.order?.validFrom ? Date.parse(c.order.validFrom) : null;
  const until = Date.parse(c?.order?.validUntil || '');
  if (!Number.isFinite(until) || Date.now() >= until) return { ok: false, reason: 'CONTRACT_EXPIRED' };
  if (from !== null && (!Number.isFinite(from) || Date.now() < from)) return { ok: false, reason: 'CONTRACT_NOT_YET_VALID' };
  if (!positive(c?.order?.maxSignalAgeSeconds) || Number(c.order.maxSignalAgeSeconds) > 30) return { ok: false, reason: 'FRESHNESS_LIMIT_INVALID' };
  return { ok: true, reason: 'VALID' };
}

async function refreshContract() {
  try {
    const r = await fetch(`${CONTRACT_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    contractState.contract = await r.json();
    contractState.validation = validateContract(contractState.contract);
  } catch {
    contractState.contract = null;
    contractState.validation = { ok: false, reason: 'CONTRACT_FETCH_FAILED' };
  }
}

function evaluateAutonomousContract() {
  const c = contractState.contract;
  const v = validateContract(c);
  contractState.validation = v;
  if (!v.ok || !directFresh()) return { green: false, reason: v.reason };
  const age = ageSeconds(monitor.directAt);
  if (age === null || age > Number(c.order.maxSignalAgeSeconds)) return { green: false, reason: 'DIRECT_FEED_STALE' };
  const results = [];
  for (const x of c.conditions) {
    const amount = monitor.amountByKey[x.monitorKey];
    if (!Number.isFinite(amount)) return { green: false, reason: `LIVE_KEY_MISSING:${x.monitorKey}` };
    const threshold = Number(x.thresholdEUR);
    const pass = x.comparator === 'GTE' ? amount >= threshold : amount <= threshold;
    results.push({ monitorKey: x.monitorKey, amountEUR: amount, thresholdEUR: threshold, comparator: x.comparator, pass });
  }
  const pass = c.allConditionsRequired === false ? results.some((x) => x.pass) : results.every((x) => x.pass);
  return { green: pass, reason: pass ? 'DIRECT_VERIFIED_CONTRACT_PASSED' : 'THRESHOLD_NOT_MET', results, contract: c };
}

function syncInstantSignal() {
  const box = $('instantSignal');
  if (!box) return;
  const planDecision = text('decision');
  const autonomous = evaluateAutonomousContract();
  const c = autonomous.contract;
  let mode = 'red';
  let game = text('gameTitle') || 'EDGE LIVE';
  let stake = text('stakePerSpin');
  let spins = text('maxSpins');
  let expiry = text('expiry');
  let gameUrl = $('gameCard')?.href || '#';
  let source = 'PLAN';
  let budget = text('maxTotal');

  if (autonomous.green) {
    mode = 'green';
    source = 'CONTRATO DIRECTO';
    game = c.game.name;
    stake = money(c.order.stakePerSpinEUR);
    spins = String(c.order.maxSpins);
    budget = money(c.order.maxTotalStakeEUR);
    expiry = madridTime(c.order.validUntil);
    gameUrl = c.game.url;
  } else if (planDecision === 'JUGAR AHORA') {
    mode = 'green';
  } else if (planDecision === 'PREPÁRATE') {
    mode = 'yellow';
  }

  const wantedClass = `instantSignal ${mode}`;
  if (box.className !== wantedClass) box.className = wantedClass;
  const label = $('instantDecision');
  const detail = $('instantDetail');
  const go = $('instantGo');
  if (mode === 'green') {
    setText(label, '🟢 JUGAR AHORA');
    setText(detail, `${source} · ${game} · ${stake} · máx. ${spins} jugadas · tope ${budget} · caduca ${expiry}`);
    setText(go, 'ABRIR JUEGO →');
    if (go && go.href !== gameUrl) go.href = gameUrl;
    if (go) go.hidden = false;
  } else if (mode === 'yellow') {
    setText(label, '🟡 PREPÁRATE · NO APUESTES');
    setText(detail, `${game} · abre el juego y espera VERDE`);
    setText(go, 'ABRIR SIN APOSTAR →');
    if (go && go.href !== gameUrl) go.href = gameUrl;
    if (go) go.hidden = false;
  } else {
    setText(label, '🔴 SIN SEÑAL · 0 €');
    setText(detail, directFresh()
      ? `Feed directo activo (~${DIRECT_VISIBLE_POLL_MS / 1000}s). No hay ninguna apuesta autorizada ahora.`
      : 'No hay ninguna apuesta autorizada ahora. Esperando feed directo fresco.');
    if (go) go.hidden = true;
  }
}

function syncUi() {
  decorateRadar();
  overlayDirectRadar();
  overlayTopDirectStatus();
  syncJpkCapProgress();
  syncInstantSignal();
}

requestPersistentStorage();
refreshPlan();
refreshContract();
scheduleProbeLoop();
syncUi();
setInterval(syncUi, 500);
setInterval(refreshPlan, 10000);
setInterval(refreshContract, 5000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) probeMeters(); });
window.addEventListener('online', () => probeMeters());
