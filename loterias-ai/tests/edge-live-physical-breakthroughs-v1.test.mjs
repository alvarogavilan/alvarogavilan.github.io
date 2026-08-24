import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildBreakthroughCards,buildCombinedBreakthroughCards,cardHtml} from '../edge-live/research-breakthroughs-v1.mjs';

const online=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-igt-persistent-state-candidates-v1.json','utf8'));
const physical=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-igt-physical-variable-state-v1.json','utf8'));

const physicalCards=buildBreakthroughCards(physical);
assert.equal(physicalCards.length,2);
assert.deepEqual(physicalCards.map(x=>x.game),['Scarab','Ocean’s Magic']);
for(const c of physicalCards){
  assert.equal(c.action,'NO_PLAY');
  assert.equal(c.sourceType,'PHYSICAL');
  assert.equal(c.status,'P0 · FÍSICO ESPAÑA');
  assert.equal(c.crossPlayerVerified,false);
  assert.equal(c.preWagerVisibleVerified,false);
  assert.equal(c.decisiveBlocker,'FALTA_FINGERPRINT_LOCAL_SIN_APOSTAR');
  const html=cardHtml(c);
  assert.match(html,/CASINO FÍSICO/);
  assert.match(html,/NO ES SEÑAL DE APUESTA/);
  assert.match(html,/LOCAL: POR CERRAR/);
  assert.match(html,/RTP PUBLICADO<\/small><b>—<\/b>/);
  assert.match(html,/APUESTA MÍN\.<\/small><b>—<\/b>/);
  assert.doesNotMatch(html,/0,00\s*€/);
  assert.doesNotMatch(html,/0\.00%/);
  assert.doesNotMatch(html,/JUGAR AHORA/);
}

const scarab=physicalCards.find(x=>x.game==='Scarab');
assert.ok(scarab);
assert.equal(scarab.globalInheritedStateDocumented,true);
assert.match(scarab.strongFinding,/título exacto Scarab/);

const combined=buildCombinedBreakthroughCards([online,physical]);
assert.equal(combined.length,4);
assert.equal(combined.filter(x=>x.sourceType==='PHYSICAL').length,2);
assert.equal(combined.filter(x=>x.sourceType==='ONLINE').length,2);
assert.ok(combined.every(x=>x.action==='NO_PLAY'));

console.log('edge-live-physical-breakthroughs-v1.test.mjs: PASS');
