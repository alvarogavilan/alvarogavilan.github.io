import assert from 'node:assert/strict';

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

function euroAmounts(text) {
  const found = [];
  const re = /(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)/gi;
  for (const m of text.matchAll(re)) {
    const normalized = Number(m[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(normalized)) found.push(normalized);
  }
  return found;
}

const fixture = `
<html><body>
<section><h2>TORRELODONES</h2><div>DRAW POKER</div><strong>16.660,77 €</strong></section>
<script>const fake = 'DRAW POKER 999.999,99 €';</script>
</body></html>`;
const text = textFromHtml(fixture);
assert.match(text, /DRAW POKER/);
assert.doesNotMatch(text, /999\.999/);
assert.deepEqual(euroAmounts(text), [16660.77]);

// A meter amount is evidence of state only; it cannot resolve paytable or edge.
const decision = {
  drawPokerPubliclyResolved: /draw poker/i.test(text),
  exactPaytableResolved: false,
  thresholdVerified: false,
  realMoneyAllowed: false,
};
assert.equal(decision.drawPokerPubliclyResolved, true);
assert.equal(decision.exactPaytableResolved, false);
assert.equal(decision.thresholdVerified, false);
assert.equal(decision.realMoneyAllowed, false);

console.log('cgm-draw-poker-public-probe-v1.test.mjs: PASS');
