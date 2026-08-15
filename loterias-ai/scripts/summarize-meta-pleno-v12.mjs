import fs from 'node:fs';
// Triggered after MetaPleno v12 completed successfully.
const p='loterias-ai/data/research/meta-pleno-v12-multiyear-stability.json';
const j=JSON.parse(fs.readFileSync(p,'utf8'));
const out={generatedAt:new Date().toISOString(),engine:'MetaPleno-v12-summary',games:{},realMoneyPass:false};
for(const [g,v] of Object.entries(j.games||{})){
  const tests=(v.tests||[]).map(t=>({panelSize:t.panelSize,testFull:t.testFull,testHigh:t.testHigh,testByYear:t.testByYear,specIds:t.specIds,trainingDistinctYears:t.trainingDistinctYears}));
  tests.sort((a,b)=>b.testFull-a.testFull||b.testHigh-a.testHigh||a.panelSize-b.panelSize);
  const best=tests[0]||null;
  const stableSingle=(v.topTraining||[]).filter(x=>Object.values(x.years||{}).filter(y=>y.high>0).length>=2).slice(0,10).map(x=>({specId:x.specId,trainingYears:Object.entries(x.years||{}).filter(([,y])=>y.high>0).map(([y])=>Number(y)),trainingFull:Object.values(x.years||{}).reduce((s,y)=>s+(y.full||0),0),trainingHigh:Object.values(x.years||{}).reduce((s,y)=>s+(y.high||0),0)}));
  out.games[g]={candidatePool:v.candidatePool,stableSingleCount:(v.topTraining||[]).filter(x=>Object.values(x.years||{}).filter(y=>y.high>0).length>=2).length,stableSingles:stableSingle,bestTest:best,allTests:tests.map(x=>({panelSize:x.panelSize,testFull:x.testFull,testHigh:x.testHigh,testByYear:x.testByYear}))};
}
fs.writeFileSync('loterias-ai/data/research/meta-pleno-v12-summary.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));