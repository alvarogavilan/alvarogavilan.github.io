#!/usr/bin/env node
// Probe Botemania video-poker pages for two separate signal classes:
//   A) progressive/jackpot evidence
//   B) paytable/royal-flush evidence
//
// IMPORTANT: signal matching is whole-word/whole-phrase. A raw substring scan
// for "bote" incorrectly matches the brand name "Botemania" and would mark
// every page as progressive. Likewise Royal/Escalera Real are paytable terms,
// not proof of a progressive jackpot.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { BOTEMANIA_VIDEO_POKER_TITLES } from './progressive-video-poker-ev-v1.mjs';

const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-video-poker-jackpot-probe-v1.json';
const toText = (h) =>
  String(h || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&euro;|&#8364;/gi, '€')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();

const PROGRESSIVE_NEEDLES = ['jackpot', 'bote', 'progresivo', 'progressive'];
const PAYTABLE_NEEDLES = ['Escalera Real', 'Royal', 'coronas', 'crown'];
const ALL_NEEDLES = [...PROGRESSIVE_NEEDLES, ...PAYTABLE_NEEDLES];

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function contextsForWholePhrase(text, needle, maxMatches = 6) {
  const re = new RegExp(`\\b${escapeRegex(needle)}\\b`, 'giu');
  const arr = [];
  let m;
  while (arr.length < maxMatches && (m = re.exec(text)) !== null) {
    const i = m.index;
    arr.push(text.slice(Math.max(0, i - 300), Math.min(text.length, i + m[0].length + 500)));
    if (m[0].length === 0) re.lastIndex++;
  }
  return arr;
}

const results = [];
for (const title of BOTEMANIA_VIDEO_POKER_TITLES) {
  const r = await fetch(title.url, {
    headers: {
      accept: 'text/html,*/*',
      'user-agent': 'loterias-ai-video-poker-jackpot-probe/1.2',
      'cache-control': 'no-cache',
    },
    redirect: 'follow',
  });
  const html = await r.text();
  const text = toText(html);
  const contexts = {};

  for (const needle of ALL_NEEDLES) contexts[needle] = contextsForWholePhrase(text, needle);

  const progressiveSignalNeedles = PROGRESSIVE_NEEDLES.filter((needle) => (contexts[needle] || []).length > 0);
  const paytableSignalNeedles = PAYTABLE_NEEDLES.filter((needle) => (contexts[needle] || []).length > 0);

  results.push({
    slug: title.slug,
    url: title.url,
    httpStatus: r.status,
    bytes: text.length,
    sha256: crypto.createHash('sha256').update(html).digest('hex'),
    contexts,
    progressiveSignalNeedles,
    paytableSignalNeedles,
    anyProgressiveSignal: progressiveSignalNeedles.length > 0,
    anyPaytableSignal: paytableSignalNeedles.length > 0,
  });
}

const out = {
  version: 'botemania-video-poker-jackpot-probe-v1.2-whole-word-signals',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  titlesProbed: results.length,
  results,
  decision: {
    anyTitleWithProgressiveSignal: results.some((r) => r.anyProgressiveSignal),
    titlesWithProgressiveSignal: results.filter((r) => r.anyProgressiveSignal).map((r) => r.slug),
    titlesWithPaytableSignal: results.filter((r) => r.anyPaytableSignal).map((r) => r.slug),
    exactPaytableRecoveredForAnyTitle: false,
    realMoneyAllowed: false,
  },
  guards: {
    wholeWordSignalMatching: true,
    botemaniaBrandCannotSatisfyBoteNeedle: true,
    royalTextDoesNotCountAsProgressiveEvidence: true,
    publicPageOnly: true,
    noAuthentication: true,
    noCookies: true,
    noBetting: true,
    realMoneyAllowed: false,
  },
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ titlesProbed: out.titlesProbed, decision: out.decision }, null, 2));
