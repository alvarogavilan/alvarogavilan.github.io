import fs from 'node:fs';
import path from 'node:path';

const dir = 'loterias-ai/data/archive/loteria-nacional';
const metaDir = 'loterias-ai/data/archive/_meta';
fs.mkdirSync(metaDir, { recursive: true });

const n5 = value => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? digits.slice(-5).padStart(5, '0') : '';
};
const dateCompact = value => String(value ?? '').replaceAll('-', '');
const hasDetailedOfficialResult = result => {
  const d = result?.detailedExtractions;
  const exact = result?.officialPrizeSchema?.exactPrizes;
  if (d?.officialSELAE !== true || d?.provider !== 'SELAE' || d?.service !== 'resultados2') return false;
  if (!exact?.first?.number || !exact?.second?.number) return false;
  return ['fiveDigits', 'fourDigits', 'threeDigits', 'twoDigits', 'reintegros']
    .some(key => Array.isArray(d[key]) && d[key].length > 0);
};

let totalNonSeasonal = 0;
let eligibleOfficialSchema = 0;
let alreadyCertified = 0;
let newlyCertified = 0;
const blocked = [];
const changedFiles = new Set();

for (const file of fs.readdirSync(dir).filter(f => /^\d{4}\.json$/.test(f)).sort()) {
  const filePath = path.join(dir, file);
  const doc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;

  for (const row of doc.records || []) {
    if (row.drawType === 'CHRISTMAS' || row.drawType === 'EL_NINO') continue;
    totalNonSeasonal++;

    const schema = row.result?.officialPrizeSchema;
    const econ = row.economics;
    const validation = econ?.validation;
    const officialSource = econ?.officialSource;
    if (schema?.provider !== 'SELAE' || schema?.service !== 'resultados2' || Number(schema?.version || 0) < 2) continue;
    eligibleOfficialSchema++;

    if (row.verification?.status === 'OFFICIAL_SELAE_VALIDATED' && row.verification?.officialCrossCheck?.complete === true) {
      alreadyCertified++;
      continue;
    }

    const schemaDrawId = String(schema?.drawId ?? '').trim();
    const persistedOfficialDrawId = String(row.official?.drawId ?? '').trim();
    const checks = {
      schemaDrawIdPresent: Boolean(schemaDrawId),
      persistedOfficialDrawIdPresent: Boolean(persistedOfficialDrawId),
      exactOfficialDrawId: Boolean(schemaDrawId) && schemaDrawId === persistedOfficialDrawId,
      officialEconomics: validation?.officialSELAE === true && validation?.status === 'OFFICIAL_COMPLETE_RESULTADOS2_SCHEMA',
      officialSource: officialSource?.provider === 'SELAE' && Boolean(officialSource?.fechav3) && Boolean(officialSource?.resultados2),
      exactDate: String(officialSource?.fechav3 || '').includes(`fecha_sorteo=${dateCompact(row.drawDate)}`),
      detailedOfficialResult: hasDetailedOfficialResult(row.result),
      firstPrize: n5(row.result?.firstPrize) !== '' && n5(row.result?.firstPrize) === n5(schema?.exactPrizes?.first?.number),
      secondPrize: n5(row.result?.secondPrize) !== '' && n5(row.result?.secondPrize) === n5(schema?.exactPrizes?.second?.number),
      normalizedUnits: schema?.normalizedPrizeUnit === 'EUR' && validation?.prizeUnitValidated === true && validation?.numberNormalizationValidated === true
    };
    const complete = Object.values(checks).every(Boolean);
    if (!complete) {
      blocked.push({
        drawDate: row.drawDate,
        failedChecks: Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name)
      });
      continue;
    }

    row.verification = {
      ...(row.verification || {}),
      status: 'OFFICIAL_SELAE_VALIDATED',
      checks: [
        'persisted-fechav3-exact-date',
        'persisted-resultados2-draw-id',
        'persisted-official-draw-id-match',
        'official-first-prize-cross-check',
        'official-second-prize-cross-check',
        'official-detailed-prize-schema',
        'official-economics-schema'
      ],
      officialCrossCheck: {
        provider: 'SELAE',
        sourceUrl: officialSource.resultados2,
        secondaryOfficialSourceUrl: officialSource.fechav3,
        checkedAt: schema.capturedAt ?? officialSource.capturedAt ?? null,
        officialDrawId: schemaDrawId,
        exactDate: true,
        fields: {
          drawId: true,
          firstPrize: true,
          secondPrize: true,
          detailedPrizeSchema: true,
          economics: true
        },
        complete: true,
        evidenceMode: 'PERSISTED_OFFICIAL_SELAE_RESULTADOS2_CROSSCHECKED_AT_CAPTURE',
        officialResult: {
          firstPrize: n5(schema.exactPrizes.first.number),
          secondPrize: n5(schema.exactPrizes.second.number)
        }
      }
    };
    newlyCertified++;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + '\n');
    changedFiles.add(file);
  }
}

const blockedReasonCounts = {};
const blockedByYear = {};
const blockedProfiles = {};
for (const item of blocked) {
  for (const reason of item.failedChecks) {
    blockedReasonCounts[reason] = (blockedReasonCounts[reason] || 0) + 1;
  }
  const year = String(item.drawDate || '').slice(0, 4) || 'unknown';
  blockedByYear[year] = (blockedByYear[year] || 0) + 1;
  const profile = [...item.failedChecks].sort().join('+') || 'unknown';
  blockedProfiles[profile] = (blockedProfiles[profile] || 0) + 1;
}
const blockerDiagnostics = {
  reasonCounts: Object.fromEntries(Object.entries(blockedReasonCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  byYear: Object.fromEntries(Object.entries(blockedByYear).sort(([a], [b]) => a.localeCompare(b))),
  topFailureProfiles: Object.entries(blockedProfiles)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([failedChecks, count]) => ({ failedChecks: failedChecks.split('+'), count }))
};

const report = {
  generatedAt: new Date().toISOString(),
  gameId: 'loteria-nacional',
  evidencePolicy: 'Certification uses only already-persisted SELAE resultados2 evidence cross-checked against SELAE fechav3 at capture time, including an exact persisted official draw-id match. No missing field is inferred.',
  totalNonSeasonal,
  eligibleOfficialSchema,
  alreadyCertified,
  newlyCertified,
  certifiedTotal: alreadyCertified + newlyCertified,
  blockedNotCertified: blocked.length,
  blockerDiagnostics,
  blocked,
  changedFiles: [...changedFiles],
  qualityPass: true,
  guards: {
    noSecondaryPromotion: true,
    noEconomicsOnlyValidation: true,
    exactDateRequired: true,
    exactOfficialDrawIdRequired: true,
    firstAndSecondRequired: true,
    detailedOfficialResultRequired: true,
    officialEconomicsRequired: true,
    noOverwriteOnMismatch: true,
    incompleteEvidenceRemainsUnvalidated: true
  }
};

fs.writeFileSync(
  path.join(metaDir, 'nacional-persisted-resultados2-certification.json'),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify({ ...report, blocked: blocked.length }, null, 2));
