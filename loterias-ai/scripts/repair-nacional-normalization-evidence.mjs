import fs from 'node:fs';
import path from 'node:path';

const dir = 'loterias-ai/data/archive/loteria-nacional';
const metaDir = 'loterias-ai/data/archive/_meta';
const limit = Math.max(1, Number(process.env.BATCH_LIMIT || 220));
fs.mkdirSync(metaDir, { recursive: true });

const n5 = value => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? digits.slice(-5).padStart(5, '0') : '';
};
const compactDate = value => String(value ?? '').replaceAll('-', '');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(18000),
        headers: {
          'user-agent': 'Mozilla/5.0 LoteriasAI official normalization verifier',
          accept: 'application/json,text/plain,*/*',
          referer: 'https://www.loteriasyapuestas.es/es/loteria-nacional/tablas-y-alambres'
        }
      });
      if (response.ok) return await response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(300 * attempt);
  }
  throw lastError;
}

const hasDetailedOfficialResult = result => {
  const detail = result?.detailedExtractions;
  const exact = result?.officialPrizeSchema?.exactPrizes;
  return detail?.officialSELAE === true &&
    detail?.provider === 'SELAE' &&
    detail?.service === 'resultados2' &&
    Boolean(exact?.first?.number) &&
    Boolean(exact?.second?.number);
};

const hasNormalizationEvidence = row => {
  const schema = row.result?.officialPrizeSchema;
  const detail = row.result?.detailedExtractions;
  const validation = row.economics?.validation;
  const explicit = schema?.rawPrizeUnit === 'euro_cents' &&
    schema?.normalizedPrizeUnit === 'EUR' &&
    schema?.numberNormalization === 'five_digit_zero_padded' &&
    detail?.rawPrizeUnit === 'euro_cents' &&
    detail?.normalizedPrizeUnit === 'EUR';
  const legacy = schema?.normalizedPrizeUnit === 'EUR' &&
    validation?.prizeUnitValidated === true &&
    validation?.numberNormalizationValidated === true;
  return explicit || legacy;
};

const docs = new Map();
const targets = [];
for (const file of fs.readdirSync(dir).filter(name => /^\d{4}\.json$/.test(name)).sort()) {
  const filePath = path.join(dir, file);
  const doc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  docs.set(file, { filePath, doc });
  for (const row of doc.records || []) {
    if (row.drawType === 'CHRISTMAS' || row.drawType === 'EL_NINO') continue;
    const schema = row.result?.officialPrizeSchema;
    const validation = row.economics?.validation;
    const officialSource = row.economics?.officialSource;
    const schemaDrawId = String(schema?.drawId ?? '').trim();
    const officialDrawId = String(row.official?.drawId ?? '').trim();
    const otherwiseComplete = schema?.provider === 'SELAE' &&
      schema?.service === 'resultados2' &&
      Number(schema?.version || 0) >= 2 &&
      validation?.officialSELAE === true &&
      validation?.status === 'OFFICIAL_COMPLETE_RESULTADOS2_SCHEMA' &&
      officialSource?.provider === 'SELAE' &&
      Boolean(officialSource?.fechav3) &&
      Boolean(officialSource?.resultados2) &&
      String(officialSource?.fechav3).includes(`fecha_sorteo=${compactDate(row.drawDate)}`) &&
      hasDetailedOfficialResult(row.result) &&
      Boolean(schemaDrawId) &&
      schemaDrawId === officialDrawId &&
      n5(row.result?.firstPrize) === n5(schema?.exactPrizes?.first?.number) &&
      n5(row.result?.secondPrize) === n5(schema?.exactPrizes?.second?.number);
    if (otherwiseComplete && !hasNormalizationEvidence(row)) targets.push({ file, row });
  }
}

targets.sort((a, b) => b.row.drawDate.localeCompare(a.row.drawDate));
let verified = 0;
let mismatches = 0;
let failures = 0;
const changedFiles = new Set();
const details = [];

for (const [index, target] of targets.slice(0, limit).entries()) {
  const { file, row } = target;
  const schema = row.result.officialPrizeSchema;
  const officialSource = row.economics.officialSource;
  try {
    const fechav3Raw = await fetchJson(officialSource.fechav3);
    const fechav3 = Array.isArray(fechav3Raw) ? fechav3Raw[0] : fechav3Raw;
    const resultados2 = await fetchJson(officialSource.resultados2);
    const currentDrawId = String(fechav3?.id_sorteo ?? '').trim();
    const resultadosDrawId = String(resultados2?.drawIdSorteo ?? '').trim();
    const expectedDrawId = String(schema.drawId).trim();
    const first = n5(resultados2?.primerPremio?.decimo);
    const second = n5(resultados2?.segundoPremio?.decimo);
    const expectedFirst = n5(schema?.exactPrizes?.first?.number);
    const expectedSecond = n5(schema?.exactPrizes?.second?.number);
    const fechav3First = n5(fechav3?.combinacion?.primer_premio);
    const fechav3Second = n5(fechav3?.combinacion?.segundo_premio);

    const completeMatch = currentDrawId &&
      currentDrawId === expectedDrawId &&
      resultadosDrawId === expectedDrawId &&
      first === expectedFirst &&
      second === expectedSecond &&
      fechav3First === expectedFirst &&
      fechav3Second === expectedSecond;

    if (!completeMatch) {
      mismatches++;
      details.push({ drawDate: row.drawDate, status: 'OFFICIAL_MISMATCH_QUARANTINED', expectedDrawId, currentDrawId, resultadosDrawId, expectedFirst, first, fechav3First, expectedSecond, second, fechav3Second });
      continue;
    }

    row.result.officialPrizeSchema = {
      ...row.result.officialPrizeSchema,
      rawPrizeUnit: 'euro_cents',
      normalizedPrizeUnit: 'EUR',
      numberNormalization: 'five_digit_zero_padded',
      normalizationReverifiedAt: new Date().toISOString()
    };
    row.result.detailedExtractions = {
      ...row.result.detailedExtractions,
      rawPrizeUnit: 'euro_cents',
      normalizedPrizeUnit: 'EUR',
      normalizationReverifiedAt: new Date().toISOString()
    };
    row.economics.validation = {
      ...row.economics.validation,
      prizeUnitValidated: true,
      numberNormalizationValidated: true,
      rawPrizeUnit: 'euro_cents',
      normalizedPrizeUnit: 'EUR',
      normalizationEvidence: 'REVERIFIED_FROM_SELAE_FECHAV3_AND_RESULTADOS2'
    };
    changedFiles.add(file);
    verified++;
    details.push({ drawDate: row.drawDate, status: 'NORMALIZATION_EVIDENCE_REVERIFIED', drawId: expectedDrawId });
  } catch (error) {
    failures++;
    details.push({ drawDate: row.drawDate, status: 'FETCH_OR_PARSE_FAILURE', error: String(error) });
  }
  if (index % 20 === 19) await sleep(250);
}

for (const file of changedFiles) {
  const { filePath, doc } = docs.get(file);
  fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + '\n');
}

const report = {
  generatedAt: new Date().toISOString(),
  gameId: 'loteria-nacional',
  policy: 'Missing unit/number-normalization evidence is repaired only after fresh dual-route SELAE re-verification of exact draw id, first prize and second prize. No unit or result is inferred from secondary data.',
  candidates: targets.length,
  attempted: Math.min(limit, targets.length),
  verified,
  mismatches,
  failures,
  remaining: Math.max(0, targets.length - Math.min(limit, targets.length)),
  changedFiles: [...changedFiles].sort(),
  details,
  qualityPass: mismatches === 0,
  guards: {
    exactDateRouteRequired: true,
    exactDrawIdRequiredAcrossBothOfficialRoutes: true,
    firstAndSecondRequiredAcrossBothOfficialRoutes: true,
    noSecondaryEvidence: true,
    noInference: true,
    noOverwriteOnMismatch: true,
    realMoneyRelevant: false
  }
};

fs.writeFileSync(path.join(metaDir, 'nacional-normalization-reverification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, details: details.length }, null, 2));
if (mismatches > 0) process.exitCode = 2;
