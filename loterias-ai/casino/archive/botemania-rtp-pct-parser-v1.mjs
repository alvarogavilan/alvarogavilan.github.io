// Shared fail-closed RTP parser for Botemania rules-page RTP contexts.
// Some Botemania pages publish the base RTP as e.g. `95,39 (Base)` without
// a literal percent sign, while contribution values on the same page do use `%`.
// Only values explicitly terminated by `%` or `(Base)` are accepted.

const decimal = (raw) => Number(String(raw).replace(',', '.'));

export function parseRtpPctsFromContexts(contexts) {
  const values = new Set();
  for (const context of Array.isArray(contexts) ? contexts : []) {
    const text = String(context ?? '');
    for (const match of text.matchAll(/(?<!\d)(\d{1,2}(?:[.,]\d{1,3})?)\s*(?:%|\(base\))/gi)) {
      const value = decimal(match[1]);
      if (Number.isFinite(value) && value > 0 && value < 100) values.add(value);
    }
  }
  return [...values];
}
