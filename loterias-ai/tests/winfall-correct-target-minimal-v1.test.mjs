import assert from 'node:assert/strict';
import fs from 'node:fs';

const files=[
  'loterias-ai/casino/jackpots/winfall-shared-network-triangulation-v1.mjs',
  'loterias-ai/casino/jackpots/winfall-passive-network-triangulation-v2.mjs',
  'loterias-ai/casino/jackpots/winfall-provider-network-metadata-v1.mjs',
];

for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  assert.match(src,/TARGETS\s*=\s*\['winfall-wishes-jackpot','wonderland','tiki-templo'\]/,`${file}: corrected target trio missing`);
  assert.ok(!/TARGETS\s*=\s*\[[^\]]*'la-isla-de-tiki'/.test(src),`${file}: distinct La Isla de Tiki leaked into TARGETS`);
  assert.ok(!/TARGETS\s*=\s*\[[^\]]*'la-isla-de-tiki-bote'/.test(src),`${file}: La Isla de Tiki Bote must not be silently substituted`);
  assert.match(src,/resolvedBotemaniaSlug:'tiki-templo'|correctTikiTemploSlugFrozenBeforeRun:true/,`${file}: provenance/target guard missing`);
}

console.log('winfall-correct-target-minimal-v1.test.mjs: PASS');
