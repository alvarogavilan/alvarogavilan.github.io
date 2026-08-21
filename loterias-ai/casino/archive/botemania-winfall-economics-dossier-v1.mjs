#!/usr/bin/env node
// Entry point: reads the already-committed evidence files and writes the
// consolidated Winfall Wishes economics dossier (Priority #2). Zero
// network calls - pure reprocessing of text/data other real crawls already
// fetched, so it carries none of this environment's egress restrictions.
import fs from 'node:fs';
import { buildWinfallEconomicsDossier } from './botemania-winfall-economics-synthesis-v1.mjs';

const CENSUS = 'loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const PRIORITY = 'loterias-ai/casino/archive/evidence/botemania-zero-reset-priority-v1.json';
const TRIANGULATION = 'loterias-ai/casino/jackpots/evidence/winfall-shared-network-triangulation-v1.json';
const IDENTITY = 'loterias-ai/casino/jackpots/evidence/botemania-winfall-wishes-identity-binding-probe-v1.json';
const OUT = 'loterias-ai/casino/archive/evidence/botemania-winfall-economics-dossier-v1.json';

function readJson(path) {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); } catch { return null; }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const census = readJson(CENSUS);
  const priority = readJson(PRIORITY);
  const triangulation = readJson(TRIANGULATION);
  const identityBinding = readJson(IDENTITY);

  const dossier = buildWinfallEconomicsDossier({ census, priority, triangulation, identityBinding });
  const out = {
    version: 'botemania-winfall-economics-dossier-v1',
    generatedAt: new Date().toISOString(),
    operator: 'botemania-es',
    sources: {
      census: census ? { generatedAt: census.generatedAt } : null,
      priority: priority ? { generatedAt: priority.generatedAt } : null,
      triangulation: triangulation ? { generatedAt: triangulation.generatedAt } : null,
      identityBinding: identityBinding ? { generatedAt: identityBinding.generatedAt } : null,
    },
    dossier,
  };
  fs.mkdirSync('loterias-ai/casino/archive/evidence', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(dossier, null, 2));
}
