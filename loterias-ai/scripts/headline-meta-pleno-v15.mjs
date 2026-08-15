import fs from 'node:fs';
const j=JSON.parse(fs.readFileSync('loterias-ai/data/research/meta-pleno-v15-set-capture.json','utf8'));
const out={generatedAt:new Date().toISOString(),engine:j.engine,games:{},realMoneyPass:false};
for(const [game,g] of Object.entries(j.games||{})){
  const rows=(g.top||[]);
  const pick=(cmp)=>[...rows].sort(cmp)[0]||null;
  const min=r=>r?{specId:r.specId,setSize:r.setSize,combinations:r.combinations,costPerDrawEUR:r.costPerDrawEUR,all:r.all,minus1:r.minus1,high:r.high,byYear:r.byYear,trainHigh:r.selection?.train?.high??null,validationHigh:r.selection?.validation?.high??null,validationAll:r.selection?.validation?.captureAll??null}:null;
  out.games[game]={best:min(rows[0]),mostFull:min(pick((a,b)=>b.all-a.all||b.minus1-a.minus1||a.costPerDrawEUR-b.costPerDrawEUR)),mostNear:min(pick((a,b)=>b.minus1-a.minus1||b.all-a.all||a.costPerDrawEUR-b.costPerDrawEUR)),cheapestHigh:min(pick((a,b)=>(b.high>0)-(a.high>0)||a.costPerDrawEUR-b.costPerDrawEUR||b.high-a.high))};
}
fs.writeFileSync('loterias-ai/data/research/meta-pleno-v15-headline.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));