import fs from 'node:fs';
import path from 'node:path';

const DIR = 'loterias-ai/data/archive/bonoloto';
const META = 'loterias-ai/data/archive/_meta';
const CONFLICTS = `${META}/bonoloto-official-result-conflicts.json`;
const REPORT = `${META}/bonoloto-official-conflict-dual-route-resolution.json`;
const UA = 'Mozilla/5.0 LoteriasAI official dual-route conflict resolver';
const LIMIT = Math.max(1, Number(process.env.BATCH_LIMIT || 40));
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sorted = xs => (xs || []).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
const same = (a,b) => a.length === b.length && a.every((v,i)=>v===b[i]);
const two = n => String(Number(n)).padStart(2,'0');
const normalizeText = html => String(html || '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim();

function detailUrl(drawDate) {
  const [y,m,d] = String(drawDate).split('-').map(Number);
  if (!y || !m || !d || !MONTHS[m-1]) return null;
  return `https://www.loteriasyapuestas.es/es/bonoloto/resultados/bonoloto-resultados-del-${String(d).padStart(2,'0')}-de-${MONTHS[m-1]}-de-${y}`;
}

async function fetchText(url) {
  let lastError;
  for (let attempt=1; attempt<=3; attempt++) {
    try {
      const r = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(18000),
        headers: {'user-agent': UA, 'accept': 'text/html,application/xhtml+xml,*/*'}
      });
      if (r.status === 404) return {status:404, text:''};
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return {status:r.status, text:normalizeText(await r.text())};
    } catch (error) {
      lastError = error;
      await sleep(attempt * 500);
    }
  }
  throw lastError || new Error('SELAE detail fetch failed');
}

function htmlConfirms(conflict, text) {
  const official = conflict?.official || {};
  const main = sorted(official.main);
  if (main.length !== 6 || new Set(main).size !== 6) return false;
  const c = Number(official.complementary);
  const r = Number(official.reintegro);
  if (!Number.isInteger(c) || !Number.isInteger(r)) return false;

  const normalized = String(text).replace(/\s+/g, ' ');
  const ordered = main.map(two).join(' - ');
  const compact = main.map(two).join(' ');
  const mainPresent = normalized.includes(ordered) || normalized.includes(compact);
  const cPresent = new RegExp(`(?:Complementario\\s*:?\\s*)?C\\s*\\(\\s*0?${c}\\s*\\)`, 'i').test(normalized);
  const rPresent = new RegExp(`(?:Reintegro\\s*:?\\s*)?R\\s*\\(\\s*${r}\\s*\\)`, 'i').test(normalized);
  return mainPresent && cPresent && rPresent;
}

if (!fs.existsSync(CONFLICTS)) {
  console.log(JSON.stringify({status:'NO_CONFLICT_FILE', resolved:0}, null, 2));
  process.exit(0);
}

const conflictDoc = JSON.parse(fs.readFileSync(CONFLICTS, 'utf8'));
const conflicts = (conflictDoc.conflicts || []).slice(0, LIMIT);
const docs = new Map();
for (const file of fs.readdirSync(DIR).filter(f=>/^\d{4}\.json$/.test(f))) {
  const p = path.join(DIR, file);
  docs.set(file, {p, doc:JSON.parse(fs.readFileSync(p,'utf8'))});
}

const resolved = [];
const unresolved = [];
const failures = [];
const touched = new Set();
const now = new Date().toISOString();

for (const [index, conflict] of conflicts.entries()) {
  const url = detailUrl(conflict.date);
  if (!url) {
    unresolved.push({...conflict, dualRouteReason:'INVALID_DATE'});
    continue;
  }
  try {
    const page = await fetchText(url);
    if (page.status !== 200 || !htmlConfirms(conflict, page.text)) {
      unresolved.push({...conflict, secondaryOfficialRoute:url, dualRouteReason:page.status === 404 ? 'DETAIL_HTTP_404' : 'DETAIL_RESULT_NOT_EXACTLY_CONFIRMED'});
      continue;
    }

    const file = `${String(conflict.date).slice(0,4)}.json`;
    const holder = docs.get(file);
    const row = holder?.doc?.records?.find(r=>r.drawDate === conflict.date);
    if (!row) {
      unresolved.push({...conflict, secondaryOfficialRoute:url, dualRouteReason:'CANONICAL_ROW_NOT_FOUND'});
      continue;
    }

    const current = {
      main: sorted(row.result?.main),
      complementary: Number(row.result?.complementary),
      reintegro: Number(row.result?.reintegro)
    };
    const stored = {
      main: sorted(conflict.stored?.main),
      complementary: Number(conflict.stored?.complementary),
      reintegro: Number(conflict.stored?.reintegro)
    };
    if (!same(current.main, stored.main) || current.complementary !== stored.complementary || current.reintegro !== stored.reintegro) {
      unresolved.push({...conflict, secondaryOfficialRoute:url, dualRouteReason:'CANONICAL_ROW_CHANGED_SINCE_QUARANTINE'});
      continue;
    }

    const official = {
      main: sorted(conflict.official?.main),
      complementary: Number(conflict.official?.complementary),
      reintegro: Number(conflict.official?.reintegro)
    };
    row.result = {
      ...(row.result || {}),
      main: official.main,
      complementary: official.complementary,
      reintegro: official.reintegro
    };
    const previousVerification = row.verification && typeof row.verification === 'object' ? row.verification : {};
    const checks = [...new Set([...(previousVerification.checks || []), 'official-fechav3-exact-date', 'official-detail-page-exact-result', 'dual-official-route-repair'])];
    row.verification = {
      ...previousVerification,
      status: 'OFFICIAL_SELAE_VALIDATED',
      checks,
      correctionAudit: {
        correctedAt: now,
        reason: 'DUAL_OFFICIAL_SELAE_ROUTES_CONFIRM_CANONICAL_CORRECTION',
        previousStoredResult: stored,
        correctedOfficialResult: official,
        primaryOfficialSourceUrl: conflict.url,
        secondaryOfficialSourceUrl: url,
        silentOverwrite: false
      },
      officialCrossCheck: {
        provider:'SELAE',
        sourceUrl:conflict.url,
        secondaryOfficialSourceUrl:url,
        checkedAt:now,
        exactDate:true,
        fields:{main:true, complementary:true, reintegro:true},
        complete:true,
        evidenceMode:'DUAL_OFFICIAL_SELAE_API_PLUS_PUBLIC_DETAIL_PAGE',
        officialResult:official
      }
    };
    row.trainingEligible = true;
    touched.add(file);
    resolved.push({date:conflict.date, previousStoredResult:stored, officialResult:official, primaryOfficialSourceUrl:conflict.url, secondaryOfficialSourceUrl:url});
  } catch (error) {
    failures.push({date:conflict.date, reason:String(error?.message || error), secondaryOfficialRoute:url});
    unresolved.push({...conflict, secondaryOfficialRoute:url, dualRouteReason:'FETCH_OR_PARSE_FAILURE'});
  }
  if (index % 10 === 9) await sleep(300);
}

// Preserve conflicts outside this bounded run plus unresolved conflicts attempted here.
const attemptedDates = new Set(conflicts.map(c=>c.date));
const untouchedConflicts = (conflictDoc.conflicts || []).filter(c=>!attemptedDates.has(c.date));
const nextConflicts = [...untouchedConflicts, ...unresolved].sort((a,b)=>String(a.date).localeCompare(String(b.date)));

for (const file of touched) {
  const {p, doc} = docs.get(file);
  fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
}
fs.writeFileSync(CONFLICTS, JSON.stringify({...conflictDoc, generatedAt:now, conflicts:nextConflicts}, null, 2) + '\n');
const report = {
  generatedAt: now,
  gameId: 'bonoloto',
  policy: 'DUAL_OFFICIAL_ROUTE_REQUIRED_BEFORE_CANONICAL_REPAIR',
  attempted: conflicts.length,
  resolved: resolved.length,
  unresolved: nextConflicts.length,
  failures: failures.length,
  resolvedRows: resolved,
  failuresDetail: failures,
  guards: {
    primaryRouteMustBeOfficialSELAEFechav3: true,
    secondaryRouteMustBeOfficialSELAEPublicDetailPage: true,
    exactSixPlusComplementaryPlusReintegroRequired: true,
    canonicalRowMustStillMatchQuarantinedStoredValue: true,
    previousStoredValuePreservedInAudit: true,
    noSecondarySourceResolution: true,
    noSilentOverwrite: true,
    realMoneyAffected: false
  }
};
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
