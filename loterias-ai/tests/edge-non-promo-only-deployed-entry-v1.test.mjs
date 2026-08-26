import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Version-agnostic guard: whatever wrangler.jsonc's `main` currently points
// to (this Worker's versioned chain advances frequently - each new feature
// adds another index-vNN.mjs extending the previous one, so a test that
// hardcodes "vNN is deployed" goes stale on the very next version bump).
// This walks the real import chain from the deployed entry backwards and
// asserts two structural properties that must hold no matter how many
// versions have been added since NON_PROMO_ONLY was introduced at v30:
//   1. index-v30.mjs (which defines NON_PROMO_REJECTED_PATHS) is somewhere
//      in the deployed entry's transitive extends-chain.
//   2. no file in that chain re-declares or shadows one of the retired
//      promotional-research paths.
const SRC_DIR='loterias-ai/edge-backend/src';
const wrangler=fs.readFileSync(path.join('loterias-ai/edge-backend','wrangler.jsonc'),'utf8');
const mainMatch=wrangler.match(/"main"\s*:\s*"src\/([^"]+\.mjs)"/);
assert.ok(mainMatch, 'wrangler.jsonc must declare a main entry under src/');
const deployedFile=mainMatch[1];

const REJECTED_PATHS=[
  '/science/playuzu-welcome','/science/playuzu-current-account',
  '/science/jokerbet-stack','/science/jokerbet-promos',
  '/science/paf-group-promos','/science/pinata-points','/science/cgm-zero-deposit',
];

const chain=[];
let current=deployedFile;
const seen=new Set();
let reachedV30=false;
while(current && !seen.has(current)){
  // Check for v30 BEFORE pushing/processing, so `chain` never includes v30
  // itself - correct whether the deployed entry IS v30 directly (chain
  // stays empty) or reaches it several versions later. v30 is where the
  // interception lives - no need to also walk into v9-v29 (already
  // covered by their own tests, and known - see
  // edge-playuzu-current-account-evidence-v29.test.mjs - to still contain
  // the retired research this whole chain exists to gate).
  if(current==='index-v30.mjs'){reachedV30=true;break;}
  seen.add(current);
  chain.push(current);
  const filePath=path.join(SRC_DIR,current);
  assert.ok(fs.existsSync(filePath), `${current} (in the deployed extends-chain) must exist on disk`);
  const source=fs.readFileSync(filePath,'utf8');
  const extendsMatch=source.match(/from\s+['"]\.\/(index-v\d+\.mjs)['"]/);
  current=extendsMatch?extendsMatch[1]:null;
}

assert.ok(reachedV30,
  `deployed entry ${deployedFile}'s extends-chain must reach index-v30.mjs (found chain: ${chain.join(' -> ')}${current?` -> ${current}`:''})`);

// `chain` holds every version STRICTLY BETWEEN the deployed entry and v30
// (the walk stops as soon as it finds v30, so v30 itself and everything
// before it - e.g. v29, which legitimately still contains these paths in
// its own immutable historical file - are never included here). Every one
// of those in-between versions must not re-declare or shadow a retired path.
for(const versionFile of chain){
  const source=fs.readFileSync(path.join(SRC_DIR,versionFile),'utf8');
  for(const rejected of REJECTED_PATHS){
    assert.ok(!source.includes(`'${rejected}'`),
      `${versionFile} (in the deployed extends-chain) must not re-declare the retired promotional path ${rejected}`);
  }
}

console.log(`edge-non-promo-only-deployed-entry-v1.test.mjs: PASS (deployed=${deployedFile}, chain=${chain.join(' -> ')})`);
