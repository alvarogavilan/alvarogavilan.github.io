import fs from 'node:fs';
const p='loterias-ai/data/research/meta-pleno-v15-set-capture.json';
const j=JSON.parse(fs.readFileSync(p,'utf8'));
const out={generatedAt:new Date().toISOString(),engine:j.engine,games:{},realMoneyPass:false};
for(const [game,g] of Object.entries(j.games||{})){
  const rows=(g.top||[]).slice(0,20).map(x=>({specId:x.specId,setSize:x.setSize,combinations:x.combinations,costPerDrawEUR:x.costPerDrawEUR,all:x.all,minus1:x.minus1,high:x.high,meanHits:x.meanHits,expectedAll:x.expectedAll,liftAll:x.liftAll,byYear:x.byYear,validation:x.selection?.validation,train:x.selection?.train,events:(x.events||[]).slice(0,12)}));
  out.games[game]={best:rows[0]||null,bestAll:[...rows].sort((a,b)=>b.all-a.all||b.minus1-a.minus1||a.costPerDrawEUR-b.costPerDrawEUR)[0]||null,bestMinus1:[...rows].sort((a,b)=>b.minus1-a.minus1||b.all-a.all||a.costPerDrawEUR-b.costPerDrawEUR)[0]||null,top20:rows};
}
fs.writeFileSync('loterias-ai/data/research/meta-pleno-v15-summary.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(out.games).map(([k,v])=>[k,{best:v.best&&{setSize:v.best.setSize,costPerDrawEUR:v.best.costPerDrawEUR,all:v.best.all,minus1:v.best.minus1,byYear:v.best.byYear},bestAll:v.bestAll&&{setSize:v.bestAll.setSize,costPerDrawEUR:v.bestAll.costPerDrawEUR,all:v.bestAll.all,minus1:v.bestAll.minus1},bestMinus1:v.bestMinus1&&{setSize:v.bestMinus1.setSize,costPerDrawEUR:v.bestMinus1.costPerDrawEUR,all:v.bestMinus1.all,minus1:v.bestMinus1.minus1}}])),null,2));