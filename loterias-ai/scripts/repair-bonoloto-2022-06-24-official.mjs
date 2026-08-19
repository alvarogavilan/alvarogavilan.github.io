import fs from 'node:fs';

const archivePath = 'loterias-ai/data/archive/bonoloto/2022.json';
const conflictPath = 'loterias-ai/data/archive/_meta/bonoloto-official-conflicts.json';
const auditPath = 'loterias-ai/data/audits/bonoloto-2022-06-24-conflict.json';
const date = '2022-06-24';
const expectedStored = [1, 18, 20, 22, 33, 41];
const expectedOfficial = [10, 18, 20, 22, 33, 41];
const expectedComplementary = 49;
const expectedReintegro = 0;
const serviceUrl = 'https://www.loteriasyapuestas.es/servicios/fechav3?game_id=BONO&fecha_sorteo=20220624';
const pageUrl = 'https://www.loteriasyapuestas.es/es/bonoloto/resultados/bonoloto-resultados-del-24-de-junio-de-2022';

const key = values => [...(values || [])].map(Number).sort((a, b) => a - b).join('-');
const expectedStoredKey = key(expectedStored);
const expectedOfficialKey = key(expectedOfficial);

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 LoteriasAI dual-route guarded repair' },
    signal: AbortSignal.timeout(18000),
  });
  if (!response.ok) throw new Error(`SELAE HTTP ${response.status}: ${url}`);
  return response.text();
}

function parseOfficialPage(html) {
  const normalized = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const combo = normalized.match(/10\s*-\s*18\s*-\s*20\s*-\s*22\s*-\s*33\s*-\s*41/i);
  const complementary = normalized.match(/Complementario\s*:?\s*C?\s*\(?\s*(\d{1,2})\s*\)?/i);
  const reintegro = normalized.match(/Reintegro\s*:?\s*R?\s*\(?\s*(\d)\s*\)?/i);
  return {
    main: combo ? expectedOfficial : [],
    complementary: complementary ? Number(complementary[1]) : null,
    reintegro: reintegro ? Number(reintegro[1]) : null,
  };
}

const doc = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
const record = (doc.records || []).find(row => row.drawDate === date);
if (!record) throw new Error('Guard failed: target record missing');

const currentKey = key(record.result?.main);
if (currentKey === expectedOfficialKey && Number(record.result?.complementary) === expectedComplementary && Number(record.result?.reintegro) === expectedReintegro) {
  console.log(JSON.stringify({ repaired: false, alreadyResolved: true, date }, null, 2));
  process.exit(0);
}
if (currentKey !== expectedStoredKey || Number(record.result?.complementary) !== expectedComplementary || Number(record.result?.reintegro) !== expectedReintegro) {
  throw new Error(`Guard failed: stored record changed (${currentKey})`);
}

const serviceText = await fetchText(serviceUrl);
const serviceJson = JSON.parse(serviceText);
const serviceRow = Array.isArray(serviceJson) ? serviceJson[0] : null;
const serviceNumbers = String(serviceRow?.combinacion || '').match(/\d+/g)?.map(Number) || [];
const serviceMain = serviceNumbers.slice(0, 6);
const serviceComplementary = serviceNumbers[6];
const serviceReintegro = serviceNumbers[7];
if (key(serviceMain) !== expectedOfficialKey || Number(serviceComplementary) !== expectedComplementary || Number(serviceReintegro) !== expectedReintegro) {
  throw new Error(`Official service guard failed: ${key(serviceMain)} C${serviceComplementary} R${serviceReintegro}`);
}

const pageEvidence = parseOfficialPage(await fetchText(pageUrl));
if (key(pageEvidence.main) !== expectedOfficialKey || pageEvidence.complementary !== expectedComplementary || pageEvidence.reintegro !== expectedReintegro) {
  throw new Error(`Official page guard failed: ${key(pageEvidence.main)} C${pageEvidence.complementary} R${pageEvidence.reintegro}`);
}

if ((doc.records || []).some(row => row !== record && key(row.result?.main) === expectedOfficialKey)) {
  throw new Error('Guard failed: official combination duplicates another internal record');
}

const previous = {
  main: record.result.main,
  complementary: record.result.complementary,
  reintegro: record.result.reintegro,
  source: record.source,
};
record.result.main = [...expectedOfficial];
record.result.complementary = expectedComplementary;
record.result.reintegro = expectedReintegro;
record.source = {
  provider: 'SELAE_DUAL_ROUTE_CORRECTED_HISTORY',
  tier: 'official-repaired',
  validation: 'result-corrected-from-dual-official-conflict-audit',
  officialServiceUrl: serviceUrl,
  officialPageUrl: pageUrl,
  officialDrawId: serviceRow?.id_sorteo || null,
  capturedAt: new Date().toISOString(),
  previous,
};
record.trainingEligible = true;
delete record.economics;
delete record.official;
fs.writeFileSync(archivePath, JSON.stringify(doc, null, 2) + '\n');

if (fs.existsSync(conflictPath)) {
  const conflicts = JSON.parse(fs.readFileSync(conflictPath, 'utf8'));
  conflicts.conflicts = (conflicts.conflicts || []).filter(item => item.date !== date);
  conflicts.count = conflicts.conflicts.length;
  conflicts.generatedAt = new Date().toISOString();
  conflicts.resolved = [
    ...(conflicts.resolved || []).filter(item => item.date !== date),
    {
      date,
      resolvedAt: new Date().toISOString(),
      resolution: 'OFFICIAL_SELAE_DUAL_ROUTE_GUARDED_REPAIR',
      from: expectedStoredKey,
      to: expectedOfficialKey,
      officialServiceUrl: serviceUrl,
      officialPageUrl: pageUrl,
    },
  ];
  fs.writeFileSync(conflictPath, JSON.stringify(conflicts, null, 2) + '\n');
}

if (fs.existsSync(auditPath)) {
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  audit.verdict = 'RESOLVED_BY_DUAL_OFFICIAL_SELAE_EVIDENCE';
  audit.automaticCorrectionApplied = true;
  audit.resolution = {
    resolvedAt: new Date().toISOString(),
    from: expectedStored,
    to: expectedOfficial,
    complementary: expectedComplementary,
    reintegro: expectedReintegro,
    officialDrawId: serviceRow?.id_sorteo || null,
    officialServiceUrl: serviceUrl,
    officialPageUrl: pageUrl,
  };
  fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n');
}

console.log(JSON.stringify({
  repaired: true,
  date,
  from: expectedStoredKey,
  to: expectedOfficialKey,
  complementary: expectedComplementary,
  reintegro: expectedReintegro,
  officialDrawId: serviceRow?.id_sorteo || null,
  dualOfficialEvidence: true,
}, null, 2));
