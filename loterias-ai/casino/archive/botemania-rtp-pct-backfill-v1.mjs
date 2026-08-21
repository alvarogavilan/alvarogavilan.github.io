#!/usr/bin/env node
// One-off backfill: re-derive rtpPcts for every already-committed census
// game entry from its already-stored rtpContexts using the fixed parser
// (botemania-rtp-pct-parser-v1.mjs). This is a pure, deterministic
// reprocessing of text the real crawler already fetched - no network call,
// so it carries none of this sandboxed session's egress restrictions and
// makes the fix visible immediately instead of waiting for the next
// scheduled live re-crawl (which will also naturally pick up the fix).
import fs from 'node:fs';
import { parseRtpPctsFromContexts } from './botemania-rtp-pct-parser-v1.mjs';

const CENSUS = 'loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const census = JSON.parse(fs.readFileSync(CENSUS, 'utf8'));

let changed = 0;
for (const g of census.games || []) {
  const before = JSON.stringify(g.rtpPcts || []);
  const after = parseRtpPctsFromContexts(g.rtpContexts);
  const afterStr = JSON.stringify(after);
  if (before !== afterStr) {
    console.log(`${g.slug}: ${before} -> ${afterStr}`);
    g.rtpPcts = after;
    changed++;
  }
}
census.summary = { ...census.summary, withRtp: (census.games || []).filter((x) => x.rtpPcts?.length).length };
fs.writeFileSync(CENSUS, JSON.stringify(census, null, 2) + '\n');
console.log(JSON.stringify({ gamesChanged: changed, totalGames: (census.games || []).length }, null, 2));
