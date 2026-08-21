import assert from 'node:assert/strict';
import { classifyNetwork } from '../casino/jackpots/winfall-passive-network-triangulation-v2.mjs';

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
