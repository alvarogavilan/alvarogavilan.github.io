#!/usr/bin/env node
// Targeted read-only probe of the shared jackpot components discovered by the
// complete global mustDropWithin scan. It looks for branch vocabulary and
// fixed ID-list candidates, while recording explicit target/fetch coverage so
// a missing finding cannot be mistaken for a complete negative result.
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-jackpots-shared-component-idlists-probe-v1.json';
const ORIGIN = 'https://www.botemania.es';
const UA = 'loterias-ai-jackpots-shared-component-idlists-probe/1.1';
const headers = { accept: 'text/html,application/javascript,*/*', 'user-agent': UA, 'cache-control': 'no-cache' };

async function fetchText(url, accept) {
  const r = await fetch(url, {
    headers: { ...headers, accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  const text = await r.text();
  return { r, text };
}

const { r: home, text: homeText } = await fetchText(`${ORIGIN}/`, 'text/html,*/*');
if (!home.ok) throw new Error(`HOME_HTTP_${home.status}`);
const runtimeMatch = homeText.match(/(?:src=["'])([^"']*\/runtime\.[a-f0-9]+\.js)/i);
const runtimeUrl = runtimeMatch ? new URL(runtimeMatch[1], ORIGIN).href : `${ORIGIN}/es/runtime.88e5d9042d77e378fcb1.js`;
const { r: rr, text: runtime } = await fetchText(runtimeUrl, 'application/javascript,*/*');
if (!rr.ok) throw new Error(`RUNTIME_HTTP_${rr.status}`);

const pairs = [];
for (const m of runtime.matchAll(/(\d+):["']([^"']+)["']/g)) pairs.push({ id: m[1], value: m[2] });
const names = new Map(), hashes = new Map();
for (const p of pairs) {
  if (/^[a-f0-9]{16,40}$/i.test(p.value)) hashes.set(p.id, p.value);
  else if (/[A-Za-z]/.test(p.value)) names.set(p.id, p.value);
}
const all = [];
for (const [id, name] of names) {
  const hash = hashes.get(id);
  if (!hash) continue;
  all.push({ id, name, hash, url: `${ORIGIN}/es/${name}.${hash}.js` });
}
const uniq = [...new Map(all.map((x) => [x.url, x])).values()].filter((x) => /^[a-z0-9~_.-]+$/i.test(x.name));
if (!uniq.length) throw new Error('RUNTIME_MANIFEST_PARSE_EMPTY');

const EXPECTED_TARGET_NAMES = [
  'vendors~albatross-common-components-dist-components-Jackpots',
  'albatross-common-components-dist-components-MustDropWithin',
  'containers-BlueprintJackpots-index-js',
];
const targets = uniq.filter((x) => EXPECTED_TARGET_NAMES.includes(x.name));
const missingTargetNames = EXPECTED_TARGET_NAMES.filter((name) => !targets.some((t) => t.name === name));

const NEEDLES = ['blueprint', 'daily', 'hourly', 'quick', 'weekly', 'redtiger', 'red tiger', 'BlueprintTile', 'DoubleTile', 'getSettings'];
const chunks = [];
const fetchFailures = [];
const findings = [];
const idListCandidates = [];
for (const t of targets) {
  try {
    const { r, text } = await fetchText(t.url, 'application/javascript,*/*');
    if (!r.ok) {
      fetchFailures.push({ id: t.id, name: t.name, url: t.url, httpStatus: r.status, error: `HTTP_${r.status}` });
      continue;
    }
    chunks.push({ id: t.id, name: t.name, url: t.url, httpStatus: r.status, bytes: text.length, sha256: crypto.createHash('sha256').update(text).digest('hex') });
    const lower = text.toLowerCase();
    for (const needle of NEEDLES) {
      let p = 0, c = 0;
      const needleLower = needle.toLowerCase();
      while (c < 10) {
        const i = lower.indexOf(needleLower, p);
        if (i < 0) break;
        findings.push({ chunk: t.name, needle, index: i, context: text.slice(Math.max(0, i - 300), Math.min(text.length, i + needle.length + 500)) });
        p = i + needle.length;
        c++;
      }
    }
    for (const m of text.matchAll(/[A-Za-z_$][\w$]*\s*=\s*\[(?:"[^"]{1,40}"|'[^']{1,40}')(?:\s*,\s*(?:"[^"]{1,40}"|'[^']{1,40}')){1,20}\]/g)) {
      idListCandidates.push({ chunk: t.name, index: m.index, text: m[0].slice(0, 500) });
    }
  } catch (e) {
    fetchFailures.push({ id: t.id, name: t.name, url: t.url, httpStatus: null, error: String(e?.name || e?.message || e) });
  }
}

const scanComplete = missingTargetNames.length === 0 && fetchFailures.length === 0 && chunks.length === EXPECTED_TARGET_NAMES.length;
const out = {
  version: 'botemania-jackpots-shared-component-idlists-probe-v1.1-coverage-safe',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  runtime: { url: runtimeUrl, httpStatus: rr.status, bytes: runtime.length, sha256: crypto.createHash('sha256').update(runtime).digest('hex') },
  coverage: {
    expectedTargetNames: EXPECTED_TARGET_NAMES,
    expectedTargetCount: EXPECTED_TARGET_NAMES.length,
    matchedTargetCount: targets.length,
    missingTargetNames,
    fetchSuccessCount: chunks.length,
    fetchFailureCount: fetchFailures.length,
    fetchFailures,
    scanComplete,
  },
  chunks,
  findingsCount: findings.length,
  findings,
  idListCandidateCount: idListCandidates.length,
  idListCandidates: idListCandidates.slice(0, 100),
  decision: {
    anyBlueprintVsDoubleBranchEvidence: findings.some((f) => f.needle === 'blueprint'),
    anyDailyHourlyQuickVocabularyFound: findings.some((f) => ['daily', 'hourly', 'quick', 'weekly'].includes(f.needle)),
    idListCandidatesRequireManualReview: idListCandidates.length > 0,
    negativeFindingInterpretable: scanComplete,
    hypothesisResolved: null,
    realMoneyAllowed: false,
  },
  guards: {
    incompleteCoverageCannotBeStrongNegativeEvidence: true,
    publicStaticBundlesOnly: true,
    sameOperatorHostOnly: true,
    noGraphqlIntrospection: true,
    noMutation: true,
    noAuthentication: true,
    noCookies: true,
    noAutoPromotionFromHeuristicScan: true,
    noBetting: true,
    realMoneyAllowed: false,
  },
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ coverage: out.coverage, findingsCount: out.findingsCount, idListCandidateCount: out.idListCandidateCount, decision: out.decision }, null, 2));
