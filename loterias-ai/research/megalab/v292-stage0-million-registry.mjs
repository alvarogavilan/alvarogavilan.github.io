#!/usr/bin/env node
// v292 stage-0: deterministic virtual population; no historical outcome access.
import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';
const N=1048576,OUT='loterias-ai/data/research/metapleno-v292-million-registry.json';
const games=['bonoloto','primitiva','euromillones','gordo-primitiva'];
const schools=['symbolic','temporal','information','graph','regime','ensemble','combinatorial','topological','transport','spectral','causal-probe','adversarial'];
const memories=[7,15,30,60,120,240,365,730];const operators=['linear','ratio','rank','nonlinear','kernel','set','graph','sequence'];
const featureFamilies=['frequency','gap','cooccurrence','position','modular','entropy','motif','regime','distance','novelty','cross-game','synthetic'];
const buckets=new Map,schoolCounts={},gameCounts={},samples=[];let semanticCollisions=0;
function h(s){return crypto.createHash('sha256').update(s).digest('hex')}
function mix(i){let x=(i^0x9e3779b9)>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b)>>>0;x=Math.imul(x^(x>>>13),0xc2b2ae35)>>>0;return (x^(x>>>16))>>>0}
for(let i=0;i<N;i++){
 const x=mix(i),game=games[x&3],school=schools[(x>>>2)%schools.length],memory=memories[(x>>>6)%memories.length],op=operators[(x>>>9)%operators.length],f1=featureFamilies[(x>>>12)%featureFamilies.length],f2=featureFamilies[(x>>>16)%featureFamilies.length];
 const semantic=`${game}|${school}|${memory}|${op}|${[f1,f2].sort().join('+')}|${(x>>>20)&15}`;const key=h(semantic).slice(0,24);if(buckets.has(key))semanticCollisions++;else buckets.set(key,1);
 schoolCounts[school]=(schoolCounts[school]||0)+1;gameCounts[game]=(gameCounts[game]||0)+1;
 if(samples.length<64 && i%(N/64)===0)samples.push({scientistId:`M${String(i+1).padStart(7,'0')}`,game,school,memory,operator:op,features:[f1,f2],semanticId:key});
}
const out={version:'v292-stage0',family:'MILLION_SCIENTIST_VIRTUAL_REGISTRY',generatedAt:new Date().toISOString(),logicalScientists:N,materialization:'DETERMINISTIC_VIRTUAL_IDS',meaning:'Cada científico es una identidad lógica reproducible con especialización y firma semántica; no implica un proceso o empleado humano independiente.',games:gameCounts,schools:schoolCounts,uniqueSemanticCells:buckets.size,semanticCollisions,sampleScientists:samples,nextStage:{maxSemanticRepresentatives:131072,historyAccess:false,then:'ultra-cheap temporal screening'},realMoneyPass:false,realStakeEUR:0};fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({logicalScientists:N,uniqueSemanticCells:buckets.size,semanticCollisions},null,2));
