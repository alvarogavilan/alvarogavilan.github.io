#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ENDPOINT = 'https://www.botemania.es/es/graphql';
const VENTURE = 'botemania_es';
const SLUG = 'ultimate-video-poker';
const PAGE_PATH = `/juegos/casino-online/${SLUG}`;
const REFERER = `https://www.botemania.es${PAGE_PATH}`;
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-ultimate-video-poker-content-tabledata-probe-v2.json';
const headers = {
  accept: 'application/json',
  'content-type': 'application/json',
  venture: VENTURE,
  referer: REFERER,
  origin: 'https://www.botemania.es',
  'user-agent': 'loterias-ai-botemania-uvp-content-tabledata-probe/2.0',
};

async function gql(query, variables) {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  return {
    httpStatus: r.status,
    body,
    responseSha256: crypto.createHash('sha256').update(text).digest('hex'),
    rawPreview: body ? null : text.slice(0, 800),
  };
}

// These are not guessed schema fields: they are copied from the public
// GameFragment embedded in Botemania's current client bundle. No introspection.
const fields = `
  id
  title
  introduction
  heroCaption
  canonical
  howToPlay
  providerId
  provider { name legalInfo bynderImage { transformBaseUrl name } }
  gameFeatures { enabled value type }
  content {
    type
    props {
      text
      imageUrl
      imageAlt
      imageCaption
      videoUrl
      videoAlt
      videoThumbnail
      tableData
    }
  }
  jackpot { id amount }
  jsonld
`;

const specs = [
  [
    'contentfulGameExtended',
    `query BotemaniaUVPContentV2($gameId:String!){ contentfulGame(gameId:$gameId){ ${fields} } }`,
    { gameId: SLUG },
  ],
  [
    'pageOrGameExtended',
    `query BotemaniaUVPPageV2($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`,
    { path: PAGE_PATH },
  ],
];

const probes = [];
for (const [name, query, variables] of specs) {
  try {
    const x = await gql(query, variables);
    probes.push({
      name,
      httpStatus: x.httpStatus,
      data: x.body?.data || null,
      errors: (x.body?.errors || []).map((e) => String(e?.message || e)).slice(0, 20),
      responseSha256: x.responseSha256,
      rawPreview: x.rawPreview,
    });
  } catch (e) {
    probes.push({ name, httpStatus: null, data: null, errors: [String(e?.message || e)] });
  }
}

const games = [];
for (const p of probes) {
  const g = p.data?.contentfulGame || p.data?.pageOrGame?.game;
  if (g && typeof g === 'object') games.push({ source: p.name, ...g });
}

const needles = [
  'Jotas o Mejor', 'Jacks or Better', 'Jacks Or Better', 'Progresivo', 'Progressive',
  'Royal Flush', 'Escalera Real', 'Straight Flush', 'Escalera de Color',
  'Four of a Kind', 'Poker', 'Full House', 'Full', 'Flush', 'Color',
  'Straight', 'Escalera', 'Three of a Kind', 'Trío', 'Two Pair', 'Doble Pareja',
  'Jacks or Better: 1', '800', '125', '0.01', '0,01',
];

function walk(value, path = '$', out = []) {
  if (out.length >= 500) return out;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    const matched = needles.filter((n) => lower.includes(n.toLowerCase()));
    if (matched.length) out.push({ path, matched, value: value.slice(0, 5000) });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, out));
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`, out);
  }
  return out;
}

const semanticHits = walk(games);
const tableDataBlocks = [];
for (const g of games) {
  for (let i = 0; i < (g.content || []).length; i++) {
    const block = g.content[i];
    if (block?.props?.tableData != null) {
      tableDataBlocks.push({
        source: g.source,
        blockIndex: i,
        type: block.type ?? null,
        tableData: block.props.tableData,
      });
    }
  }
}

const howToPlayBlocks = games
  .filter((g) => typeof g.howToPlay === 'string' && g.howToPlay.trim())
  .map((g) => ({ source: g.source, howToPlay: g.howToPlay }));

const jackpotBlocks = games
  .filter((g) => g.jackpot && typeof g.jackpot === 'object')
  .map((g) => ({ source: g.source, jackpot: g.jackpot }));

const paytableHandSignals = [
  /jacks?\s+(?:or|o)\s+better|jotas?\s+o\s+mejor/i,
  /two\s+pair|doble\s+pareja/i,
  /three\s+of\s+a\s+kind|tr[ií]o/i,
  /straight(?!\s+flush)|escalera(?!\s+de\s+color)/i,
  /flush|color/i,
  /full\s+house|full/i,
  /four\s+of\s+a\s+kind|p[oó]ker/i,
  /straight\s+flush|escalera\s+de\s+color/i,
  /royal\s+flush|escalera\s+real/i,
];
const tableSerialized = JSON.stringify(tableDataBlocks);
const distinctPaytableHandSignalCount = paytableHandSignals.filter((re) => re.test(tableSerialized)).length;
const hasMultipleNumericPayouts = (tableSerialized.match(/\b(?:1|2|3|4|5|7|25|50|800)\b/g) || []).length >= 5;
const structuredPaytableCandidate = tableDataBlocks.length > 0 && distinctPaytableHandSignalCount >= 5 && hasMultipleNumericPayouts;

const progressiveConditionSignals = semanticHits.filter((h) =>
  h.matched.some((m) => /progress|progres|royal flush|escalera real/i.test(m))
);

const out = {
  version: 'botemania-ultimate-video-poker-content-tabledata-probe-v2',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  target: {
    game: 'Ultimate Video Poker',
    variant: 'Jotas o Mejor Progresivo',
    providerIdExpected: 'roxor-gaming',
    monitorKey: 'generic:WAGER_BET',
    page: REFERER,
  },
  schemaProvenance: {
    source: 'PUBLIC_CURRENT_BOTEMANIA_CLIENT_BUNDLE_GAMEFRAGMENT',
    noIntrospection: true,
    queriedKnownFields: true,
    keyNewField: 'content.props.tableData',
  },
  probes,
  games,
  extracted: {
    gameCount: games.length,
    providerIds: [...new Set(games.map((g) => g.providerId).filter(Boolean))],
    providerNames: [...new Set(games.map((g) => g.provider?.name).filter(Boolean))],
    tableDataBlockCount: tableDataBlocks.length,
    tableDataBlocks,
    howToPlayBlockCount: howToPlayBlocks.length,
    howToPlayBlocks,
    jackpotBlocks,
    semanticHits,
    distinctPaytableHandSignalCount,
    hasMultipleNumericPayouts,
    progressiveConditionSignals,
  },
  decision: {
    metadataRecovered: games.length > 0,
    expectedProviderMatched: games.some((g) => g.providerId === 'roxor-gaming'),
    structuredTableDataRecovered: tableDataBlocks.length > 0,
    structuredPaytableCandidateRecovered: structuredPaytableCandidate,
    exactPaytableVerified: false,
    exactProgressiveTriggerVerified: false,
    qualifyingCoinsVerified: false,
    denominationVerified: false,
    stakeVerified: false,
    pRoyalFlushRecovered: false,
    economicModelVerified: false,
    realMoneyAllowed: false,
  },
  guards: {
    publicGraphqlOnly: true,
    knownBundleFieldsOnly: true,
    noIntrospection: true,
    noAuthentication: true,
    noCookies: true,
    noMutation: true,
    noBetting: true,
    noAutoVerificationFromTextMatch: true,
    noAutoExecutionFromCrossMarketEvidence: true,
    realMoneyAllowed: false,
  },
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  extracted: {
    gameCount: out.extracted.gameCount,
    providerIds: out.extracted.providerIds,
    providerNames: out.extracted.providerNames,
    tableDataBlockCount: out.extracted.tableDataBlockCount,
    howToPlayBlockCount: out.extracted.howToPlayBlockCount,
    jackpotBlocks: out.extracted.jackpotBlocks,
    distinctPaytableHandSignalCount: out.extracted.distinctPaytableHandSignalCount,
    hasMultipleNumericPayouts: out.extracted.hasMultipleNumericPayouts,
    progressiveConditionSignals: out.extracted.progressiveConditionSignals.slice(0, 20),
  },
  decision: out.decision,
}, null, 2));
