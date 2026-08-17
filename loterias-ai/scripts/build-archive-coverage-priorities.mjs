import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('loterias-ai/data/archive/manifest.json','utf8'));
const auditPath='loterias-ai/data/archive/_meta/archive-audit.json';
let audit=null;try{audit=JSON.parse(fs.readFileSync(auditPath,'utf8'))}catch{}
const games=Object.entries(manifest.games||{}).map(([gameId,g])=>{
  const records=Number(g.records)||0,validated=Number(g.validatedRecords)||0,economics=Number(g.economicsRecords)||0;
  const validationGap=Math.max(0,records-validated),economicsGap=Math.max(0,records-economics);
  const a=audit?.games?.[gameId]||{};
  const officialEconomics=Number(a.officialEconomicsRecords)||0;
  const officialEconomicsGap=Math.max(0,records-officialEconomics);
  const openOfficialConflicts=Number(a.openOfficialConflicts)||0;
  const score=validationGap*5+officialEconomicsGap*3+economicsGap+openOfficialConflicts*10000;
  return {gameId,records,validatedRecords:validated,validationCoverage:records?validated/records:0,validationGap,economicsRecords:economics,economicsCoverage:records?economics/records:0,economicsGap,officialEconomicsRecords:officialEconomics,officialEconomicsCoverage:records?officialEconomics/records:0,officialEconomicsGap,openOfficialConflicts,priorityScore:score};
}).sort((a,b)=>b.priorityScore-a.priorityScore||b.records-a.records);
const payload={generatedAt:new Date().toISOString(),schemaVersion:1,principle:'Prioritize missing authoritative validation/provenance; never infer validation from economics alone.',manifestGeneratedAt:manifest.generatedAt,auditGeneratedAt:audit?.generatedAt||null,totals:{records:Number(manifest?.totals?.records)||0,validatedRecords:Number(manifest?.totals?.validatedRecords)||0,validationGap:(Number(manifest?.totals?.records)||0)-(Number(manifest?.totals?.validatedRecords)||0),economicsRecords:Number(manifest?.totals?.economicsRecords)||0},priorities:games,topPriority:games[0]||null};
fs.mkdirSync('loterias-ai/data/archive/_meta',{recursive:true});fs.writeFileSync('loterias-ai/data/archive/_meta/archive-coverage-priorities.json',JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({totals:payload.totals,top:games.slice(0,6).map(x=>({gameId:x.gameId,validationGap:x.validationGap,officialEconomicsGap:x.officialEconomicsGap,score:x.priorityScore}))},null,2));
