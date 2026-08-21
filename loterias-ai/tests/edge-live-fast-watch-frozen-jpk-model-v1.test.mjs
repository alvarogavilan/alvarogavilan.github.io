import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/loterias-ai-edge-live-fast-watch-v1.yml','utf8');
const watchSection=workflow.split('- name: Persist last valid casino live state immediately')[0];

assert.match(watchSection,/node loterias-ai\/casino\/jackpots\/jpk-near-cap-current-refresh-v1\.mjs/);
assert.doesNotMatch(watchSection,/node loterias-ai\/casino\/jackpots\/botemania-jpk-near-cap-ev-scenarios-v1\.mjs/);
assert.ok(
  watchSection.indexOf('jpk-near-cap-current-refresh-v1.mjs') < watchSection.indexOf('botemania-jpk-live-gate-v1.mjs'),
  'live current refresh must run before the JPK live gate'
);

console.log('edge-live-fast-watch-frozen-jpk-model-v1.test.mjs: PASS');
