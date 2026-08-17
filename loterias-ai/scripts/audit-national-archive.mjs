import fs from 'node:fs';
import path from 'node:path';
const root='loterias-ai/data/archive';
const expected={bonoloto:{recentEconomics:true},primitiva:{recentEconomics:true},euromillones:{recentEconomics:true},'gordo-primitiva':{recentEconomics:true},eurodreams:{recentEconomics:true},'loteria-nacional':{recentEconomics:false}};
const hasEconomics=r=>Boolean((r.economics?.payouts&&Object.keys(r.economics.payouts).length)||(Array.isArray(r.economics?.categories)&&r.economics.categories.length&&r.economics?.validation?.officialSELAE));
const report={generatedAt:new Date().toISOString(),schemaVersion:3,games:{},totals:{duplicateDates:0,invalidDates:0,parseErrors:0,openOfficialConflicts:0,missingEconomicsOnRecentStoredDraws:0,officialEconomicsRecords:0},qualityGate:{pass:false,reasons:[]}};
for(const game of Object.keys(expected)){
 const dir=path.join(root,game);if(!fs.existsSync(dir))continue;
 const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)).sort(),rows=[],parseErrors=[];
 for(const f of files){
  try{
   const j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
   if(!Array.isArray(j.records))throw new Error('records-not-array');
   rows.push(...j.records);
  }catch(e){parseErrors.push({file:f,error:String(e?.message||e)})}
 }
 rows.sort((a,b)=>String(a.drawDate).localeCompare(String(b.drawDate)));
 const seen=new Set(),dupes=[];let invalid=0;
 for(const r of rows){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(r.drawDate)))invalid++;if(seen.has(r.drawDate))dupes.push(r.drawDate);seen.add(r.drawDate)}
 const recent=rows.slice(-60),missingEconomics=expected[game].recentEconomics?recent.filter(r=>!hasEconomics(r)).map(r=>r.drawDate):[],economicsRows=rows.filter(hasEconomics),officialRows=rows.filter(r=>Array.isArray(r.economics?.categories)&&r.economics.categories.length&&r.economics?.validation?.officialSELAE);
 const metaPath=path.join(root,'_meta',`${game}-official-economics.json`);let meta=null,metaParseError=null;
 if(fs.existsSync(metaPath))try{meta=JSON.parse(fs.readFileSync(metaPath,'utf8'))}catch(e){metaParseError=String(e?.message||e);parseErrors.push({file:path.basename(metaPath),error:metaParseError})}
 const officialEconomicRecords=Number(meta?.officialEconomics??officialRows.length)||0,officialCoverage=meta?.coverage??(rows.length?officialEconomicRecords/rows.length:0);
 const conflictsPath=path.join(root,'_meta',`${game}-official-conflicts.json`);let openConflicts=0;
 if(fs.existsSync(conflictsPath)){
  try{openConflicts=Number(JSON.parse(fs.readFileSync(conflictsPath,'utf8')).count)||0}
  catch(e){parseErrors.push({file:path.basename(conflictsPath),error:String(e?.message||e)})}
 }
 const health=dupes.length||invalid||parseErrors.length||openConflicts?'FAIL':missingEconomics.length?'PARTIAL_ECONOMICS':'PASS';
 report.games[game]={records:rows.length,earliest:rows[0]?.drawDate||null,latest:rows.at(-1)?.drawDate||null,economicsRecords:economicsRows.length,officialEconomicsRecords:officialEconomicRecords,officialEconomicsCoverage:officialCoverage,officialEconomicsStatus:meta?.status??(officialCoverage===1?'COMPLETE':officialCoverage>0?'PARTIAL':null),openOfficialConflicts:openConflicts,latestEconomics:economicsRows.at(-1)?.drawDate||null,duplicateDates:dupes,invalidDates:invalid,parseErrors,missingEconomicsOnLast60:missingEconomics,health};
 report.totals.duplicateDates+=dupes.length;report.totals.invalidDates+=invalid;report.totals.parseErrors+=parseErrors.length;report.totals.openOfficialConflicts+=openConflicts;report.totals.missingEconomicsOnRecentStoredDraws+=missingEconomics.length;report.totals.officialEconomicsRecords+=officialEconomicRecords;
}
if(report.totals.duplicateDates)report.qualityGate.reasons.push(`duplicate-dates:${report.totals.duplicateDates}`);
if(report.totals.invalidDates)report.qualityGate.reasons.push(`invalid-dates:${report.totals.invalidDates}`);
if(report.totals.parseErrors)report.qualityGate.reasons.push(`parse-errors:${report.totals.parseErrors}`);
if(report.totals.openOfficialConflicts)report.qualityGate.reasons.push(`open-official-conflicts:${report.totals.openOfficialConflicts}`);
report.qualityGate.pass=report.qualityGate.reasons.length===0;
fs.mkdirSync(path.join(root,'_meta'),{recursive:true});fs.writeFileSync(path.join(root,'_meta','archive-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(!report.qualityGate.pass){console.error(`Archive quality gate failed: ${report.qualityGate.reasons.join(', ')}`);process.exitCode=2;}
