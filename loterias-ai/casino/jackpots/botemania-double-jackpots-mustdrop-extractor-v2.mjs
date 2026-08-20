#!/usr/bin/env node
// v2: the v1 extractor found the "MustDropWithin" UI-component chunk (styling/
// React boilerplate only, no numeric config) but its "settings" chunk - which
// should hold the actual per-jackpot numeric configuration - produced ZERO
// matches against a 7-word needle list. That's the single highest-value
// blocker for Misión 1 (Botemania "Double Jackpots" must-drop mechanism).
// v2 widens the needle list substantially and adds a needle-independent scan
// for any JS object literal containing 2+ numeric fields near jackpot/pot/
// currency-flavoured keys, since the real config keys may not literally be
// "amount"/"maximum"/"minimum" (e.g. could be "cap", "seed", "floor", "reset",
// short camelCase, or GraphQL variable names).
import fs from 'node:fs';
import crypto from 'node:crypto';

const LAZY = 'loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-probe-v1.json';
const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-double-jackpots-mustdrop-extractor-v2.json';
const lazy = JSON.parse(fs.readFileSync(LAZY, 'utf8'));
const metas = (lazy.chunks || []).filter((x) => /DoubleJackpots-(MustDropWithin|settings)/i.test(String(x.name || '')));

const NEEDLES = [
  'mustDropWithin', 'MustDropWithin', 'must drop', 'mustDrop', 'MustDrop',
  'minimum', 'maximum', 'threshold', 'jackpot.amount', 'amount',
  'cap', 'seed', 'reset', 'floor', 'ceiling', 'expir', 'deadline',
  'countdown', 'window', 'currency', 'EUR', 'GBP', 'contribution',
  'jackpotId', 'jackpotID', 'networkId', 'poolId', 'tierId', 'gameEngineID',
];

const CURRENCY_KEY_RE = /(jackpot|pot|drop|cap|seed|reset|min|max|floor|ceiling|threshold|window|expir|deadline|countdown)/i;

const chunks = [];
const findings = [];
const objectLiteralCandidates = [];

for (const meta of metas) {
  const r = await fetch(meta.url, { headers: { accept: 'application/javascript,*/*', 'user-agent': 'loterias-ai-mustdrop-extractor/2.0', 'cache-control': 'no-cache' }, redirect: 'follow' });
  const text = await r.text();
  chunks.push({ name: meta.name, url: meta.url, httpStatus: r.status, bytes: text.length, sha256: crypto.createHash('sha256').update(text).digest('hex') });

  for (const needle of NEEDLES) {
    let p = 0, c = 0;
    const lower = text.toLowerCase(), needleLower = needle.toLowerCase();
    while (c < 12) {
      const i = lower.indexOf(needleLower, p);
      if (i < 0) break;
      const context = text.slice(Math.max(0, i - 400), Math.min(text.length, i + needle.length + 800));
      findings.push({ chunk: meta.name, needle, index: i, context });
      p = i + needle.length;
      c++;
    }
  }

  // Needle-independent scan: any short object-literal-like span containing a
  // jackpot/pot/cap/seed-flavoured key AND at least 2 numeric literals >= 2
  // digits, regardless of the exact key name used.
  const objRe = /\{[^{}]{0,400}\}/g;
  let m;
  let scanned = 0;
  while ((m = objRe.exec(text)) && scanned < 4000) {
    scanned++;
    const span = m[0];
    if (!CURRENCY_KEY_RE.test(span)) continue;
    const nums = [...span.matchAll(/\b\d{2,}(?:\.\d+)?\b/g)].map((x) => x[0]);
    if (nums.length >= 2) {
      objectLiteralCandidates.push({ chunk: meta.name, index: m.index, span: span.slice(0, 400), numbers: nums.slice(0, 12) });
    }
  }
}

const out = {
  version: 'botemania-double-jackpots-mustdrop-extractor-v2',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  chunks,
  needleCount: NEEDLES.length,
  findingsCount: findings.length,
  findings,
  objectLiteralCandidateCount: objectLiteralCandidates.length,
  objectLiteralCandidates: objectLiteralCandidates.slice(0, 200),
  decision: {
    settingsChunkHadNeedleMatches: findings.some((f) => /settings/i.test(f.chunk)),
    settingsChunkHadObjectLiteralCandidates: objectLiteralCandidates.some((f) => /settings/i.test(f.chunk)),
    exactMustDropLimitsRecovered: false, // set true manually only after a human/model review of objectLiteralCandidates confirms a real config, never auto-inferred
    requiresManualReviewOfObjectLiteralCandidates: objectLiteralCandidates.length > 0,
    requiresLiveJackpotRows: true,
    realMoneyAllowed: false,
  },
  guards: {
    publicStaticBundlesOnly: true,
    noGraphqlIntrospection: true,
    noMutation: true,
    noAuthentication: true,
    noCookies: true,
    noAutoPromotionFromHeuristicScan: true,
    noBetting: true,
    realMoneyAllowed: false,
  },
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ chunks, decision: out.decision, findingsCount: out.findingsCount, objectLiteralCandidateCount: out.objectLiteralCandidateCount }, null, 2));
