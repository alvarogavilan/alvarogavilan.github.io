import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildBreakthroughCards,cardHtml,ONLINE_ONLY,NON_PROMO_ONLY} from '../edge-live/research-breakthroughs-v1.mjs';

const evidence=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-igt-persistent-state-candidates-v1.json','utf8'));
const cards=buildBreakthroughCards(evidence);

assert.equal(ONLINE_ONLY,true);
assert.equal(NON_PROMO_ONLY,true);
assert.equal(evidence.realMoneyAllowed,false);
assert.equal(cards.length,2);
assert.deepEqual(cards.map(x=>x.game),['Ocean Magic','Regal Riches']);
for(const c of cards){
  assert.equal(c.action,'NO_PLAY');
  assert.equal(c.status,'P0 · INVESTIGACIÓN');
  assert.equal(c.sourceType,'ONLINE');
  assert.equal(c.promotion,false);
  assert.equal(c.crossPlayerVerified,false);
  assert.equal(c.preWagerVisibleVerified,false);
  assert.equal(c.decisiveBlocker,'FALTA_CONFIRMAR_ESTADO_COMPARTIDO_Y_VISIBLE_ANTES_DE_APOSTAR');
  const html=cardHtml(c);
  assert.match(html,/ONLINE · ESPAÑA/);
  assert.match(html,/NO ES SEÑAL DE APUESTA/);
  assert.match(html,/POR CERRAR/);
  assert.doesNotMatch(html,/CASINO FÍSICO/);
  assert.doesNotMatch(html,/JUGAR AHORA/);
}

assert.equal(cards.find(x=>x.game==='Ocean Magic')?.rtpPct,92.18);
assert.equal(cards.find(x=>x.game==='Regal Riches')?.rtpPct,94);
console.log('edge-live-research-breakthroughs-v1.test.mjs: PASS');
