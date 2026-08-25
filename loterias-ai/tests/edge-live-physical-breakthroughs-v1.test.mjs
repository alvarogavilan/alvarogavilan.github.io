import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildBreakthroughCards,buildCombinedBreakthroughCards,cardHtml} from '../edge-live/research-breakthroughs-v1.mjs';

const online=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-igt-persistent-state-candidates-v1.json','utf8'));
const physical=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-igt-physical-variable-state-v1.json','utf8'));

assert.deepEqual(buildBreakthroughCards(physical),[]);
const combined=buildCombinedBreakthroughCards([online,physical]);
assert.equal(combined.length,2);
assert.ok(combined.every(x=>x.sourceType==='ONLINE'));
assert.ok(combined.every(x=>x.promotion===false));
assert.ok(combined.every(x=>x.action==='NO_PLAY'));

const promoDataset={realMoneyAllowed:false,sourceType:'ONLINE',promotion:true,operator:{name:'Promo'},candidates:[{id:'x',game:'Bono'}]};
assert.deepEqual(buildBreakthroughCards(promoDataset),[]);

const promoCandidate={...online,candidates:[{...online.candidates[0],promotion:true},online.candidates[1]]};
assert.deepEqual(buildBreakthroughCards(promoCandidate).map(x=>x.game),['Regal Riches']);

const physicalTaggedCandidate={...online,candidates:[{...online.candidates[0],sourceType:'PHYSICAL'},online.candidates[1]]};
assert.deepEqual(buildBreakthroughCards(physicalTaggedCandidate).map(x=>x.game),['Regal Riches']);

assert.equal(cardHtml({sourceType:'PHYSICAL',game:'Scarab'}),'');
assert.equal(cardHtml({sourceType:'ONLINE',promotion:true,game:'Promo'}),'');

const source=fs.readFileSync('loterias-ai/edge-live/research-breakthroughs-v1.mjs','utf8');
assert.doesNotMatch(source,/spain-igt-physical-variable-state-v1\.json/);
assert.doesNotMatch(source,/function buildPhysicalCards/);
assert.doesNotMatch(source,/CASINO FÍSICO/);
assert.match(source,/0 FÍSICOS · 0 PROMOS/);

console.log('edge-live-physical-breakthroughs-v1.test.mjs: PASS');
