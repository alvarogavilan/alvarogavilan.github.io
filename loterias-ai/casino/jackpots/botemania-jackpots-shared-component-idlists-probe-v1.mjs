#!/usr/bin/env node
// Carril A, continued: the global mustDropWithin scan (run on GitHub Actions
// after PR #191) found the deadline/countdown UI is NOT exclusive to
// DoubleJackpots - a separate, hooks-based, generic "Jackpots" component
// (vendors~albatross-common-components-dist-components-Jackpots) also reads
// jackpot.mustDropWithin, and picks WHICH jackpots to render via two fixed
// ID-list constants ("T" for type==="blueprint", "S" otherwise) that filter/
// reorder the raw jackpots array passed in as props - it does not add
// mustDropWithin itself, just displays it if present. This probe re-fetches
// that chunk (URL re-derived from runtime.js each run, since content hashes
// change on deploy) and searches specifically for the literal ID-list
// definitions and blueprint/daily/hourly/quickhit/redtiger vocabulary, to
// help falsify H1 (Apollo/cache enrichment elsewhere) vs H2 (property simply
// absent for Red Tiger rows) vs H3 (mustDropWithin only used by the
// Blueprint branch) as laid out in the current instruction.
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT = 'loterias-ai/casino/jackpots/evidence/botemania-jackpots-shared-component-idlists-probe-v1.json';
const ORIGIN = 'https://www.botemania.es';
const UA = 'loterias-ai-jackpots-shared-component-idlists-probe/1.0';
const headers = { accept: 'text/html,application/javascript,*/*', 'user-agent': UA, 'cache-control': 'no-cache' };

const home = await fetch(`${ORIGIN}/`, { headers, redirect: 'follow' });
const homeText = await home.text();
const runtimeMatch = homeText.match(/(?:src=["'])([^"']*\/runtime\.[a-f0-9]+\.js)/i);
const runtimeUrl = runtimeMatch ? new URL(runtimeMatch[1], ORIGIN).href : `${ORIGIN}/es/runtime.88e5d9042d77e378fcb1.js`;
const rr = await fetch(runtimeUrl, { headers: { ...headers, accept: 'application/javascript,*/*' }, redirect: 'follow' });
const runtime = await rr.text();

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

const TARGET_RE = /^(vendors~albatross-common-components-dist-components-Jackpots|albatross-common-components-dist-components-MustDropWithin|containers-BlueprintJackpots-index-js)$/;
const targets = uniq.filter((x) => TARGET_RE.test(x.name));

const NEEDLES = ['blueprint', 'daily', 'hourly', 'quick', 'weekly', 'redtiger', 'red tiger', 'BlueprintTile', 'DoubleTile', 'getSettings'];
const chunks = [];
const findings = [];
const idListCandidates = [];
for (const t of targets) {
  const r = await fetch(t.url, { headers: { ...headers, accept: 'application/javascript,*/*' }, redirect: 'follow' });
  const text = await r.text();
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
  // Array-literal candidates that look like fixed jackpot-ID lists: e.g. T=["...","..."] or similar short string-array assignments.
  for (const m of text.matchAll(/[A-Za-z_$][\w$]*\s*=\s*\[(?:"[^"]{1,40}"|'[^']{1,40}')(?:\s*,\s*(?:"[^"]{1,40}"|'[^']{1,40}')){1,20}\]/g)) {
    idListCandidates.push({ chunk: t.name, index: m.index, text: m[0].slice(0, 500) });
  }
}

const out = {
  version: 'botemania-jackpots-shared-component-idlists-probe-v1',
  generatedAt: new Date().toISOString(),
  operator: 'botemania-es',
  runtime: { url: runtimeUrl, httpStatus: rr.status, bytes: runtime.length, sha256: crypto.createHash('sha256').update(runtime).digest('hex') },
  targetsFetched: chunks.length,
  chunks,
  findingsCount: findings.length,
  findings,
  idListCandidateCount: idListCandidates.length,
  idListCandidates: idListCandidates.slice(0, 100),
  decision: {
    anyBlueprintVsDoubleBranchEvidence: findings.some((f) => f.needle === 'blueprint'),
    anyDailyHourlyQuickVocabularyFound: findings.some((f) => ['daily', 'hourly', 'quick', 'weekly'].includes(f.needle)),
    idListCandidatesRequireManualReview: idListCandidates.length > 0,
    hypothesisResolved: null, // H1/H2/H3 - never auto-set, requires manual/model read of findings + idListCandidates + the live query result
    realMoneyAllowed: false,
  },
  guards: {
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
console.log(JSON.stringify({ targetsFetched: out.targetsFetched, findingsCount: out.findingsCount, idListCandidateCount: out.idListCandidateCount, decision: out.decision }, null, 2));
