import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildConfiguredSource} from '../casino/jackpots/tiki-tropico-passive-network-v1.mjs';

const src=fs.readFileSync('loterias-ai/casino/jackpots/winfall-passive-network-triangulation-v2.mjs','utf8');
const out=buildConfiguredSource(src);
assert.match(out,/const TARGETS=\['la-isla-de-tiki-tropico-dorado'\]/);
assert.match(out,/const CONTROLS=\['winfall-wishes-jackpot','paper-wins-jackpot'\]/);
assert.doesNotMatch(out,/const TARGETS=\['winfall-wishes-jackpot','wonderland','la-isla-de-tiki'\]/);
assert.match(out,/\.tiki-tropico-passive-network-generated\.json/);
assert.match(out,/globalLoadJackpotsNeverIdentityProof:true/);
assert.match(out,/ambiguousGenericIdsExcluded:true/);
assert.match(out,/singleRunNeverVerifiesIdentity:true/);
console.log('tiki-tropico-passive-network-v1.test.mjs: PASS');
