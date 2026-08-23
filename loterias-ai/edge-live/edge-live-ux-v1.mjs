// EDGE LIVE presentation + fail-closed client execution UX.
//
// The top banner becomes GREEN only by mirroring an already-authorized
// scientific plan or by a future fully verified client execution contract.
// The shipped contract is disabled and cannot authorize wagering.

const ART_BY_NAME = new Map([
  ["Fishin' Frenzy: Jackpot King", 'https://assets.ballys.com/m/76ed09cf022ed4d0/original/es-gametiles-fishin-frenzy-jpk-fishin-frenzy-jpk-tile-25-972.webp'],
  ['Ultimate Video Poker — Jotas o Mejor Progresivo', 'https://assets.ballys.com/m/7e75074eb43be1d7/original/es-gametiles-ultimate-video-poker-ultimate-video-poker-tile-25-972.webp'],
  ['Danza de los Diamantes — Diamond Bonanza 25c', 'https://assets.ballys.com/m/6bf05c92590cc68b/original/es-gametiles-danza-de-los-diamantes-danza-de-los-diamantes-tile-25-972.webp'],
  ['Burbujas Saltarinas', 'https://assets.ballys.com/m/6f3c2297e54e8275/original/es-gametiles-bouncy-bubbles-bouncy-bubbles-tile-25-972.webp'],
  ['Tiki Templo', 'https://assets.ballys.com/m/2af47352b4975982/original/es-gametiles-tiki-templo-tiki-templo-tile-25-972.webp'],
]);

const CONTRACT_URL = './evidence/client-execution-contract-v1.json';
const BOT_GRAPHQL = 'https://www.botemania.es/es/graphql';
const BOT_QUERY = `query loadJackpots {
  jackpots { id amount }
  redTigerJackpots { id amount }
  blueprintJackpots { id amount }
}`;
// Exact Spain MBWB caps recovered from the Botemania in-game operator UI.
// These are maximum-drop reference values, NOT +EV entry thresholds.
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
const money = (v) => Number(v).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const contractState = {
  contract: null,
  validation: { ok: false, reason: 'CONTRACT_NOT_LOADED' },
  liveByKey: {},
  liveAt: null,
  liveOk: false,
  liveError: null,
  probeRunning: false,
};

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

function parseDisplayedEuro(value) {
  const s = String(value || '').replace(/\s/g, '').replace(/€/g, '');
  if (!s || s === '—') return null;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
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

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
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
    const c = await r.json();
    contractState.contract = c;
    contractState.validation = validateContract(c);
    if (!contractState.validation.ok) {
      contractState.liveByKey = {};
      contractState.liveAt = null;
      contractState.liveOk = false;
      contractState.liveError = null;
    }
  } catch (e) {
    contractState.contract = null;
    contractState.validation = { ok: false, reason: 'CONTRACT_FETCH_FAILED' };
    contractState.liveByKey = {};
    contractState.liveAt = null;
    contractState.liveOk = false;
    contractState.liveError = String(e?.message || e);
  }
}

async function probeContractFeed() {
  if (!contractState.validation.ok || contractState.probeRunning) return;
  contractState.probeRunning = true;
  try {
    const r = await fetch(BOT_GRAPHQL, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', venture: 'botemania_es' },
      body: JSON.stringify({ operationName: 'loadJackpots', variables: {}, query: BOT_QUERY }),
      cache: 'no-store',
    });
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    const body = await r.json();
    const rows = [];
    const add = (network, items) => {
      for (const x of Array.isArray(items) ? items : []) {
        const id = String(x?.id ?? '');
        const amount = Number(x?.amount);
        if (id && Number.isFinite(amount)) rows.push({ key: `${network}:${id}`, amountEUR: amount });
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
    for (const [key, values] of grouped) {
      const unique = [...new Set(values.map((n) => Number(n).toFixed(6)))];
      if (unique.length === 1) canonical[key] = Number(values[0]);
    }
    contractState.liveByKey = canonical;
    contractState.liveAt = new Date().toISOString();
    contractState.liveOk = Object.keys(canonical).length > 0;
    contractState.liveError = null;
  } catch (e) {
    contractState.liveByKey = {};
    contractState.liveAt = null;
    contractState.liveOk = false;
    contractState.liveError = String(e?.message || e);
  } finally {
    contractState.probeRunning = false;
  }
}

function evaluateAutonomousContract() {
  const c = contractState.contract;
  const v = validateContract(c);
  contractState.validation = v;
  if (!v.ok || !contractState.liveOk || !contractState.liveAt) return { green: false, reason: v.reason };
  const age = Math.max(0, (Date.now() - Date.parse(contractState.liveAt)) / 1000);
  if (!Number.isFinite(age) || age > Number(c.order.maxSignalAgeSeconds)) return { green: false, reason: 'DIRECT_FEED_STALE' };
  const conditions = c.conditions;
  const results = [];
  for (const x of conditions) {
    const amount = contractState.liveByKey[x.monitorKey];
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
    expiry = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(c.order.validUntil));
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
    if (go.href !== gameUrl) go.href = gameUrl;
    go.hidden = false;
  } else if (mode === 'yellow') {
    setText(label, '🟡 PREPÁRATE · NO APUESTES');
    setText(detail, `${game} · abre el juego y espera VERDE`);
    setText(go, 'ABRIR SIN APOSTAR →');
    if (go.href !== gameUrl) go.href = gameUrl;
    go.hidden = false;
  } else {
    setText(label, '🔴 SIN SEÑAL · 0 €');
    setText(detail, 'No hay ninguna apuesta autorizada ahora. EDGE continúa vigilando.');
    go.hidden = true;
  }
}

function syncUi() {
  decorateRadar();
  syncJpkCapProgress();
  syncInstantSignal();
}

syncUi();
refreshContract();
// Deliberately use a simple timer instead of a MutationObserver: the scientific
// renderer refreshes frequently, and this avoids any observer/self-render loop.
setInterval(syncUi, 1000);
setInterval(refreshContract, 5000);
setInterval(probeContractFeed, 2000);
