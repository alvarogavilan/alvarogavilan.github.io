import assert from 'node:assert/strict';
import {findStateObjects,extractSemanticPrimitives,compareSharedSemantic,TARGETS,CONTROLS} from '../casino/jackpots/winfall-provider-network-metadata-v1.mjs';

assert.deepEqual(TARGETS,['winfall-wishes-jackpot','wonderland','tiki-templo']);
assert.deepEqual(CONTROLS,['paper-wins-jackpot','bote-de-secretos-del-fenix']);
assert.ok(!TARGETS.includes('la-isla-de-tiki'),'La Isla de Tiki is a different game and must never be the Winfall shared Tiki target');

const html='<script>window.__APOLLO_STATE__={"cfg":{"networkId":"NET-42","note":"brace } inside string"},"other":{"providerId":"roxor-gaming"}};</script>';
const blobs=findStateObjects(html);
assert.equal(blobs.length,1);
assert.equal(blobs[0].parsed?.cfg?.networkId,'NET-42');
const sem=extractSemanticPrimitives(blobs[0].parsed);
assert(sem.some(x=>x.key==='networkId'&&x.value==='NET-42'&&x.strongKey===true));

const row=(slug,values)=>({slug,semantic:values.map(([key,value,strongKey=true])=>({path:`$.${key}`,key,value,strongKey}))});
const targets=['a','b','c'],controls=['x','y'];
const rows=[
 row('a',[['networkId','NET-A'],['providerId','roxor-gaming',false]]),
 row('b',[['networkId','NET-A'],['providerId','roxor-gaming',false]]),
 row('c',[['networkId','NET-A'],['providerId','roxor-gaming',false]]),
 row('x',[['networkId','NET-X'],['providerId','roxor-gaming',false]]),
 row('y',[['networkId','NET-Y'],['providerId','roxor-gaming',false]])
];
assert.deepEqual(compareSharedSemantic(rows,{targets,controls}).map(x=>x.value),['net-a']);

const leaked=[...rows.filter(r=>r.slug!=='x'),row('x',[['networkId','NET-A']])];
assert.deepEqual(compareSharedSemantic(leaked,{targets,controls}),[],'control reproduction must reject shared candidate');

const weak=[row('a',[['progressiveLabel','SPECIAL',false]]),row('b',[['progressiveLabel','SPECIAL',false]]),row('c',[['progressiveLabel','SPECIAL',false]]),row('x',[]),row('y',[])];
assert.deepEqual(compareSharedSemantic(weak,{targets,controls}),[],'weak semantic labels must not become network config');

console.log('winfall-provider-network-metadata-v1.test.mjs: PASS');
