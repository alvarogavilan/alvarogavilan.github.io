#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const VERSION='build-christmas-archive-v1';
const DEFAULT_DIR='loterias-ai/data/archive/loteria-nacional';
const OUT='loterias-ai/data/archive/christmas/records.json';

function recordsOf(doc){
  if(Array.isArray(doc)) return doc;
  for(const k of ['records','draws','items']) if(Array.isArray(doc?.[k])) return doc[k];
  return [];
}
function drawDateOf(r){return String(r?.drawDate||r?.date||r?.fecha||'').slice(0,10);}
function isChristmas(r){
  const d=drawDateOf(r);
  if(!/^\d{4}-12-22$/.test(d)) return false;
  const text=JSON.stringify({name:r?.name,title:r?.title,drawName:r?.drawName,type:r?.type,scope:r?.scope}).toLowerCase();
  return !text || text.includes('navidad') || text.includes('extraordinario') || d.endsWith('-12-22');
}
function normalize(r,sourceFile){
  return {
    year:Number(drawDateOf(r).slice(0,4)),
    drawDate:drawDateOf(r),
    sourceFile,
    drawId:r?.drawId??r?.verification?.officialCrossCheck?.officialDrawId??null,
    result:r?.result??null,
    prizes:r?.prizes??r?.premios??null,
    economics:r?.economics??null,
    verification:r?.verification??null,
    rawRecord:r
  };
}
function main(){
  const dir=process.argv[2]||DEFAULT_DIR;
  if(!fs.existsSync(dir)) throw new Error(`Archive dir not found: ${dir}`);
  const files=fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)).sort();
  const out=[];
  for(const file of files){
    const p=path.join(dir,file);
    const doc=JSON.parse(fs.readFileSync(p,'utf8'));
    for(const r of recordsOf(doc)) if(isChristmas(r)) out.push(normalize(r,file));
  }
  out.sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
  const payload={
    version:VERSION,
    generatedAt:new Date().toISOString(),
    source:'DERIVED_FROM_EXISTING_OFFICIAL_LOTERIA_NACIONAL_ARCHIVE',
    records:out,
    coverage:{count:out.length,first:out[0]?.drawDate??null,last:out.at(-1)?.drawDate??null},
    overlays:{tuloteroAvailability:'separate timestamped pre-draw source',selaeAllocation:'separate exposure source',prizeLocations:'separate post-draw source'},
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0},
    hardGuards:{noFutureInformation:true,doNotMergePostDrawLocationsIntoPredrawFeatures:true,availabilityDoesNotChangeDrawProbabilityByItself:true}
  };
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
  process.stdout.write(JSON.stringify(payload.coverage,null,2)+'\n');
}
main();
