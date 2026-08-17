#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const R = 'loterias-ai';
const src = JSON.parse(fs.readFileSync(path.join(R, 'data/research/metapleno-v309-stage1-2-selection.json')));
const g = src.byGame['gordo-primitiva'];
const candidates = (g.best || []).filter(x => x.mode === 'context1' && x.selection?.nearFull > 0);

const out = {
  version: 'v309-dense-freeze',
  family: 'MDL_COMPRESSION_SURPRISE',
  game: 'gordo-primitiva',
  candidateCount: candidates.length,
  candidateIds: candidates.map(x => x.scientistId),
  candidateParameters: candidates.map(({ scientistId, window, recent, alpha, mode, phase, behaviorHash }) => ({
    scientistId, window, recent, alpha, mode, phase, behaviorHash
  })),
  sourceEvidence: 'metapleno-v309-stage1-2-selection.json',
  sourceGeneratedAt: src.generatedAt,
  freezeRequired: true,
  validationTouched: false,
  postFreezeTouched: false,
  retuningPerformed: false,
  theoreticalBudgetEUR: 15,
  realMoneyPass: false,
  realStakeEUR: 0,
  next: candidates.length ? 'execute-immutable-dense-replay' : 'close-v309-no-eligible-candidate'
};

const p = path.join(R, 'data/research/metapleno-v309-dense-freeze-manifest.json');
fs.writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
