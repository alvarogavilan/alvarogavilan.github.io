import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root='loterias-ai/data/archive';
const games=fs.readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.name.startsWith('_')).map(d=>d.name).filter(name=>fs.readdirSync(path.join(root,name)).some(f=>/^\d{4}\.json$/.test(f))).sort();
const partitions=[];
const gameSummary={};
const hasEconomics=r=>{const e=r?.economics;if(!e)return false;if(e.payouts&&Object.keys(e.payouts).length)return true;if(e.spain&&Object.keys(e.spain).length)return true;if(e.headlineFirstPrizePerDecimo!=null)return true;if(e.revenue!=null||e.jackpot!=null)return true;return false;};
for(const game of games){
  const dir=path.join(root,game);
  const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)).sort();
  let total=0,economicsTotal=0,validatedTotal=0,earliest=null,latest=null,latestEconomics=null;
  for(const file of files){
    const p=path.join(dir,file),buf=fs.readFileSync(p);let j;try{j=JSON.parse(buf);}catch{continue;}
    const records=Array.isArray(j.records)?j.records:[],dates=records.map(r=>r.drawDate).filter(Boolean).sort();total+=records.length;
    if(dates.length){earliest=!earliest||dates[0]<earliest?dates[0]:earliest;latest=!latest||dates.at(-1)>latest?dates.at(-1):latest;}
    const economicsRecords=records.filter(hasEconomics),economicsCount=economicsRecords.length;economicsTotal+=economicsCount;
    const econDates=economicsRecords.map(r=>r.drawDate).filter(Boolean).sort();if(econDates.length)latestEconomics=!latestEconomics||econDates.at(-1)>latestEconomics?econDates.at(-1):latestEconomics;
    const validatedCount=records.filter(r=>String(r.verification?.status||r.internalValidation?.status||r.source?.validation||r.economics?.validation?.status||'').toLowerCase().includes('valid')||String(r.source?.validation||'').toLowerCase().includes('pass')).length;validatedTotal+=validatedCount;
    partitions.push({gameId:game,year:Number(file.slice(0,4)),path:p.replace(/^loterias-ai\//,''),records:records.length,earliest:dates[0]||null,latest:dates.at(-1)||null,economicsRecords:economicsCount,validatedRecords:validatedCount,sha256:crypto.createHash('sha256').update(buf).digest('hex')});
  }
  gameSummary[game]={partitions:files.length,records:total,economicsRecords:economicsTotal,economicsCoverage:total?economicsTotal/total:0,validatedRecords:validatedTotal,earliest,latest,latestEconomics};
}
const manifest={generatedAt:new Date().toISOString(),schemaVersion:3,storage:'game/year canonical JSON partitions + reference indexes for special draws',games:gameSummary,totals:{games:Object.keys(gameSummary).length,partitions:partitions.length,records:partitions.reduce((s,p)=>s+p.records,0),economicsRecords:partitions.reduce((s,p)=>s+p.economicsRecords,0),validatedRecords:partitions.reduce((s,p)=>s+p.validatedRecords,0)},partitions};
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest.totals,null,2));
