import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const manifestPath='loterias-ai/data/archive/manifest.json';
const auditPath='loterias-ai/data/archive/_meta/archive-audit.json';
const auditScript='loterias-ai/scripts/audit-national-archive.mjs';

const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));

// Coverage priorities must never combine a fresh canonical manifest with a stale
// or partial audit. Recompute the audit from the same checkout first. The audit
// may intentionally return a non-zero status when its quality gate is closed;
// diagnostics are still written and remain authoritative for prioritization.
const auditRun=spawnSync(process.execPath,[auditScript],{encoding:'utf8'});
if(auditRun.error) throw auditRun.error;
if(!fs.existsSync(auditPath)) throw new Error('archive audit was not produced');
if(auditRun.status!==0){
  process.stderr.write(auditRun.stderr||'');
  console.error(`Archive audit quality gate returned status ${auditRun.status}; building priorities from persisted fail-closed diagnostics.`);
}

const audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
const manifestGames=Object.entries(manifest.games||{});
const auditGames=Object.keys(audit.games||{});
const missingAuditGames=[];
const recordMismatches=[];
for(const [gameId,g] of manifestGames){
  const a=audit.games?.[gameId];
  if(!a){missingAuditGames.push(gameId);continue;}
  if(Number(a.records)!==Number(g.records)) recordMismatches.push(`${gameId}:${a.records}!=${g.records}`);
}
if(missingAuditGames.length) throw new Error(`archive audit missing manifest games: ${missingAuditGames.join(',')}`);
if(recordMismatches.length) throw new Error(`archive audit record mismatches: ${recordMismatches.join(',')}`);
if(auditGames.length!==manifestGames.length) throw new Error(`archive audit game-count mismatch: audit=${auditGames.length} manifest=${manifestGames.length}`);

const games=manifestGames.map(([gameId,g])=>{
  const records=Number(g.records)||0,validated=Number(g.validatedRecords)||0,economics=Number(g.economicsRecords)||0;
  const validationGap=Math.max(0,records-validated),economicsGap=Math.max(0,records-economics);
  const a=audit.games[gameId];
  const officialEconomics=Number(a.officialEconomicsRecords)||0;
  const officialEconomicsGap=Math.max(0,records-officialEconomics);
  const openOfficialConflicts=Number(a.openOfficialConflicts)||0;
  const score=validationGap*5+officialEconomicsGap*3+economicsGap+openOfficialConflicts*10000;
  return {gameId,records,validatedRecords:validated,validationCoverage:records?validated/records:0,validationGap,economicsRecords:economics,economicsCoverage:records?economics/records:0,economicsGap,officialEconomicsRecords:officialEconomics,officialEconomicsCoverage:records?officialEconomics/records:0,officialEconomicsGap,openOfficialConflicts,priorityScore:score};
}).sort((a,b)=>b.priorityScore-a.priorityScore||b.records-a.records);

const payload={
  generatedAt:new Date().toISOString(),
  schemaVersion:2,
  principle:'Prioritize missing authoritative validation/provenance; never infer validation from economics alone.',
  manifestGeneratedAt:manifest.generatedAt,
  auditGeneratedAt:audit.generatedAt||null,
  auditQualityPass:audit.qualityGate?.pass===true,
  auditSynchronized:true,
  totals:{
    records:Number(manifest?.totals?.records)||0,
    validatedRecords:Number(manifest?.totals?.validatedRecords)||0,
    validationGap:(Number(manifest?.totals?.records)||0)-(Number(manifest?.totals?.validatedRecords)||0),
    economicsRecords:Number(manifest?.totals?.economicsRecords)||0
  },
  priorities:games,
  topPriority:games[0]||null
};
fs.mkdirSync('loterias-ai/data/archive/_meta',{recursive:true});
fs.writeFileSync('loterias-ai/data/archive/_meta/archive-coverage-priorities.json',JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({auditQualityPass:payload.auditQualityPass,totals:payload.totals,top:games.slice(0,6).map(x=>({gameId:x.gameId,validationGap:x.validationGap,officialEconomicsGap:x.officialEconomicsGap,score:x.priorityScore}))},null,2));
