import fs from 'node:fs';
import crypto from 'node:crypto';
const inputPath='loterias-ai/data/research/metapleno-v316-stage1-2-selection.json';
const outPath='loterias-ai/data/research/metapleno-v316-stage3-freeze.json';
const selection=JSON.parse(fs.readFileSync(inputPath,'utf8'));
if(selection.validationTouched!==false||selection.postFreezeTouched!==false||selection.retuningPerformed!==false) throw new Error('Stage1-2 temporal isolation was not preserved');
if(selection.realMoneyPass!==false||Number(selection.realStakeEUR)!==0) throw new Error('Stage1-2 real-money gate is not fail-closed');
const games=['bonoloto','primitiva','euromillones','gordo-primitiva'];
const frozenByGame={}; let frozenTotal=0;
for(const game of games){
  const source=selection.byGame?.[game]?.best;
  if(!Array.isArray(source)||source.length===0) throw new Error(`missing development candidates for ${game}`);
  const seen=new Set();
  const ranked=[...source].sort((a,b)=>Number(b.selection?.fullMain??0)-Number(a.selection?.fullMain??0)||Number(b.selection?.nearFull??0)-Number(a.selection?.nearFull??0)||Number(b.selection?.meanHits??0)-Number(a.selection?.meanHits??0)||Number(a.window)-Number(b.window)||Number(a.eps)-Number(b.eps)||String(a.cost).localeCompare(String(b.cost)));
  const chosen=[];
  for(const c of ranked){
    if(!c.behaviorHash||seen.has(c.behaviorHash)) continue;
    seen.add(c.behaviorHash);
    chosen.push({window:Number(c.window),eps:Number(c.eps),cost:String(c.cost),behaviorHash:String(c.behaviorHash),developmentEvidence:{draws:Number(c.selection?.draws??0),meanHits:Number(c.selection?.meanHits??0),nearFull:Number(c.selection?.nearFull??0),fullMain:Number(c.selection?.fullMain??0)}});
    if(chosen.length===8) break;
  }
  if(chosen.length===0) throw new Error(`no distinct frozen candidates for ${game}`);
  frozenByGame[game]=chosen; frozenTotal+=chosen.length;
}
if(frozenTotal>32) throw new Error(`freeze cap exceeded: ${frozenTotal}`);
const core={version:'v316-stage3',family:'OPTIMAL_TRANSPORT_REGIME_AUDIT',status:'FROZEN_READY_FOR_BLIND_OOS',source:'metapleno-v316-stage1-2-selection.json',sourceGeneratedAt:selection.generatedAt,selectionWindow:selection.selectionWindow,freezeProtocol:{developmentEnd:'2022-12-31',blindOosStart:'2023-01-01',blindOosEnd:'2024-12-31',postFreezeStart:'2025-01-01',maximumFrozenCandidatesPerGame:8,maximumFrozenCandidatesTotal:32,behavioralDeduplication:true,selectionRule:'development-only lexicographic ranking; deterministic ties',retuningAfterFreeze:false,futureInformationAllowed:false},frozenTotal,frozenByGame,validationTouched:false,postFreezeTouched:false,retuningPerformed:false,budget:{maximumTheoreticalCostEURPerGameDraw:15},realMoneyPass:false,realStakeEUR:0};
const manifestHash=crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex');
const out={...core,manifestHash,generatedAt:new Date().toISOString()};
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({frozenTotal,counts:Object.fromEntries(games.map(g=>[g,frozenByGame[g].length])),manifestHash,realMoneyPass:false,realStakeEUR:0},null,2));