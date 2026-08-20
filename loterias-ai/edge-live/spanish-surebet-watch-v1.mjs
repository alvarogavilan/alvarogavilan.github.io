import fs from 'node:fs';
import path from 'node:path';

const OUT = 'loterias-ai/edge-live/evidence/spanish-surebet-live-v1.json';
const API = 'https://api.apostasseguras.com/request';
const PUBLIC_PAGE = 'https://en.surebet.com/by/country/spain/surebets';
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
  version: 'spanish-surebet-live-v1.1-free-fallback',
  generatedAt: iso,
  methodology: {
    preferredSourceClass: 'SUREBET_OFFICIAL_API_IF_FREE_TOKEN_EXISTS',
    freeFallbackSourceClass: 'PUBLIC_SPAIN_SUREBET_PAGE_RESEARCH_ONLY',
    allProngsMustBeSpanishSources: true,
    rejectDifferentRules: true,
    maxAgeMs,
    minRoiPct,
    stakeSplitFormula: 'stake_i = bankroll * (1/odds_i) / sum_j(1/odds_j)',
    economicPass: 'sum(1/odds_i) < 1 and computed ROI >= minimum',
    executionRule: 'Never place automatically. Recheck every price and market directly at each Spanish bookmaker before staking.'
  },
  guards: {
    noAutomaticBetting: true,
    paidApiNeverRequired: true,
    publicPageNeverPromotesDirectlyToGreen: true,
    allSpanishSourcesRequired: true,
    staleRecordRejected: true,
    differentRulesRejected: true,
    malformedOddsRejected: true,
    finalManualRecheckRequired: true
  }
};

const decodeHtml = (s) => s
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#39;/gi, "'")
  .replace(/&quot;/gi, '"');

const publicFallback = async () => {
  try {
    const response = await fetch(PUBLIC_PAGE, {
      headers: { 'User-Agent': 'Mozilla/5.0 EDGE research monitor', Accept: 'text/html,*/*' }
    });
    if (!response.ok) {
      write({
        ...base,
        status: 'FREE_PUBLIC_SOURCE_ERROR',
        source: { endpoint: PUBLIC_PAGE, httpStatus: response.status, paidApiUsed: false },
        candidates: [],
        publicResearchCandidates: [],
        summary: { scanned: 0, spanishOnlyCount: 0, greenCount: 0, reason: `PUBLIC_HTTP_${response.status}` }
      });
      return;
    }

    const html = await response.text();
    const text = decodeHtml(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/tr>|<\/div>|<\/li>|<\/p>|<\/h\d>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n');

    const blocks = text.split(/Hide this surebet/i).slice(0, 80);
    const rows = [];
    for (const raw of blocks) {
      const block = raw.slice(-5000).trim();
      if (!block) continue;
      const profitMatches = [...block.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]));
      const visibleProfitPct = profitMatches.find((v) => v > 0 && v <= 25) ?? null;
      const esBookmakers = [...new Set([...block.matchAll(/([A-Za-z0-9À-ÿ .&'_-]{2,40}\(ES\))/g)].map((m) => m[1].trim()))];
      if (!visibleProfitPct || esBookmakers.length === 0) continue;
      rows.push({
        visibleProfitPct,
        spanishBookmakersMentioned: esBookmakers,
        evidenceSnippet: block.slice(-1200),
        phase: 'PUBLIC_RESEARCH_RECHECK_REQUIRED',
        green: false,
        blockers: [
          'PUBLIC_AGGREGATOR_SAMPLE_NOT_EXECUTION_GRADE',
          'ALL_PRONGS_NOT_MACHINE_VERIFIED_AS_SPANISH',
          'DIRECT_BOOKMAKER_ODDS_RECHECK_REQUIRED',
          'MARKET_RULE_EQUIVALENCE_RECHECK_REQUIRED'
        ]
      });
    }

    rows.sort((a, b) => b.visibleProfitPct - a.visibleProfitPct);
    write({
      ...base,
      status: 'FREE_PUBLIC_SCAN_ACTIVE',
      source: {
        endpoint: PUBLIC_PAGE,
        paidApiUsed: false,
        bytes: html.length,
        fetchedAt: iso,
        note: 'Free public source is triage only and can never authorize wagering by itself.'
      },
      candidates: [],
      publicResearchCandidates: rows.slice(0, 30),
      summary: {
        scanned: blocks.length,
        spanishOnlyCount: 0,
        greenCount: 0,
        freeResearchCandidateCount: rows.length,
        reason: rows.length ? 'FREE_PUBLIC_CANDIDATES_REQUIRE_DIRECT_RECHECK' : 'NO_FREE_PUBLIC_CANDIDATE_PARSED'
      }
    });
  } catch (error) {
    write({
      ...base,
      status: 'FREE_PUBLIC_SOURCE_EXCEPTION',
      source: { endpoint: PUBLIC_PAGE, paidApiUsed: false },
      candidates: [],
      publicResearchCandidates: [],
      summary: { scanned: 0, spanishOnlyCount: 0, greenCount: 0, reason: String(error?.message || error) }
    });
  }
};

if (!token) {
  await publicFallback();
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
  await publicFallback();
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
    paidApiUsed: true,
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
