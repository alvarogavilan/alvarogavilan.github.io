import fs from 'node:fs';
import path from 'node:path';

const root='loterias-ai/data/archive';
const expected={
 bonoloto:{recentEconomics:true},
 primitiva:{recentEconomics:true},
 euromillones:{recentEconomics:true},
 'gordo-primitiva':{recentEconomics:false},
 eurodreams:{recentEconomics:false},
 'loteria-nacional':{recentEconomics:false}
};
const report={generatedAt:new Date().toISOString(),games:{},totals:{duplicateDates:0,invalidDates:0,missingEconomicsOnRecentStoredDraws:0}};
for(const game of Object.keys(expected)){
 const dir=path.join(root,game);if(!fs.existsSync(dir))continue;
 const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)).sort();
 const rows=[];for(const f of files){let j;try{j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));}catch{continue;}rows.push(...(j.records||[]));}
 rows.sort((a,b)=>String(a.drawDate).localeCompare(String(b.drawDate)));
 const seen=new Set(),dupes=[];let invalid=0;for(const r of rows){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(r.drawDate)))invalid++;if(seen.has(r.drawDate))dupes.push(r.drawDate);seen.add(r.drawDate);}
 const recent=rows.slice(-60),missingEconomics=expected[game].recentEconomics?recent.filter(r=>!r.economics?.payouts||!Object.keys(r.economics.payouts).length).map(r=>r.drawDate):[];
 const economicsRows=rows.filter(r=>r.economics?.payouts&&Object.keys(r.economics.payouts).length);
 report.games[game]={records:rows.length,earliest:rows[0]?.drawDate||null,latest:rows.at(-1)?.drawDate||null,economicsRecords:economicsRows.length,latestEconomics:economicsRows.at(-1)?.drawDate||null,duplicateDates:dupes,invalidDates:invalid,missingEconomicsOnLast60:missingEconomics,health:dupes.length||invalid?'FAIL':missingEconomics.length?'PARTIAL_ECONOMICS':'PASS'};
 report.totals.duplicateDates+=dupes.length;report.totals.invalidDates+=invalid;report.totals.missingEconomicsOnRecentStoredDraws+=missingEconomics.length;
}
fs.mkdirSync(path.join(root,'_meta'),{recursive:true});fs.writeFileSync(path.join(root,'_meta','archive-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.totals,null,2));if(report.totals.duplicateDates||report.totals.invalidDates)process.exitCode=2;