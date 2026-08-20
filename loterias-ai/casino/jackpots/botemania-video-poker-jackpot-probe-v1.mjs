#!/usr/bin/env node
// Misión B: prior evidence (botemania-universe-current-v1.json) confirmed 4
// Botemania video-poker titles and their RTP-context text, but never
// specifically searched those same pages for jackpot/progressive-related
// text - RTP context snippets and jackpot context snippets are extracted
// around DIFFERENT keywords, so a page having no "jackpot" text near its RTP
// disclosure does not mean the page has no jackpot text at all. This probe
// re-fetches the 4 confirmed titles and searches specifically for jackpot/
// progressive/bote signal, plus full paytable text where present.
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

const NEEDLES = ['jackpot', 'bote', 'progresivo', 'progressive', 'Escalera Real', 'Royal', 'coronas', 'crown'];

const results = [];
for (const title of BOTEMANIA_VIDEO_POKER_TITLES) {
  const r = await fetch(title.url, { headers: { accept: 'text/html,*/*', 'user-agent': 'loterias-ai-video-poker-jackpot-probe/1.0', 'cache-control': 'no-cache' }, redirect: 'follow' });
  const html = await r.text();
  const text = toText(html);
  const contexts = {};
  for (const needle of NEEDLES) {
    const arr = [];
    let p = 0, c = 0;
    const lower = text.toLowerCase(), needleLower = needle.toLowerCase();
    while (c < 6) {
      const i = lower.indexOf(needleLower, p);
      if (i < 0) break;
      arr.push(text.slice(Math.max(0, i - 300), Math.min(text.length, i + needle.length + 500)));
      p = i + needle.length;
      c++;
    }
    contexts[needle] = arr;
  }
  const anyJackpotSignal = Object.entries(contexts).some(([k, v]) => v.length > 0);
  results.push({
    slug: title.slug,
    url: title.url,
    httpStatus: r.status,
    bytes: text.length,
    sha256: crypto.createHash('sha256').update(html).digest('hex'),
    contexts,
    anyJackpotSignal,
  });
}

const out = {
  version: 'botemania-video-poker-jackpot-probe-v1',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  titlesProbed: results.length,
  results,
  decision: {
    anyTitleWithJackpotSignal: results.some((r) => r.anyJackpotSignal),
    titlesWithJackpotSignal: results.filter((r) => r.anyJackpotSignal).map((r) => r.slug),
    exactPaytableRecoveredForAnyTitle: false, // requires manual/model read of contexts, never auto-set
    realMoneyAllowed: false,
  },
  guards: {
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
