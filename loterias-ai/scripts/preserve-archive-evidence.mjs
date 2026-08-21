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

function officialEconomicsEvidence(r) {
  if (!r || typeof r !== 'object') return false;
  if (r.economics?.validation?.officialSELAE === true) return true;
  if (providerIsSelae(r.economics?.source?.provider)) return true;
  if (providerIsSelae(r.economics?.officialSource?.provider)) return true;
  return false;
}

function strictResultVerification(r) {
  if (!r || typeof r !== 'object') return false;
  const status = String(r.verification?.status || '');
  const cross = r.verification?.officialCrossCheck;
  if (/^OFFICIAL_[A-Z0-9_]*VALIDATED$/i.test(status)) return true;
  if (cross?.complete === true && (providerIsSelae(cross?.provider) || /BOE/i.test(String(cross?.provider || '')))) return true;
  return false;
}

function officialConflictEvidence(r) {
  const status = String(r?.verification?.status || '');
  return /CONFLICT|QUARANTIN/i.test(status);
}

function sameResultPayload(a, b) {
  return JSON.stringify(a?.result ?? null) === JSON.stringify(b?.result ?? null);
}

function officialEvidence(r) {
  if (!r || typeof r !== 'object') return false;
  if (r.source?.official === true || providerIsSelae(r.source?.provider)) return true;
  if (/^OFFICIAL(?:_|$)/i.test(String(r.verification?.status || ''))) return true;
  if (officialEconomicsEvidence(r)) return true;
  if (providerIsSelae(r.result?.officialPrizeSchema?.provider)) return true;
  return false;
}

function evidenceBearing(r) {
  return officialEvidence(r) || Boolean(r?.economics);
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
  nonEvidenceMissingRowsNotRestored: 0,
  officialRowsProtected: 0,
  strictResultVerificationProtected: 0,
  officialEconomicsProtected: 0,
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
      if (!evidenceBearing(oldRow)) {
        report.nonEvidenceMissingRowsNotRestored++;
        continue;
      }
      after.records.push(oldRow);
      afterByKey.set(key, after.records.length - 1);
      report.missingRowsRestored++;
      changed = true;
      continue;
    }

    let newRow = after.records[idx];

    // Result certification is stricter than generic "official" provenance or
    // economics. A refresh must not erase an exact officialCrossCheck merely
    // because the replacement row still comes from SELAE. Preserve the strict
    // verification only when the certified result payload itself is unchanged.
    if (strictResultVerification(oldRow) && !strictResultVerification(newRow) && !officialConflictEvidence(newRow)) {
      if (sameResultPayload(oldRow, newRow)) {
        after.records[idx] = {
          ...newRow,
          verification: oldRow.verification,
          ...(Object.prototype.hasOwnProperty.call(oldRow, 'trainingEligible')
            ? { trainingEligible: oldRow.trainingEligible }
            : {})
        };
        newRow = after.records[idx];
        report.strictResultVerificationProtected++;
        changed = true;
      } else {
        after.records[idx] = { ...newRow, trainingEligible: false };
        newRow = after.records[idx];
        report.violations.push({
          file: rel,
          key,
          reason: 'STRICT_RESULT_VERIFICATION_WOULD_BE_LOST_WITH_RESULT_PAYLOAD_DRIFT'
        });
        report.pass = false;
        changed = true;
      }
    }

    if (officialEvidence(oldRow) && !officialEvidence(newRow)) {
      after.records[idx] = oldRow;
      report.officialRowsProtected++;
      changed = true;
      continue;
    }
    if (officialEconomicsEvidence(oldRow) && !officialEconomicsEvidence(newRow)) {
      after.records[idx] = { ...newRow, economics: oldRow.economics };
      newRow = after.records[idx];
      report.officialEconomicsProtected++;
      changed = true;
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
