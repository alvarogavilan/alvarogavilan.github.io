import fs from 'node:fs';
const SOURCE='loterias-ai/scripts/meta-pleno-v115-bonoloto-independent-meta-stacker-budget8.mjs';
const AUDIT_OUT='loterias-ai/data/research/meta-pleno-v116-audit-v115-family-matched-null.json';
let src=fs.readFileSync(SOURCE,'utf8').replace(/^import fs from 'node:fs';\s*/, '');
const audit=String.raw`
const midPools=frozen.map(x=>mid.map(i=>pred(i,x.c)));
function fullStatsForShift(shift){
  const fullModel=new Uint8Array(frozen.length),fullDate=new Uint8Array(mid.length);
  let modelCount=0,dateCount=0;
  for(let m=0;m<frozen.length;m++){
    let any=false;
    for(let t=0;t<mid.length;t++){
      const target=sets[mid[(t+shift)%mid.length]],p=midPools[m][t];
      let h=0;for(const n of p)if(target.has(n))h++;
      if(h===6){any=true;fullDate[t]=1;}
    }
    if(any){fullModel[m]=1;modelCount++;}
  }
  for(const x of fullDate)dateCount+=x;
  return{uniqueFullDates:dateCount,fullModels:modelCount};
}
const observed=fullStatsForShift(0);let geUnique=0,geModels=0,geJoint=0,maxUnique=0,maxModels=0,sumUnique=0,sumModels=0;const shiftStats=[];
for(let s=0;s<mid.length;s++){
  const q=fullStatsForShift(s);sumUnique+=q.uniqueFullDates;sumModels+=q.fullModels;maxUnique=Math.max(maxUnique,q.uniqueFullDates);maxModels=Math.max(maxModels,q.fullModels);
  if(q.uniqueFullDates>=observed.uniqueFullDates)geUnique++;
  if(q.fullModels>=observed.fullModels)geModels++;
  if(q.uniqueFullDates>=observed.uniqueFullDates&&q.fullModels>=observed.fullModels)geJoint++;
  if(q.uniqueFullDates||q.fullModels)shiftStats.push({shift:s,...q});
}
const matchedNull={method:'Exact common circular shift of the 2023-2024 winning-set sequence. All 25 frozen v115 prediction sequences, cross-model dependence and calendar positions remain fixed.',draws:mid.length,shifts:mid.length,observed,geUnique,geModels,geJoint,pUnique:geUnique/mid.length,pModels:geModels/mid.length,pJoint:geJoint/mid.length,maxUniqueFullDates:maxUnique,maxFullModels:maxModels,meanUniqueFullDates:sumUnique/mid.length,meanFullModels:sumModels/mid.length};
const auditOut={generatedAt:new Date().toISOString(),engine:'MetaPleno-v116-audit-v115-family-matched-null',sourceEngine:'MetaPleno-v115-bonoloto-independent-meta-stacker-budget8',sourceFrozenEffectiveConfigurations:frozen.length,period:'2023-01-01..2024-12-31',matchedNull,observedFullEvents:[...new Set(frozen.flatMap(x=>x.mid.events.filter(e=>e.hits===6).map(e=>e.date)))].sort(),decision:matchedNull.pJoint<0.05?'SURVIVES_MATCHED_NULL_REQUIRES_NESTED_FREEZE':'DEPRIORITIZE_NOT_SIGNIFICANT_UNDER_MATCHED_NULL',realMoneyPass:false,realStakeEUR:0};
fs.writeFileSync(AUDIT_OUT,JSON.stringify(auditOut,null,2)+'\\n');console.log(JSON.stringify(auditOut,null,2));
`;
eval(src+'\n'+audit);
