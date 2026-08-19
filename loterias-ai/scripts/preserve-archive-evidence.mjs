import fs from 'node:fs';
import path from 'node:path';

const beforeRoot = process.env.ARCHIVE_BEFORE || '/tmp/loterias-ai-archive-before';
const afterRoot = process.env.ARCHIVE_AFTER || 'loterias-ai/data/archive';
const reportPath = path.join(afterRoot, '_meta', 'archive-preservation.json');

function walk(dir, root, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, root, out);
    else if (name.endsWith('.json')) out.push(path.relative(root, p));
  }
  return out;
}

function providerIsSelae(v) {
  return /SELAE|LOTERIAS\s*Y\s*APUESTAS/i.test(String(v || ''));
}

function officialEvidence(r) {
  if (!r || typeof r !== 'object') return false;
  if (r.source?.official === true || providerIsSelae(r.source?.provider)) return true;
  if (/^OFFICIAL(?:_|$)/i.test(String(r.verification?.status || ''))) return true;
  if (r.economics?.validation?.officialSELAE === true) return true;
  if (providerIsSelae(r.economics?.officialSource?.provider)) return true;
  if (providerIsSelae(r.result?.officialPrizeSchema?.provider)) return true;
  return false;
}

function keyOf(r) {
  return String(r?.drawId || r?.drawDate || r?.date || '');
}

const report = {
  generatedAt: new Date().toISOString(),
  beforeRoot,
  afterRoot,
  filesInspected: 0,
  missingRowsRestored: 0,
  officialRowsProtected: 0,
  economicsRestored: 0,
  touchedFiles: [],
  violations: [],
  pass: true
};

for (const rel of walk(beforeRoot, beforeRoot)) {
  const beforePath = path.join(beforeRoot, rel);
  const afterPath = path.join(afterRoot, rel);
  if (!fs.existsSync(afterPath)) continue;
  let before, after;
  try {
    before = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
    after = JSON.parse(fs.readFileSync(afterPath, 'utf8'));
  } catch {
    continue;
  }
  if (!Array.isArray(before?.records) || !Array.isArray(after?.records)) continue;
  report.filesInspected++;
  const afterByKey = new Map(after.records.map((r, i) => [keyOf(r), i]).filter(([k]) => k));
  let changed = false;

  for (const oldRow of before.records) {
    const key = keyOf(oldRow);
    if (!key) continue;
    const idx = afterByKey.get(key);
    if (idx == null) {
      after.records.push(oldRow);
      afterByKey.set(key, after.records.length - 1);
      report.missingRowsRestored++;
      changed = true;
      continue;
    }
    const newRow = after.records[idx];
    if (officialEvidence(oldRow) && !officialEvidence(newRow)) {
      after.records[idx] = oldRow;
      report.officialRowsProtected++;
      changed = true;
      continue;
    }
    if (oldRow?.economics && !newRow?.economics) {
      after.records[idx] = { ...newRow, economics: oldRow.economics };
      report.economicsRestored++;
      changed = true;
    }
  }

  if (changed) {
    after.records.sort((a, b) => String(a.drawDate || a.date || '').localeCompare(String(b.drawDate || b.date || '')));
    fs.writeFileSync(afterPath, JSON.stringify(after, null, 2) + '\n');
    report.touchedFiles.push(rel);
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.violations.length) process.exitCode = 2;
