import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root='loterias-ai/data/archive';
const games=fs.readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.name.startsWith('_')).map(d=>d.name).filter(name=>fs.readdirSync(path.join(root,name)).some(f=>/^\d{4}\.json$/.test(f))).sort();
const partitions=[];
const gameSummary={};
const hasEconomics=r=>{const e=r?.economics;if(!e)return false;if(e.payouts&&Object.keys(e.payouts).length)return true;if(e.spain&&Object.keys(e.spain).length)return true;if(e.headlineFirstPrizePerDecimo!=null)return true;if(e.revenue!=null||e.jackpot!=null)return true;if(Array.isArray(e.categories)&&e.categories.some(c=>c&&((c.prize!=null&&Number.isFinite(Number(c.prize)))||(c.winners!=null&&Number.isFinite(Number(c.winners))))))return true;return false;};
const normalizeStatus=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,'_');
const negative=/(^|[_-])(invalid|failed|fail|pending|unverified|unvalidated|unknown|error|conflict)([_-]|$)/;
const positive=/(^|[_-])(valid|validated|pass|passed|verified|official)([_-]|$)/;
const completeOfficialCrossCheck=r=>{
  const x=r?.verification?.officialCrossCheck;
  if(x?.provider!=='SELAE'||x?.exactDate!==true||x?.complete!==true)return false;
  const fields=x?.fields||{};
  return Object.values(fields).length>0&&Object.values(fields).every(v=>v===true);
};
const isValidated=r=>{
  const verificationStatus=normalizeStatus(r?.verification?.status);
  if(negative.test(verificationStatus))return false;
  // A later, complete SELAE component cross-check is stronger evidence than a stale
  // PENDING marker attached to the original secondary source. The source remains
  // preserved as provenance; only the result-validation decision is superseded.
  if(completeOfficialCrossCheck(r)&&positive.test(verificationStatus))return true;
  const values=[r?.verification?.status,r?.internalValidation?.status,r?.source?.validation,r?.economics?.validation?.status].map(normalizeStatus).filter(Boolean);
  if(values.some(v=>negative.test(v)))return false;
  return values.some(v=>positive.test(v));
};
const validatePartition=(game,file,j,records)=>{
  const partitionYear=Number(file.slice(0,4));
  const isQuinielaSeason=game==='quiniela'&&Number.isInteger(Number(j?.seasonStart));
  const kind=isQuinielaSeason?'season':'calendar-year';
  if(isQuinielaSeason&&Number(j.seasonStart)!==partitionYear)throw new Error(`Quiniela seasonStart mismatch ${game}/${file}: seasonStart=${j.seasonStart}`);
  if(!isQuinielaSeason&&j?.year!=null&&Number(j.year)!==partitionYear)throw new Error(`Archive year metadata mismatch ${game}/${file}: year=${j.year}`);
  for(const r of records){
    if(r?.gameId&&r.gameId!==game)throw new Error(`Archive gameId mismatch ${game}/${file}: record=${r.gameId}`);
    const d=String(r?.drawDate??'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d))continue;
    const y=Number(d.slice(0,4));
    if(isQuinielaSeason){if(y!==partitionYear&&y!==partitionYear+1)throw new Error(`Quiniela season-year mismatch ${game}/${file}: drawDate=${d}`)}
    else if(y!==partitionYear)throw new Error(`Archive annual partition year mismatch ${game}/${file}: drawDate=${d}`);
  }
  return {partitionYear,kind};
};
for(const game of games){
  const dir=path.join(root,game),files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)).sort();
  let total=0,economicsTotal=0,validatedTotal=0,earliest=null,latest=null,latestEconomics=null;const kinds=new Set();
  for(const file of files){
    const p=path.join(dir,file),buf=fs.readFileSync(p);let j;try{j=JSON.parse(buf)}catch(e){throw new Error(`Archive partition JSON parse failure ${p}: ${e?.message||e}`)}
    if(!Array.isArray(j.records))throw new Error(`Archive partition records must be an array: ${p}`);
    const records=j.records,{partitionYear,kind}=validatePartition(game,file,j,records);kinds.add(kind);
    const dates=records.map(r=>r.drawDate).filter(Boolean).sort();total+=records.length;
    if(dates.length){earliest=!earliest||dates[0]<earliest?dates[0]:earliest;latest=!latest||dates.at(-1)>latest?dates.at(-1):latest}
    const economicsRecords=records.filter(hasEconomics),economicsCount=economicsRecords.length;economicsTotal+=economicsCount;
    const econDates=economicsRecords.map(r=>r.drawDate).filter(Boolean).sort();if(econDates.length)latestEconomics=!latestEconomics||econDates.at(-1)>latestEconomics?econDates.at(-1):latestEconomics;
    const validatedCount=records.filter(isValidated).length;validatedTotal+=validatedCount;
    partitions.push({gameId:game,partitionKind:kind,year:partitionYear,path:p.replace(/^loterias-ai\//,''),records:records.length,earliest:dates[0]||null,latest:dates.at(-1)||null,economicsRecords:economicsCount,validatedRecords:validatedCount,sha256:crypto.createHash('sha256').update(buf).digest('hex')});
  }
  gameSummary[game]={partitionKinds:[...kinds].sort(),partitions:files.length,records:total,economicsRecords:economicsTotal,economicsCoverage:total?economicsTotal/total:0,validatedRecords:validatedTotal,validationCoverage:total?validatedTotal/total:0,earliest,latest,latestEconomics};
}
const manifest={generatedAt:new Date().toISOString(),schemaVersion:5,storage:'canonical JSON partitions; legacy Quiniela seasonStart files are season partitions, official year files are calendar-year partitions',validationSemantics:'fail-closed; complete explicit SELAE result cross-check supersedes stale PENDING provenance markers while preserving original provenance',games:gameSummary,totals:{games:Object.keys(gameSummary).length,partitions:partitions.length,records:partitions.reduce((s,p)=>s+p.records,0),economicsRecords:partitions.reduce((s,p)=>s+p.economicsRecords,0),validatedRecords:partitions.reduce((s,p)=>s+p.validatedRecords,0)},partitions};
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest.totals,null,2));