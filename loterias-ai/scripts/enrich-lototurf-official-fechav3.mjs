import fs from 'node:fs';

const dir='loterias-ai/data/archive/lototurf';
const meta='loterias-ai/data/archive/_meta';
fs.mkdirSync(meta,{recursive:true});
const limit=Math.max(1,Number(process.env.BATCH_LIMIT||60));
const files=fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)).sort():[];
const docs=new Map();
const targets=[];
for(const f of files){
  const p=`${dir}/${f}`;
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  docs.set(f,{p,doc});
  for(const r of doc.records||[]) if(r.drawDate&&!r.economics?.validation?.officialSELAE) targets.push({file:f,row:r});
}
targets.sort((a,b)=>b.row.drawDate.localeCompare(a.row.drawDate));

const num=x=>{const n=Number(String(x??'').replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:null};
const normDate=v=>String(v||'').slice(0,10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const provenanceLeaf=source=>{
  let current=source||null;
  const seen=new Set();
  while(current&&typeof current==='object'&&current.archivePreviousSource&&typeof current.archivePreviousSource==='object'){
    if(seen.has(current)) break;
    seen.add(current);
    current=current.archivePreviousSource;
  }
  return current;
};

async function get(date){
  const d=date.replaceAll('-','');
  const url=`https://www.loteriasyapuestas.es/servicios/fechav3?game_id=LOTU&fecha_sorteo=${d}`;
  let err;
  for(let a=1;a<=3;a++){
    try{
      const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'user-agent':'LoteriasAI/1.0 research archive','accept':'*/*'}});
      if(r.status===404) return {url,row:null,reason:'HTTP_404'};
      if(r.ok){
        const j=await r.json();
        const rows=Array.isArray(j)?j:[];
        const row=rows.find(x=>normDate(x?.fecha_sorteo)===date)||null;
        return {url,row,reason:row?null:'EXACT_DATE_NOT_RETURNED'};
      }
      err=new Error(`HTTP ${r.status}`);
    }catch(e){err=e}
    await sleep(a*700);
  }
  throw err||new Error('official SELAE fetch failed');
}

function parseCombo(s){
  const m=String(s||'').match(/^(.*?)\s+C\((\d+)\)\s+R\((\d+)\)/i);
  if(!m)return null;
  const main=(m[1].match(/\d+/g)||[]).map(Number);
  if(main.length!==6)return null;
  return {main:[...main].sort((a,b)=>a-b),horse:Number(m[2]),reintegro:Number(m[3])};
}

let updated=0,mismatch=0,empty=0,exactDateMisses=0;
const failures=[];
const quarantine=[];
const changedFiles=new Set();
for(const [i,target] of targets.slice(0,limit).entries()){
  const {file,row:r}=target;
  try{
    const {url,row,reason}=await get(r.drawDate);
    if(!row){
      empty++;
      if(reason==='EXACT_DATE_NOT_RETURNED') exactDateMisses++;
      failures.push({date:r.drawDate,reason:reason||'NO_OFFICIAL_ROW',officialUrl:url});
      continue;
    }
    const c=parseCombo(row.combinacion);
    if(!c){failures.push({date:r.drawDate,reason:'combo-parse',officialUrl:url});continue}
    const current=(r.result?.main||[]).map(Number).sort((a,b)=>a-b);
    if(current.length&&current.join(',')!==c.main.join(',')){
      mismatch++;
      const q={date:r.drawDate,reason:'main-mismatch',internal:current,official:c.main,officialUrl:url};
      failures.push(q);quarantine.push(q);continue;
    }
    if(r.result?.horse!=null&&Number(r.result.horse)!==c.horse){
      mismatch++;
      const q={date:r.drawDate,reason:'horse-mismatch',internal:r.result.horse,official:c.horse,officialUrl:url};
      failures.push(q);quarantine.push(q);continue;
    }
    const previousSource=provenanceLeaf(r.source);
    r.result=c;
    r.drawNumber=row.id_sorteo;
    r.economics={currency:'EUR',ticketCost:1,stakes:num(row.apuestas),revenue:num(row.recaudacion),jackpot:num(row.premio_bote),prizePool:num(row.premios),rolloverFund:num(row.fondo_bote),categories:(row.escrutinio||[]).map(x=>({category:Number(x.categoria),label:String(x.tipo||'').trim(),winners:num(x.ganadores),prize:num(x.premio)})),source:{provider:'SELAE',url,capturedAt:new Date().toISOString()},validation:{status:'OFFICIAL_PARSED',officialSELAE:true}};
    r.source={provider:'SELAE',tier:'official',url,validation:'official-fechav3',archivePreviousSource:previousSource};
    updated++;
    changedFiles.add(file);
  }catch(e){failures.push({date:r.drawDate,reason:String(e)})}
  if(i%15===14) await sleep(350);
}

for(const file of changedFiles){const {p,doc}=docs.get(file);fs.writeFileSync(p,JSON.stringify(doc,null,2)+'\n')}
let total=0,official=0;
for(const {doc} of docs.values()) for(const r of doc.records||[]){total++;if(r.economics?.validation?.officialSELAE)official++}
const out={generatedAt:new Date().toISOString(),gameId:'lototurf',batchLimit:limit,attempted:Math.min(limit,targets.length),updated,empty,exactDateMisses,mismatch,failures,totalRecords:total,officialEconomicsRecords:official,remaining:Math.max(0,total-official),qualityPass:mismatch===0,quarantinedMismatchCount:quarantine.length,guards:{exactOfficialDrawDateRequired:true,noDateShiftPromotion:true,provenanceHistoryFlattened:true,noInference:true},next:quarantine.length?'review-quarantined-mismatches-while-continuing-nonconflicting-official-enrichment':'continue-official-enrichment'};
fs.writeFileSync(`${meta}/lototurf-official-enrichment.json`,JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(`${meta}/lototurf-official-mismatch-quarantine.json`,JSON.stringify({generatedAt:out.generatedAt,gameId:'lototurf',count:quarantine.length,items:quarantine,policy:'Never overwrite an internal archived result when SELAE disagrees. Require exact official draw date, quarantine mismatches, and continue enriching only non-conflicting records.'},null,2)+'\n');
console.log(JSON.stringify({...out,failures:failures.length,changedFiles:[...changedFiles].sort()},null,2));
