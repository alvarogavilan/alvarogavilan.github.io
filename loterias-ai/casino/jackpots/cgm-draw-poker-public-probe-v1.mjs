#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const URLS = [
  'https://www.granmadrid.com/juegos/maquinas-de-azar',
  'https://www.granmadrid.com/juegos/maquinas-de-azar/',
];
const OUT = 'loterias-ai/casino/jackpots/evidence/cgm-draw-poker-public-probe-v1.json';
const UA = 'loterias-ai-cgm-draw-poker-public-probe/1.0';
const needles = [
  'DRAW POKER',
  'Draw Poker',
  'POKER',
  'EGT',
  'PREMIUM GAMINATOR',
  'TORRELODONES',
  'COLON',
  'COLÓN',
  'jackpot',
  'bote',
];

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function textFromHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&euro;|&#8364;/gi, '€')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function contexts(text, needle, radius = 500, limit = 20) {
  const out = [];
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  let p = 0;
  while (out.length < limit) {
    const at = lower.indexOf(n, p);
    if (at < 0) break;
    out.push({ needle, index: at, text: text.slice(Math.max(0, at - radius), Math.min(text.length, at + n.length + radius)) });
    p = at + n.length;
  }
  return out;
}

function euroAmounts(text) {
  const found = [];
  const re = /(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)/gi;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    const normalized = Number(m[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(normalized)) found.push({ raw, amountEUR: normalized, index: m.index });
  }
  return found;
}

const attempts = [];
for (const url of URLS) {
  try {
    const r = await fetch(url, {
      headers: { accept: 'text/html,*/*', 'user-agent': UA, 'cache-control': 'no-cache' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    const html = await r.text();
    attempts.push({ url, finalUrl: r.url, httpStatus: r.status, ok: r.ok, bytes: html.length, sha256: sha256(html), html });
    if (r.ok && html.length > 1000) break;
  } catch (e) {
    attempts.push({ url, finalUrl: null, httpStatus: null, ok: false, bytes: 0, sha256: null, error: String(e?.message || e), html: null });
  }
}

const chosen = attempts.find((a) => a.ok && a.html) || null;
const text = chosen ? textFromHtml(chosen.html) : '';
const hits = chosen ? needles.flatMap((n) => contexts(text, n)) : [];
const amounts = chosen ? euroAmounts(text) : [];
const drawPokerHits = hits.filter((h) => /draw poker/i.test(h.needle));
const drawPokerContexts = drawPokerHits.map((h) => ({
  ...h,
  nearbyAmounts: amounts.filter((a) => Math.abs(a.index - h.index) <= 900).slice(0, 20),
}));

const lower = text.toLowerCase();
const out = {
  version: 'cgm-draw-poker-public-probe-v1',
  generatedAt: new Date().toISOString(),
  operator: 'casino-gran-madrid-physical',
  market: 'ES-MADRID-PHYSICAL',
  purpose: 'Resolve the identity and current public jackpot context of Casino Gran Madrid Draw Poker without authentication or wagering.',
  attempts: attempts.map(({ html, ...x }) => x),
  selectedPage: chosen ? { url: chosen.finalUrl, httpStatus: chosen.httpStatus, bytes: chosen.bytes, sha256: chosen.sha256 } : null,
  extracted: {
    drawPokerTextPresent: /draw poker/i.test(text),
    pokerTextPresent: /poker/i.test(text),
    torrelodonesTextPresent: /torrelodones/i.test(text),
    egtTextPresent: /\begt\b/i.test(text),
    premiumGaminatorTextPresent: /premium gaminator/i.test(text),
    progressiveTermsPresent: /jackpot|bote|progresiv/i.test(text),
    drawPokerContexts,
    allEuroAmounts: amounts.slice(0, 300),
    evidenceNeedleHits: hits.slice(0, 200),
  },
  decision: {
    publicPageFetched: !!chosen,
    drawPokerPubliclyResolved: drawPokerContexts.length > 0,
    exactManufacturerResolved: false,
    exactPaytableResolved: false,
    exactDenominationResolved: false,
    exactQualifyingStakeResolved: false,
    exactProgressiveTriggerResolved: false,
    exactResetResolved: false,
    exactLiveMeterBindingResolved: false,
    thresholdVerified: false,
    realMoneyAllowed: false
  },
  nextProof: [
    'If Draw Poker context is present, preserve the exact surrounding public text and meter amount with timestamp.',
    'Resolve manufacturer/model from the same official page, public image metadata, or manufacturer/operator documentation.',
    'Do not apply any external Jacks-or-Better paytable until the exact physical configuration is fingerprinted.',
    'Only compute a threshold after paytable, jackpot-winning event, denomination, qualifying stake and reset award are all exact.'
  ],
  guards: {
    publicUnauthenticatedOnly: true,
    noLogin: true,
    noCookies: true,
    noMutation: true,
    noWagering: true,
    noExternalPaytableTransfer: true,
    noJackpotAmountAloneAsEdge: true,
    realMoneyAllowed: false
  }
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ selectedPage: out.selectedPage, extracted: { drawPokerTextPresent: out.extracted.drawPokerTextPresent, drawPokerContexts: out.extracted.drawPokerContexts }, decision: out.decision }, null, 2));
