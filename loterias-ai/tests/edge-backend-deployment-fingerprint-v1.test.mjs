import assert from 'node:assert/strict';
import fs from 'node:fs';

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const source=fs.readFileSync('loterias-ai/edge-backend/src/index-v7.mjs','utf8');

assert.match(wrangler,/"main"\s*:\s*"src\/index-v7\.mjs"/);
assert.match(source,/DEPLOYMENT_FINGERPRINT='edge-sentinel-v7-science-fingerprint-20260824a'/);
for(const path of ['/health','/state','/science/status','/science/events'])assert.ok(source.includes(`'${path}'`));
assert.match(source,/scienceStatus:true/);
assert.match(source,/scienceEvents:true/);
assert.match(source,/executionContractFailClosed:true/);
assert.doesNotMatch(source,/TELEGRAM_BOT_TOKEN\s*=\s*['"][^'"]+['"]/);
assert.doesNotMatch(source,/chat[_-]?id\s*=\s*['"][^'"]+['"]/i);

console.log('edge-backend-deployment-fingerprint-v1.test.mjs: PASS');
