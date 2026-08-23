const BOT_GRAPHQL = 'https://www.botemania.es/es/graphql';
const CONTRACT_URL = 'https://alvarogavilan.github.io/loterias-ai/edge-live/evidence/client-execution-contract-v1.json';
const POLL_MS = 5000;
const MAX_BACKOFF_MS = 60000;
const CONTRACT_REFRESH_MS = 30000;
const MINUTE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const ALLOWED_MONITOR_PREFIXES = ['generic:', 'redTiger:', 'blueprint:'];
const REQUIRED_FLAGS = [
  'identityVerified',
  'thresholdVerified',
  'stakeVerified',
  'strategyVerified',
  'rulesFingerprintVerified',
  'prospectiveValidationPassed',
];

const BOT_QUERY = `query loadJackpots {
  jackpots { id amount }
  redTigerJackpots { id amount }
  blueprintJackpots { id amount }
}`;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      ...extra,
    },
  });
}

function finite(v) {
  return v !== null && v !== undefined && Number.isFinite(Number(v));
}

function positive(v) {
  return finite(v) && Number(v) > 0;
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
  const ambiguous = [];
  for (const [key, values] of grouped) {
    const unique = [...new Set(values.map((n) => Number(n).toFixed(6)))];
    if (unique.length === 1) canonical[key] = Number(values[0]);
    else ambiguous.push(key);
  }
  return { canonical, ambiguous, rowCount: rows.length };
}

function validateContract(c, nowMs) {
  if (!c || typeof c !== 'object') return { ok: false, reason: 'CONTRACT_MISSING' };
  if (c.enabled !== true) return { ok: false, reason: 'CONTRACT_DISABLED' };
  if (c.realMoneyAllowed !== true) return { ok: false, reason: 'REAL_MONEY_NOT_ALLOWED' };
  if (c.scientificGatePassed !== true) return { ok: false, reason: 'SCIENTIFIC_GATE_NOT_PASSED' };
  if (c.operator !== 'botemania-es') return { ok: false, reason: 'UNSUPPORTED_OPERATOR' };
  for (const k of REQUIRED_FLAGS) {
    if (c?.verification?.[k] !== true) return { ok: false, reason: `VERIFY_${k}` };
  }
  if (!c?.game?.name || !c?.game?.url || !/^https:\/\/www\.botemania\.es\//.test(c.game.url)) {
    return { ok: false, reason: 'GAME_INVALID' };
  }
  const conditions = Array.isArray(c.conditions) ? c.conditions : [];
  if (!conditions.length) return { ok: false, reason: 'NO_CONDITIONS' };
  for (const x of conditions) {
    if (typeof x?.monitorKey !== 'string' || !ALLOWED_MONITOR_PREFIXES.some((p) => x.monitorKey.startsWith(p))) {
      return { ok: false, reason: 'MONITOR_KEY_INVALID' };
    }
    if (!['GTE', 'LTE'].includes(x?.comparator) || !positive(x?.thresholdEUR)) {
      return { ok: false, reason: 'CONDITION_INVALID' };
    }
  }
  const stake = Number(c?.order?.stakePerSpinEUR);
  const maxSpins = Number(c?.order?.maxSpins);
  const maxTotal = Number(c?.order?.maxTotalStakeEUR);
  if (!positive(stake) || !Number.isInteger(maxSpins) || maxSpins <= 0 || !positive(maxTotal)) {
    return { ok: false, reason: 'ORDER_INVALID' };
  }
  if (maxTotal + 1e-9 < stake * maxSpins) return { ok: false, reason: 'BUDGET_INCONSISTENT' };
  const from = c?.order?.validFrom ? Date.parse(c.order.validFrom) : null;
  const until = Date.parse(c?.order?.validUntil || '');
  if (!Number.isFinite(until) || nowMs >= until) return { ok: false, reason: 'CONTRACT_EXPIRED' };
  if (from !== null && (!Number.isFinite(from) || nowMs < from)) return { ok: false, reason: 'CONTRACT_NOT_YET_VALID' };
  const maxAge = Number(c?.order?.maxSignalAgeSeconds);
  if (!positive(maxAge) || maxAge > 30) return { ok: false, reason: 'FRESHNESS_LIMIT_INVALID' };
  return { ok: true, reason: 'VALID' };
}

function evaluateContract(c, meters, observedAtMs, nowMs) {
  const validation = validateContract(c, nowMs);
  if (!validation.ok) return { mode: 'RED', reason: validation.reason };
  const ageSeconds = Math.max(0, (nowMs - observedAtMs) / 1000);
  if (ageSeconds > Number(c.order.maxSignalAgeSeconds)) return { mode: 'RED', reason: 'DIRECT_FEED_STALE' };

  const results = [];
  for (const x of c.conditions) {
    const amountEUR = Number(meters[x.monitorKey]);
    if (!Number.isFinite(amountEUR)) return { mode: 'RED', reason: `LIVE_KEY_MISSING:${x.monitorKey}` };
    const thresholdEUR = Number(x.thresholdEUR);
    const pass = x.comparator === 'GTE' ? amountEUR >= thresholdEUR : amountEUR <= thresholdEUR;
    results.push({ monitorKey: x.monitorKey, amountEUR, comparator: x.comparator, thresholdEUR, pass });
  }
  const pass = c.allConditionsRequired === false ? results.some((x) => x.pass) : results.every((x) => x.pass);
  if (!pass) return { mode: 'RED', reason: 'THRESHOLD_NOT_MET', results };

  return {
    mode: 'GREEN',
    reason: 'DIRECT_VERIFIED_CONTRACT_PASSED',
    results,
    game: c.game,
    order: c.order,
    contractVersion: c.version || null,
    contractGeneratedAt: c.generatedAt || null,
  };
}

function alertFingerprint(signal) {
  if (signal?.mode !== 'GREEN') return 'RED';
  const order = signal.order || {};
  return JSON.stringify({
    mode: signal.mode,
    game: signal.game?.id || signal.game?.name || null,
    stake: order.stakePerSpinEUR,
    maxSpins: order.maxSpins,
    maxTotal: order.maxTotalStakeEUR,
    validUntil: order.validUntil,
    results: signal.results,
  });
}

function telegramText(signal) {
  if (signal.mode === 'GREEN') {
    const o = signal.order;
    return [
      '🟢 EDGE · JUGAR AHORA',
      signal.game?.name || 'Juego verificado',
      `Apuesta: ${Number(o.stakePerSpinEUR).toFixed(2)} € / jugada`,
      `Máx. jugadas: ${o.maxSpins}`,
      `Presupuesto máximo: ${Number(o.maxTotalStakeEUR).toFixed(2)} €`,
      `Caduca: ${o.validUntil}`,
      'PARA inmediatamente si EDGE vuelve a rojo.',
      signal.game?.url || '',
    ].filter(Boolean).join('\n');
  }
  return `🔴 EDGE · PARAR\nLa señal ejecutable dejó de ser válida. Motivo: ${signal.reason || 'gate cerrado'}.`;
}

export class EdgeSentinel {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS minute_snapshots (
      minute_epoch INTEGER PRIMARY KEY,
      observed_at TEXT NOT NULL,
      meters_json TEXT NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS hourly_snapshots (
      hour_epoch INTEGER PRIMARY KEY,
      observed_at TEXT NOT NULL,
      meters_json TEXT NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      observed_at_ms INTEGER NOT NULL,
      observed_at TEXT NOT NULL,
      type TEXT NOT NULL,
      meter_key TEXT NOT NULL,
      before_eur REAL,
      after_eur REAL,
      delta_eur REAL,
      metadata_json TEXT
    )`);
  }

  async ensureAlarm() {
    const current = await this.ctx.storage.getAlarm();
    if (current === null || current < Date.now() - 1000) {
      await this.ctx.storage.setAlarm(Date.now() + 250);
    }
  }

  async fetch(request) {
    await this.ensureAlarm();
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' } });
    }
    if (url.pathname === '/ensure' && request.method === 'POST') return json({ ok: true, alarm: await this.ctx.storage.getAlarm() });
    if (url.pathname === '/health' || url.pathname === '/state' || url.pathname === '/') {
      const state = (await this.ctx.storage.get('state')) || {};
      return json({
        ok: true,
        service: 'loterias-edge-sentinel',
        pollEveryMs: POLL_MS,
        current: state,
        alarmAt: await this.ctx.storage.getAlarm(),
        telegramConfigured: Boolean(this.env.TELEGRAM_BOT_TOKEN && this.env.TELEGRAM_CHAT_ID),
      });
    }
    if (url.pathname === '/events') {
      const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 100)));
      const rows = [...this.sql.exec(`SELECT * FROM events ORDER BY observed_at_ms DESC LIMIT ?`, limit)];
      return json({ ok: true, rows });
    }
    if (url.pathname === '/history/minute') {
      const limit = Math.max(1, Math.min(1440, Number(url.searchParams.get('limit') || 240)));
      const rows = [...this.sql.exec(`SELECT * FROM minute_snapshots ORDER BY minute_epoch DESC LIMIT ?`, limit)];
      return json({ ok: true, rows });
    }
    if (url.pathname === '/history/hour') {
      const limit = Math.max(1, Math.min(8760, Number(url.searchParams.get('limit') || 720)));
      const rows = [...this.sql.exec(`SELECT * FROM hourly_snapshots ORDER BY hour_epoch DESC LIMIT ?`, limit)];
      return json({ ok: true, rows });
    }
    return json({ ok: false, error: 'NOT_FOUND' }, 404);
  }

  async fetchMeters() {
    const r = await fetch(BOT_GRAPHQL, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', venture: 'botemania_es' },
      body: JSON.stringify({ operationName: 'loadJackpots', variables: {}, query: BOT_QUERY }),
    });
    if (!r.ok) throw new Error(`BOTEMANIA_HTTP_${r.status}`);
    const body = await r.json();
    const result = canonicalize(body);
    if (!Object.keys(result.canonical).length) throw new Error('NO_CANONICAL_METERS');
    return result;
  }

  async fetchContract(previous, nowMs) {
    if (previous?.contract && nowMs - Number(previous.contractFetchedAtMs || 0) < CONTRACT_REFRESH_MS) {
      return { contract: previous.contract, fetchedAtMs: previous.contractFetchedAtMs };
    }
    try {
      const r = await fetch(`${CONTRACT_URL}?t=${nowMs}`, { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error(`CONTRACT_HTTP_${r.status}`);
      return { contract: await r.json(), fetchedAtMs: nowMs };
    } catch (e) {
      return { contract: previous?.contract || null, fetchedAtMs: previous?.contractFetchedAtMs || 0, error: String(e?.message || e) };
    }
  }

  persistSnapshots(previous, nowMs, observedAt, meters) {
    const metersJson = JSON.stringify(meters);
    const minuteEpoch = Math.floor(nowMs / 60000) * 60000;
    const hourEpoch = Math.floor(nowMs / 3600000) * 3600000;
    if (Number(previous?.lastMinuteEpoch) !== minuteEpoch) {
      this.sql.exec(`INSERT INTO minute_snapshots(minute_epoch, observed_at, meters_json) VALUES (?, ?, ?)`, minuteEpoch, observedAt, metersJson);
    }
    if (Number(previous?.lastHourEpoch) !== hourEpoch) {
      this.sql.exec(`INSERT INTO hourly_snapshots(hour_epoch, observed_at, meters_json) VALUES (?, ?, ?)`, hourEpoch, observedAt, metersJson);
      this.sql.exec(`DELETE FROM minute_snapshots WHERE minute_epoch < ?`, nowMs - MINUTE_RETENTION_MS);
    }
    return { minuteEpoch, hourEpoch };
  }

  persistMeterEvents(previousMeters, meters, observedAt, nowMs) {
    for (const [key, amountEUR] of Object.entries(meters)) {
      const before = Number(previousMeters?.[key]);
      if (!Number.isFinite(before) || Math.abs(amountEUR - before) < 0.000001) continue;
      const delta = amountEUR - before;
      if (delta >= -0.05) continue;
      this.sql.exec(
        `INSERT INTO events(observed_at_ms, observed_at, type, meter_key, before_eur, after_eur, delta_eur, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        nowMs,
        observedAt,
        'DROP_CANDIDATE',
        key,
        before,
        amountEUR,
        delta,
        JSON.stringify({ source: 'BOTEMANIA_PUBLIC_GRAPHQL_DIRECT' }),
      );
    }
  }

  async sendTelegram(text) {
    if (!this.env.TELEGRAM_BOT_TOKEN || !this.env.TELEGRAM_CHAT_ID) return { sent: false, reason: 'TELEGRAM_NOT_CONFIGURED' };
    const r = await fetch(`https://api.telegram.org/bot${this.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: this.env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
    });
    if (!r.ok) return { sent: false, reason: `TELEGRAM_HTTP_${r.status}` };
    const body = await r.json();
    return { sent: body?.ok === true, messageId: body?.result?.message_id || null };
  }

  async alarm() {
    const nowMs = Date.now();
    let nextMs = POLL_MS;
    let previous = (await this.ctx.storage.get('state')) || {};
    try {
      const feed = await this.fetchMeters();
      const observedAt = new Date(nowMs).toISOString();
      this.persistMeterEvents(previous.meters || {}, feed.canonical, observedAt, nowMs);
      const snapshotEpochs = this.persistSnapshots(previous, nowMs, observedAt, feed.canonical);

      const contractResult = await this.fetchContract(previous, nowMs);
      const signal = evaluateContract(contractResult.contract, feed.canonical, nowMs, nowMs);
      const fingerprint = alertFingerprint(signal);
      let alert = previous.lastAlert || null;

      const previousMode = previous?.signal?.mode || 'RED';
      if (signal.mode === 'GREEN' && fingerprint !== previous.lastAlertFingerprint) {
        alert = { at: observedAt, kind: 'GREEN', ...(await this.sendTelegram(telegramText(signal))) };
      } else if (previousMode === 'GREEN' && signal.mode !== 'GREEN') {
        alert = { at: observedAt, kind: 'STOP', ...(await this.sendTelegram(telegramText(signal))) };
      }

      const state = {
        serviceVersion: 'edge-sentinel-v2',
        observedAt,
        observedAtMs: nowMs,
        meters: feed.canonical,
        canonicalCount: Object.keys(feed.canonical).length,
        ambiguousKeys: feed.ambiguous,
        rawRowCount: feed.rowCount,
        signal,
        contract: contractResult.contract,
        contractFetchedAtMs: contractResult.fetchedAtMs,
        contractFetchError: contractResult.error || null,
        lastAlert: alert,
        lastAlertFingerprint: signal.mode === 'GREEN' ? fingerprint : 'RED',
        consecutiveErrors: 0,
        pollingEveryMs: POLL_MS,
        lastMinuteEpoch: snapshotEpochs.minuteEpoch,
        lastHourEpoch: snapshotEpochs.hourEpoch,
      };
      await this.ctx.storage.put('state', state);
    } catch (e) {
      const errors = Number(previous.consecutiveErrors || 0) + 1;
      nextMs = Math.min(MAX_BACKOFF_MS, POLL_MS * Math.pow(2, Math.min(errors, 4)));
      previous = {
        ...previous,
        lastErrorAt: new Date(nowMs).toISOString(),
        lastError: String(e?.message || e),
        consecutiveErrors: errors,
        pollingEveryMs: nextMs,
      };
      await this.ctx.storage.put('state', previous);
    } finally {
      await this.ctx.storage.setAlarm(Date.now() + nextMs);
    }
  }
}

function sentinel(env) {
  return env.EDGE_SENTINEL.get(env.EDGE_SENTINEL.idFromName('global'));
}

export default {
  async fetch(request, env) {
    return sentinel(env).fetch(request);
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(sentinel(env).fetch('https://edge.internal/ensure', { method: 'POST' }));
  },
};
