import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildBreakthroughCards,buildCombinedBreakthroughCards,cardHtml,ONLINE_ONLY,NON_PROMO_ONLY} from '../edge-live/research-breakthroughs-v1.mjs';

const evidence=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-igt-persistent-state-candidates-v1.json','utf8'));
const norse=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/aotgn-spain-live-deployment-targets-v1.json','utf8'));
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

const combined=buildCombinedBreakthroughCards([evidence,norse]);
assert.equal(combined.length,3);
const norseCard=combined.find(x=>x.kind==='NORSE_P0');
assert.ok(norseCard);
assert.equal(norseCard.action,'NO_PLAY');
assert.equal(norseCard.sourceType,'ONLINE');
assert.equal(norseCard.promotion,false);
assert.equal(norseCard.closedGates,4);
assert.equal(norseCard.totalGates,9);
assert.equal(norseCard.configurationClosed,4);
assert.equal(norseCard.configurationTotal,4);
assert.equal(norseCard.liveClosed,0);
assert.equal(norseCard.liveTotal,5);
assert.equal(norseCard.dailyConfiguredDeploymentVerified,true);
assert.equal(norseCard.spanishNetworkVerified,true);
assert.equal(norseCard.sameSessionDailyVerified,false);
const norseHtml=cardHtml(norseCard);
assert.match(norseHtml,/CONFIG \/ DESPLIEGUE/);
assert.match(norseHtml,/4\/4/);
assert.match(norseHtml,/ESTADO LIVE \/ TICKER/);
assert.match(norseHtml,/0\/5/);
assert.match(norseHtml,/RED ESPAÑA/);
assert.match(norseHtml,/NO ES SEÑAL DE APUESTA/);
assert.doesNotMatch(norseHtml,/JUGAR AHORA/);

console.log('edge-live-research-breakthroughs-v1.test.mjs: PASS');
