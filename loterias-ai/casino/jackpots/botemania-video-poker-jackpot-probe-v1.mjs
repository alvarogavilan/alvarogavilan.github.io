#!/usr/bin/env node
// Probe Botemania video-poker pages for two separate signal classes:
//   A) progressive/jackpot evidence
//   B) paytable/royal-flush evidence
// These MUST NOT be conflated: a normal video-poker page can contain
// "Royal"/"Escalera Real" without having any progressive jackpot at all.
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

const results = [];
for (const title of BOTEMANIA_VIDEO_POKER_TITLES) {
  const r = await fetch(title.url, {
    headers: {
      accept: 'text/html,*/*',
      'user-agent': 'loterias-ai-video-poker-jackpot-probe/1.1',
      'cache-control': 'no-cache',
    },
    redirect: 'follow',
  });
  const html = await r.text();
  const text = toText(html);
  const contexts = {};
  const lower = text.toLowerCase();

  for (const needle of ALL_NEEDLES) {
    const arr = [];
    let p = 0;
    let c = 0;
    const needleLower = needle.toLowerCase();
    while (c < 6) {
      const i = lower.indexOf(needleLower, p);
      if (i < 0) break;
      arr.push(text.slice(Math.max(0, i - 300), Math.min(text.length, i + needle.length + 500)));
      p = i + needle.length;
      c++;
    }
    contexts[needle] = arr;
  }

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
  version: 'botemania-video-poker-jackpot-probe-v1.1-signal-separation',
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
