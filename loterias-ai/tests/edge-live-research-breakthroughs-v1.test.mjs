import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildBreakthroughCards,cardHtml} from '../edge-live/research-breakthroughs-v1.mjs';

const oldEvidence=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-igt-persistent-state-candidates-v1.json','utf8'));
const oldCards=buildBreakthroughCards(oldEvidence);
assert.equal(oldEvidence.realMoneyAllowed,false);
assert.equal(oldCards.length,2);
assert.deepEqual(oldCards.map(x=>x.game),['Ocean Magic','Regal Riches']);
for(const c of oldCards){
  assert.equal(c.action,'NO_PLAY');
  assert.equal(c.status,'P0 · INVESTIGACIÓN');
  const html=cardHtml(c);
  assert.match(html,/NO ES SEÑAL DE APUESTA/);
  assert.doesNotMatch(html,/JUGAR AHORA/);
}

const evidence=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spain-direct-persistent-state-v2.json','utf8'));
const cards=buildBreakthroughCards(evidence);
assert.equal(evidence.realMoneyAllowed,false);
assert.equal(cards.length,3);
assert.deepEqual(cards.map(x=>x.game),['Magic of the Nile','SupaJax','Viking Queen']);
for(const c of cards){
  assert.equal(c.action,'NO_PLAY');
  const html=cardHtml(c);
  assert.match(html,/NO ES SEÑAL DE APUESTA/);
  assert.doesNotMatch(html,/JUGAR AHORA/);
}
const magic=cards.find(x=>x.game==='Magic of the Nile');
assert.equal(magic.signalMetric,'96,02%');
assert.match(magic.evidenceHeadline,/96,02%/);
assert.match(magic.crossPlayerText,/FÍSICO IGT: SÍ/);
const supa=cards.find(x=>x.game==='SupaJax');
assert.equal(supa.signalMetric,'120,20%');
assert.match(supa.crossPlayerText,/PENDIENTE/);
assert.match(supa.guard,/No se transfiere el 120,2% mundial a España/);
const viking=cards.find(x=>x.game==='Viking Queen');
assert.equal(viking.signalMetric,'96,92%');
assert.match(viking.evidenceHeadline,/DOS OPERADORES ESPAÑOLES/);
assert.match(viking.guard,/No se ha demostrado \+EV/);
console.log('edge-live-research-breakthroughs-v1.test.mjs: PASS');
