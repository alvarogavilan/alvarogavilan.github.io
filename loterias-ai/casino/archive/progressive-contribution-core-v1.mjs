const dec = value => Number(String(value).replace(/\./g, '').replace(',', '.'));

export function extractProgressiveContributionPcts(text) {
  const source = String(text || '');
  const values = [];
  const patterns = [
    /(?:contribuci[oó]n al bote|contribuye al bote)[^\d]{0,80}(\d+(?:[.,]\d+)?)\s*%/gi,
    /(\d+(?:[.,]\d+)?)\s*%\s*(?:\(\s*)?(?:de\s+)?contribuci[oó]n al bote\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const value = dec(match[1]);
      if (Number.isFinite(value) && value > 0 && value < 10) values.push(value);
    }
  }

  return [...new Set(values)];
}
