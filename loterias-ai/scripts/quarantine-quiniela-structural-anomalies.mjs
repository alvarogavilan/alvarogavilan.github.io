import fs from 'node:fs';
import path from 'node:path';

const dir='loterias-ai/data/archive/quiniela';
const meta='loterias-ai/data/archive/_meta/quiniela-structural-quarantine.json';
const official=r=>r?.source?.provider==='SELAE'||r?.economics?.validation?.officialSELAE===true||/^OFFICIAL(?:_|$)/.test(String(r?.verification?.status||''));
const key=r=>`${r?.drawId??''}|${r?.drawDate??'NULL'}|${r?.season??''}|${r?.jornada??''}`;
const quarantine=[];
let removed=0;
const touched=[];

for(const file of fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)).sort()){
  const filePath=path.join(dir,file);
  const doc=JSON.parse(fs.readFileSync(filePath,'utf8'));
  const rows=Array.isArray(doc.records)?doc.records:[];
  const byId=new Map();
  const byDate=new Map();
  for(const row of rows){
    if(row?.drawId){if(!byId.has(row.drawId))byId.set(row.drawId,[]);byId.get(row.drawId).push(row)}
    if(row?.drawDate){if(!byDate.has(row.drawDate))byDate.set(row.drawDate,[]);byDate.get(row.drawDate).push(row)}
  }
  const remove=new Set();

  for(const row of rows){
    if(row?.drawDate!=null)continue;
    const siblings=(byId.get(row?.drawId)||[]).filter(x=>x!==row);
    const officialSibling=siblings.find(official);
    if(!official(row)&&officialSibling){
      remove.add(row);
      quarantine.push({reason:'UNDATED_SECONDARY_COLLIDES_WITH_OFFICIAL_DRAW_ID',file,row,canonicalAnchor:{drawId:officialSibling.drawId,drawDate:officialSibling.drawDate}});
    }
  }

  for(const [drawDate,group] of byDate){
    if(group.length<2)continue;
    const officialRows=group.filter(official);
    if(officialRows.length!==1)continue;
    const canonical=officialRows[0];
    for(const row of group){
      if(row===canonical||official(row))continue;
      remove.add(row);
      quarantine.push({reason:'SECONDARY_DUPLICATE_DATE_CONFLICTS_WITH_OFFICIAL_ROW',file,row,canonicalAnchor:{drawId:canonical.drawId,drawDate}});
    }
  }

  if(remove.size){
    doc.records=rows.filter(r=>!remove.has(r));
    removed+=remove.size;
    touched.push(file);
    fs.writeFileSync(filePath,JSON.stringify(doc,null,2)+'\n');
  }
}

let previous=[];
if(fs.existsSync(meta)){
  try{previous=JSON.parse(fs.readFileSync(meta,'utf8')).entries||[]}catch{}
}
const merged=new Map(previous.map(x=>[`${x.reason}|${x.file}|${key(x.row)}`,x]));
for(const entry of quarantine){
  const k=`${entry.reason}|${entry.file}|${key(entry.row)}`;
  if(!merged.has(k))merged.set(k,{...entry,quarantinedAt:new Date().toISOString(),trainingEligible:false});
}
const report={
  generatedAt:new Date().toISOString(),
  gameId:'quiniela',
  policy:'Malformed or conflicting secondary rows are quarantined only when a corresponding SELAE-backed canonical row already exists. No date or result is inferred.',
  removedThisRun:removed,
  totalQuarantined:merged.size,
  touchedFiles:touched,
  entries:[...merged.values()],
  guards:{noInference:true,noOfficialOverwrite:true,quarantinedRowsTrainingEligible:false}
};
fs.mkdirSync(path.dirname(meta),{recursive:true});
fs.writeFileSync(meta,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,entries:report.entries.length},null,2));
