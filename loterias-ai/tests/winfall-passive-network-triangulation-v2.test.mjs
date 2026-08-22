import assert from 'node:assert/strict';
import { classifyNetwork, TARGETS, CONTROLS } from '../casino/jackpots/winfall-passive-network-triangulation-v2.mjs';

assert.deepEqual(TARGETS,['winfall-wishes-jackpot','wonderland','tiki-templo']);
assert.deepEqual(CONTROLS,['paper-wins-jackpot','bote-de-secretos-del-fenix']);
assert.ok(!TARGETS.includes('la-isla-de-tiki'),'La Isla de Tiki is not the Tiki Templo shared partner');

const targets=['a','b','c'],controls=['x','y'];
const mk=(slug,hits)=>({slug,hits});
const eligible=id=>({id,operation:'pageJackpot',discoveryEligible:true});
const global=id=>({id,operation:'loadJackpots',discoveryEligible:true});

assert.deepEqual(classifyNetwork([
  mk('a',[eligible('GOOD')]),mk('b',[eligible('GOOD')]),mk('c',[eligible('GOOD')]),mk('x',[]),mk('y',[])
],{targets,controls}),[{id:'GOOD',targetPages:targets,controlPages:[]}]);

assert.deepEqual(classifyNetwork([
  mk('a',[eligible('LEAK')]),mk('b',[eligible('LEAK')]),mk('c',[eligible('LEAK')]),mk('x',[eligible('LEAK')]),mk('y',[])
],{targets,controls}),[],'control reproduction must kill candidate');

assert.deepEqual(classifyNetwork([
  mk('a',[global('GLOBAL')]),mk('b',[global('GLOBAL')]),mk('c',[global('GLOBAL')]),mk('x',[]),mk('y',[])
],{targets,controls}),[],'global loadJackpots can never map identity');

assert.deepEqual(classifyNetwork([
  mk('a',[eligible('PARTIAL')]),mk('b',[eligible('PARTIAL')]),mk('c',[]),mk('x',[]),mk('y',[])
],{targets,controls}),[],'all three linked pages are required');

console.log('winfall-passive-network-triangulation-v2.test.mjs: PASS');
