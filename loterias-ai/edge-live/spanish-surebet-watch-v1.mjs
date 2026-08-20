import fs from 'node:fs';
import path from 'node:path';

const OUT = 'loterias-ai/edge-live/evidence/spanish-surebet-live-v1.json';
const API = 'https://api.apostasseguras.com/request';
const token = process.env.SUREBET_API_TOKEN || '';
const bankroll = Number(process.env.SPANISH_SUREBET_BANKROLL_EUR || 100);
const minRoiPct = Number(process.env.SPANISH_SUREBET_MIN_ROI_PCT || 0.35);
const maxAgeMs = Number(process.env.SPANISH_SUREBET_MAX_AGE_MS || 120000);
const sports = (process.env.SPANISH_SUREBET_SPORTS || 'Football|Basketball|Tennis').split('|').filter(Boolean);
const sources = (process.env.SPANISH_SUREBET_SOURCES || [
  'bet365es','codere','sportium','winamax_es','betfair_es','betfair_sb_es','betsson_es','daznbet_es',
  'retabet_es','bet777_es','1xbet_es','leovegas_es','luckia_es','goldenpark_es','olybet_es','tonybet_es',
  'versus_es','jokerbet_es','ebingo_es','kirolbet_es','paston_es','w88es','zeBet_es'
].join('|')).split('|').filter(Boolean);

const now = Date.now();
const iso = new Date(now).toISOString();
const ensureDir = () => fs.mkdirSync(path.dirname(OUT), { recursive: true });
const write = (obj) => {
  ensureDir();
  fs.writeFileSync(OUT, `${JSON.stringify(obj, null, 2)}\n`);
  console.log(JSON.stringify({ output: OUT, status: obj.status, green: obj.summary?.greenCount ?? 0 }));
};

const base = {
  version: 'spanish-surebet-live-v1',
  generatedAt: iso,
  methodology: {
    sourceClass: 'SUREBET_OFFICIAL_API',
    allProngsMustBeSpanishSources: true,
    rejectDifferentRules: true,
    maxAgeMs,
    minRoiPct,
    stakeSplitFormula: 'stake_i = bankroll * (1/odds_i) / sum_j(1/odds_j)',
    economicPass: 'sum(1/odds_i) < 1 and computed ROI >= minimum',
    executionRule: 'Never place automatically. Recheck every price and market before staking.'
  },
  guards: {
    noAutomaticBetting: true,
    apiTokenRequired: true,
    allSpanishSourcesRequired: true,
    staleRecordRejected: true,
    differentRulesRejected: true,
    malformedOddsRejected: true,
    finalManualRecheckRequired: true
  }
};

if (!token) {
  write({
    ...base,
    status: 'BLOCKED_NO_API_TOKEN',
    source: { endpoint: API, configuredSpanishSources: sources, sports },
    candidates: [],
    summary: { scanned: 0, spanishOnlyCount: 0, greenCount: 0, reason: 'SUREBET_API_TOKEN_MISSING' }
  });
  process.exit(0);
}

const params = new URLSearchParams({
  product: 'surebets',
  source: sources.join('|'),
  sport: sports.join('|'),
  limit: '100',
  group: 'off',
  'hide-different-rules': 'true',
  order: 'created_at_desc',
  endAge: 'PT2M',
  endOf: 'P3D'
});

const response = await fetch(`${API}?${params.toString()}`, {
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
});

if (!response.ok) {
  write({
    ...base,
    status: 'API_ERROR',
    source: { endpoint: API, httpStatus: response.status, configuredSpanishSources: sources, sports },
    candidates: [],
    summary: { scanned: 0, spanishOnlyCount: 0, greenCount: 0, reason: `HTTP_${response.status}` }
  });
  process.exit(0);
}

const json = await response.json();
const records = Array.isArray(json.records) ? json.records
  : Array.isArray(json.surebets) ? json.surebets
  : Array.isArray(json.data) ? json.data
  : [];

const allowed = new Set(sources.map((s) => s.toLowerCase()));
const pick = (obj, keys) => {
  for (const key of keys) if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  return null;
};
const sourceId = (p) => String(
  pick(p, ['source','bookmaker_id','bookie_id','source_id']) ??
  p?.bookmaker?.id ?? p?.bookie?.id ?? p?.bk?.id ?? ''
).toLowerCase();
const sourceName = (p) => String(
  p?.bookmaker?.name ?? p?.bookie?.name ?? p?.bk?.name ?? pick(p, ['bookmaker_name','bookie_name']) ?? sourceId(p)
);
const oddsOf = (p) => Number(pick(p, ['odds','koef','k','price','coefficient']));
const marketOf = (p) => String(pick(p, ['market','outcome','bet','name','condition']) ?? '');
const teamsOf = (p, rec) => p?.teams ?? rec?.teams ?? null;

const evaluated = [];
for (const rec of records) {
  const prongs = Array.isArray(rec.prongs) ? rec.prongs : [];
  if (prongs.length < 2 || prongs.length > 6) continue;
  const created = Number(rec.created ?? rec.created_at ?? 0);
  const ageMs = created > 1e12 ? now - created : created > 0 ? now - created * 1000 : Infinity;
  const rdPresent = Array.isArray(rec.rd) && rec.rd.length > 0;
  const legs = prongs.map((p) => ({
    sourceId: sourceId(p),
    sourceName: sourceName(p),
    odds: oddsOf(p),
    market: marketOf(p),
    teams: teamsOf(p, rec),
    rawId: pick(p, ['id','bet_id'])
  }));
  const allSpanish = legs.every((l) => l.sourceId && allowed.has(l.sourceId));
  const validOdds = legs.every((l) => Number.isFinite(l.odds) && l.odds > 1);
  const impliedSum = validOdds ? legs.reduce((s, l) => s + 1 / l.odds, 0) : null;
  const roiPct = impliedSum && impliedSum > 0 ? (1 / impliedSum - 1) * 100 : null;
  const stakePlan = impliedSum && impliedSum < 1 ? legs.map((l) => {
    const stake = bankroll * ((1 / l.odds) / impliedSum);
    return { ...l, stakeEUR: Number(stake.toFixed(2)), grossReturnEUR: Number((stake * l.odds).toFixed(2)) };
  }) : [];
  const green = Boolean(
    allSpanish && validOdds && !rdPresent && ageMs >= 0 && ageMs <= maxAgeMs &&
    impliedSum < 1 && roiPct >= minRoiPct
  );
  evaluated.push({
    id: rec.id ?? null,
    sortBy: rec.sort_by ?? null,
    tournament: rec.tournament ?? prongs[0]?.tournament ?? null,
    teams: rec.teams ?? prongs[0]?.teams ?? null,
    eventTime: rec.time ? new Date(Number(rec.time)).toISOString() : null,
    createdAt: created ? new Date(created > 1e12 ? created : created * 1000).toISOString() : null,
    ageMs: Number.isFinite(ageMs) ? ageMs : null,
    allSpanish,
    differentRulesFlag: rdPresent,
    impliedProbabilitySum: impliedSum === null ? null : Number(impliedSum.toFixed(8)),
    computedRoiPct: roiPct === null ? null : Number(roiPct.toFixed(4)),
    apiProfitField: rec.profit ?? null,
    apiRoiField: rec.roi ?? null,
    legs,
    stakePlanEUR: stakePlan,
    bankrollEUR: bankroll,
    expectedLockedProfitEUR: green ? Number((bankroll * roiPct / 100).toFixed(2)) : 0,
    phase: green ? 'GREEN_RECHECK_REQUIRED' : 'REJECTED_OR_RESEARCH',
    green,
    blockers: [
      !allSpanish ? 'NON_SPANISH_PRONG' : null,
      !validOdds ? 'MALFORMED_ODDS' : null,
      rdPresent ? 'DIFFERENT_RULES_FLAG' : null,
      !(ageMs >= 0 && ageMs <= maxAgeMs) ? 'STALE_OR_UNKNOWN_AGE' : null,
      !(impliedSum < 1) ? 'NO_MATHEMATICAL_ARBITRAGE' : null,
      !(roiPct >= minRoiPct) ? 'ROI_BELOW_MINIMUM' : null
    ].filter(Boolean)
  });
}

const greenRows = evaluated.filter((r) => r.green).sort((a,b) => b.computedRoiPct - a.computedRoiPct);
write({
  ...base,
  status: greenRows.length ? 'GREEN_CANDIDATE_RECHECK_REQUIRED' : 'NO_EXECUTABLE_SPANISH_SUREBET',
  source: {
    endpoint: API,
    apiUpdatedAt: json.updated_at ?? null,
    configuredSpanishSources: sources,
    sports,
    responseLimit: json.limit ?? null
  },
  candidates: greenRows.slice(0, 20),
  rejectedSample: evaluated.filter((r) => !r.green).slice(0, 20),
  summary: {
    scanned: records.length,
    evaluated: evaluated.length,
    spanishOnlyCount: evaluated.filter((r) => r.allSpanish).length,
    greenCount: greenRows.length,
    bestRoiPct: greenRows[0]?.computedRoiPct ?? null
  }
});
