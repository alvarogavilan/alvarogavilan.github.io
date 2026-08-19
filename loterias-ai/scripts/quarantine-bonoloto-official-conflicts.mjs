import fs from 'node:fs';
import path from 'node:path';

const DIR='loterias-ai/data/archive/bonoloto';
const META='loterias-ai/data/archive/_meta';
const CONFLICTS=`${META}/bonoloto-official-result-conflicts.json`;
const REPORT=`${META}/bonoloto-official-conflict-quarantine.json`;

if(!fs.existsSync(CONFLICTS)){
  console.log(JSON.stringify({status:'NO_CONFLICT_FILE',quarantined:0},null,2));
  process.exit(0);
}

const conflictDoc=JSON.parse(fs.readFileSync(CONFLICTS,'utf8'));
const conflicts=new Map((conflictDoc.conflicts||[]).map(c=>[c.date,c]));
const touched=[];
let quarantined=0;

for(const file of fs.readdirSync(DIR).filter(f=>/^\d{4}\.json$/.test(f)).sort()){
  const p=path.join(DIR,file);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  let changed=false;
  for(const row of doc.records||[]){
    const conflict=conflicts.get(row.drawDate);
    if(!conflict)continue;
    const prev=row.verification&&typeof row.verification==='object'?row.verification:{};
    const checks=[...(Array.isArray(prev.checks)?prev.checks:[])];
    if(!checks.includes('official-selae-conflict-quarantined'))checks.push('official-selae-conflict-quarantined');
    const fields={
      main:JSON.stringify(conflict.stored?.main||[])===JSON.stringify(conflict.official?.main||[]),
      complementary:Number(conflict.stored?.complementary)===Number(conflict.official?.complementary),
      reintegro:Number(conflict.stored?.reintegro)===Number(conflict.official?.reintegro)
    };
    row.verification={
      ...prev,
      status:'OFFICIAL_CONFLICT_QUARANTINED',
      checks,
      officialCrossCheck:{
        provider:'SELAE',
        sourceUrl:conflict.url,
        checkedAt:conflictDoc.generatedAt||null,
        exactDate:true,
        fields,
        complete:false,
        conflictReason:conflict.reason,
        storedResult:conflict.stored,
        officialResult:conflict.official
      }
    };
    row.trainingEligible=false;
    changed=true;
    quarantined++;
  }
  if(changed){fs.writeFileSync(p,JSON.stringify(doc,null,2)+'\n');touched.push(file);}
}

const report={
  generatedAt:conflictDoc.generatedAt||new Date().toISOString(),
  gameId:'bonoloto',
  openConflicts:conflicts.size,
  quarantined,
  touchedFiles:touched,
  policy:'FAIL_CLOSED_NO_RESULT_OVERWRITE',
  guards:{canonicalResultNotOverwritten:true,trainingEligibleFalse:true,manifestValidationMustFail:true,officialResolutionRequired:true}
};
fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
