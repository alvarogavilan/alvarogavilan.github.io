import fs from 'node:fs';
import path from 'node:path';
const root='loterias-ai/data/archive';
const expected={bonoloto:{recentEconomics:true},primitiva:{recentEconomics:true},euromillones:{recentEconomics:true},'gordo-primitiva':{recentEconomics:true},eurodreams:{recentEconomics:true},'loteria-nacional':{recentEconomics:false}};
const hasEconomics=r=>Boolean((r.economics?.payouts&&Object.keys(r.economics.payouts).length)||(Array.isArray(r.economics?.categories)&&r.economics.categories.length&&r.economics?.validation?.officialSELAE));
const tuple=a=>Array.isArray(a)?[...a].map(Number).sort((x,y)=>x-y).join(','):'';
const allowedResolutionStatuses=new Set(['RESOLVED_SOURCE_DATE_SHIFT','RESOLVED_OFFICIAL_CORRECTION','RESOLVED_CANONICAL_CONFIRMED']);
const report={generatedAt:new Date().toISOString(),schemaVersion:4,games:{},totals:{duplicateDates:0,invalidDates:0,parseErrors:0,totalOfficialConflicts:0,resolvedOfficialConflicts:0,openOfficialConflicts:0,missingEconomicsOnRecentStoredDraws:0,officialEconomicsRecords:0},qualityGate:{pass:false,reasons:[]}};
for(const game of Object.keys(expected)){
 const dir=path.join(root,game);if(!fs.existsSync(dir))continue;
 const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)).sort(),rows=[],parseErrors=[];
 for(const f of files){
  try{const j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));if(!Array.isArray(j.records))throw new Error('records-not-array');rows.push(...j.records)}
  catch(e){parseErrors.push({file:f,error:String(e?.message||e)})}
 }
 rows.sort((a,b)=>String(a.drawDate).localeCompare(String(b.drawDate)));
 const seen=new Set(),dupes=[];let invalid=0;
 for(const r of rows){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(r.drawDate)))invalid++;if(seen.has(r.drawDate))dupes.push(r.drawDate);seen.add(r.drawDate)}
 const recent=rows.slice(-60),missingEconomics=expected[game].recentEconomics?recent.filter(r=>!hasEconomics(r)).map(r=>r.drawDate):[],economicsRows=rows.filter(hasEconomics),officialRows=rows.filter(r=>Array.isArray(r.economics?.categories)&&r.economics.categories.length&&r.economics?.validation?.officialSELAE);
 const metaPath=path.join(root,'_meta',`${game}-official-economics.json`);let meta=null;
 if(fs.existsSync(metaPath))try{meta=JSON.parse(fs.readFileSync(metaPath,'utf8'))}catch(e){parseErrors.push({file:path.basename(metaPath),error:String(e?.message||e)})}
 const officialEconomicRecords=Number(meta?.officialEconomics??officialRows.length)||0,officialCoverage=meta?.coverage??(rows.length?officialEconomicRecords/rows.length:0);
 const conflictsPath=path.join(root,'_meta',`${game}-official-conflicts.json`),resolutionsPath=path.join(root,'_meta',`${game}-official-conflict-resolutions.json`);
 let conflicts=[],resolutions=[];
 if(fs.existsSync(conflictsPath))try{const j=JSON.parse(fs.readFileSync(conflictsPath,'utf8'));if(!Array.isArray(j.conflicts))throw new Error('conflicts-not-array');conflicts=j.conflicts}catch(e){parseErrors.push({file:path.basename(conflictsPath),error:String(e?.message||e)})}
 if(fs.existsSync(resolutionsPath))try{const j=JSON.parse(fs.readFileSync(resolutionsPath,'utf8'));if(!Array.isArray(j.resolutions))throw new Error('resolutions-not-array');resolutions=j.resolutions}catch(e){parseErrors.push({file:path.basename(resolutionsPath),error:String(e?.message||e)})}
 const used=new Set(),resolved=[];
 for(const resolution of resolutions){
  const evidence=Array.isArray(resolution.evidence)?resolution.evidence:[];
  const hasOfficialEvidence=evidence.some(e=>e?.authority==='official'&&typeof e?.provider==='string'&&e.provider&&typeof e?.reference==='string'&&e.reference);
  if(!allowedResolutionStatuses.has(resolution.status)||!hasOfficialEvidence){parseErrors.push({file:path.basename(resolutionsPath),error:`invalid-resolution:${resolution.drawDate||'unknown'}`});continue}
  const matches=[];
  conflicts.forEach((c,i)=>{if(String(c.drawDate)===String(resolution.drawDate)&&tuple(c.stored)===tuple(resolution.stored)&&tuple(c.official)===tuple(resolution.officialSeries))matches.push(i)});
  if(matches.length!==1){parseErrors.push({file:path.basename(resolutionsPath),error:`resolution-conflict-match-count:${resolution.drawDate||'unknown'}:${matches.length}`});continue}
  const idx=matches[0];if(used.has(idx)){parseErrors.push({file:path.basename(resolutionsPath),error:`duplicate-resolution:${resolution.drawDate}`});continue}
  used.add(idx);resolved.push({drawDate:resolution.drawDate,status:resolution.status,evidence:resolution.evidence});
 }
 const openConflicts=conflicts.filter((_,i)=>!used.has(i)).length,totalConflicts=conflicts.length,resolvedConflicts=used.size;
 const health=dupes.length||invalid||parseErrors.length||openConflicts?'FAIL':missingEconomics.length?'PARTIAL_ECONOMICS':'PASS';
 report.games[game]={records:rows.length,earliest:rows[0]?.drawDate||null,latest:rows.at(-1)?.drawDate||null,economicsRecords:economicsRows.length,officialEconomicsRecords:officialEconomicRecords,officialEconomicsCoverage:officialCoverage,officialEconomicsStatus:meta?.status??(officialCoverage===1?'COMPLETE':officialCoverage>0?'PARTIAL':null),totalOfficialConflicts:totalConflicts,resolvedOfficialConflicts:resolvedConflicts,openOfficialConflicts:openConflicts,resolvedConflicts:resolved,latestEconomics:economicsRows.at(-1)?.drawDate||null,duplicateDates:dupes,invalidDates:invalid,parseErrors,missingEconomicsOnLast60:missingEconomics,health};
 report.totals.duplicateDates+=dupes.length;report.totals.invalidDates+=invalid;report.totals.parseErrors+=parseErrors.length;report.totals.totalOfficialConflicts+=totalConflicts;report.totals.resolvedOfficialConflicts+=resolvedConflicts;report.totals.openOfficialConflicts+=openConflicts;report.totals.missingEconomicsOnRecentStoredDraws+=missingEconomics.length;report.totals.officialEconomicsRecords+=officialEconomicRecords;
}
if(report.totals.duplicateDates)report.qualityGate.reasons.push(`duplicate-dates:${report.totals.duplicateDates}`);
if(report.totals.invalidDates)report.qualityGate.reasons.push(`invalid-dates:${report.totals.invalidDates}`);
if(report.totals.parseErrors)report.qualityGate.reasons.push(`parse-errors:${report.totals.parseErrors}`);
if(report.totals.openOfficialConflicts)report.qualityGate.reasons.push(`open-official-conflicts:${report.totals.openOfficialConflicts}`);
report.qualityGate.pass=report.qualityGate.reasons.length===0;
fs.mkdirSync(path.join(root,'_meta'),{recursive:true});fs.writeFileSync(path.join(root,'_meta','archive-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(!report.qualityGate.pass){console.error(`Archive quality gate failed: ${report.qualityGate.reasons.join(', ')}`);process.exitCode=2;}
