import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOfficialExtractionOrder} from '../scripts/selae-extraction-order-backfill-v1.mjs';

const shell=(label,sorted,order)=>`<html><body><section><h2>${label}</h2><div>Ver por orden de aparición</div><ul>${sorted.map(n=>`<li>${String(n).padStart(2,'0')}</li>`).join('')}</ul><ul>${order.map(n=>`<li>${String(n).padStart(2,'0')}</li>`).join('')}</ul><div>C 10 R 2</div></section></body></html>`;

test('Bonoloto: preserves official appearance order as a strict permutation',()=>{
  const main=[7,13,27,29,37,39];
  const out=parseOfficialExtractionOrder(shell('Bonoloto',main,[13,39,27,7,37,29]),{game:'bonoloto',officialMain:main});
  assert.equal(out.ok,true);
  assert.deepEqual(out.extractionOrder,[13,39,27,7,37,29]);
  assert.equal(out.permutationExact,true);
  assert.deepEqual(out.positions,{p1:13,p2:39,p3:27,p4:7,p5:37,p6:29});
  assert.equal(out.execution.realMoneyAllowed,false);
});

test('Primitiva: preserves official appearance order independently of sorted main',()=>{
  const main=[5,17,20,23,31,41];
  const out=parseOfficialExtractionOrder(shell('La Primitiva',main,[31,5,17,41,23,20]),{game:'primitiva',officialMain:main});
  assert.equal(out.ok,true);
  assert.deepEqual(out.extractionOrder,[31,5,17,41,23,20]);
});

test('fails closed when second block is not an exact permutation',()=>{
  const main=[7,13,27,29,37,39];
  const out=parseOfficialExtractionOrder(shell('Bonoloto',main,[13,39,27,7,37,38]),{game:'bonoloto',officialMain:main});
  assert.equal(out.ok,false);
  assert.equal(out.reason,'EXPECTED_SORTED_AND_APPEARANCE_PERMUTATIONS_NOT_FOUND');
});

test('fails closed when no order marker exists',()=>{
  const out=parseOfficialExtractionOrder('<html>Bonoloto 07 13 27 29 37 39</html>',{game:'bonoloto',officialMain:[7,13,27,29,37,39]});
  assert.equal(out.ok,false);
  assert.equal(out.reason,'ORDER_MARKER_NOT_FOUND');
});
