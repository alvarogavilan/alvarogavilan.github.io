import fs from 'node:fs';
import path from 'node:path';

const DIR='loterias-ai/data/archive/gordo-primitiva';
const META='loterias-ai/data/archive/_meta';
const STATUS=`${META}/gordo-primitiva-official-result-crosscheck.json`;
const CONFLICTS=`${META}/gordo-primitiva-official-result-conflicts.json`;
const LIMIT=Math.max(1,Number(process.env.BATCH_LIMIT||120));
const now=new Date().toISOString();
fs.mkdirSync(META,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const normDate=v=>String(v||'').slice(0,10);
const sorted=a=>(a||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);

async function getOfficial(drawDate){
  const url=`https://www.loteriasyapuestas.es/servicios/fechav3?game_id=ELGR&fecha_sorteo=${drawDate.replaceAll('-','')}`;
  let last=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'user-agent':'Mozilla/5.0 LoteriasAI official result cross-check','accept':'application/json,text/plain,*/*'}});
      if(r.status===404)return {url,row:null,reason:'HTTP_404'};
      if(!r.ok)last=new Error(`HTTP ${r.status}`);
      else {const json=await r.json(),rows=Array.isArray(json)?json:[],row=rows.find(x=>normDate(x?.fecha_sorteo)===drawDate)||null;return {url,row,reason:row?null:'EXACT_DATE_NOT_RETURNED'};}
    }catch(e){last=e;}
    await sleep(attempt*500);
  }
  throw last||new Error('official SELAE fetch failed');
}

function parseOfficial(raw){
  const text=String(raw||'').trim();
  const beforeExtra=text.split(/\b[CR]\s*\(/i)[0];
  const main=(beforeExtra.match(/\b\d{1,2}\b/g)||[]).map(Number).filter(n=>n>=1&&n<=54).slice(0,5).sort((a,b)=>a-b);
  const keyMatch=text.match(/\bR\s*\(\s*(\d)\s*\)/i)||text.match(/\bC\s*\(\s*(\d)\s*\)/i);
  return {main,key:keyMatch?Number(keyMatch[1]):null,raw:text};
}

const docs=new Map(),targets=[];
for(const file of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort().reverse()){
  const p=path.join(DIR,file),doc=JSON.parse(fs.readFileSync(p,'utf8'));docs.set(file,{p,doc});
  for(const record of doc.records||[]){
    if(!record?.drawDate)continue;
    if(record.verification?.officialCrossCheck?.provider==='SELAE'&&record.verification?.officialCrossCheck?.complete===true)continue;
    targets.push({file,record});
  }
}
targets.sort((a,b)=>b.record.drawDate.localeCompare(a.record.drawDate));
const oldConflicts=fs.existsSync(CONFLICTS)?JSON.parse(fs.readFileSync(CONFLICTS,'utf8')):{conflicts:[]};
const conflictMap=new Map((oldConflicts.conflicts||[]).map(x=>[x.date,x]));
let attempted=0,validated=0,empty=0,failed=0;const failures=[],newConflicts=[],touched=new Set();

for(const [i,target] of targets.slice(0,LIMIT).entries()){
  const r=target.record;attempted++;
  try{
    const {url,row,reason}=await getOfficial(r.drawDate);
    if(!row){empty++;failures.push({date:r.drawDate,reason:reason||'NO_OFFICIAL_ROW',url});continue;}
    const parsed=parseOfficial(row.combinacion);
    const storedMain=sorted(r.result?.main),storedKey=r.result?.key==null?null:Number(r.result.key);
    const mainValid=parsed.main.length===5&&new Set(parsed.main).size===5;
    const keyValid=Number.isInteger(parsed.key)&&parsed.key>=0&&parsed.key<=9;
    const fields={main:mainValid&&storedMain.length===5&&same(parsed.main,storedMain),key:keyValid&&Number.isInteger(storedKey)&&parsed.key===storedKey};
    const mismatch=(mainValid&&storedMain.length===5&&!fields.main)||(keyValid&&Number.isInteger(storedKey)&&!fields.key);
    if(mismatch){
      const conflict={date:r.drawDate,reason:'OFFICIAL_MAIN_PLUS_KEY_MISMATCH',stored:{main:storedMain,key:storedKey},official:{main:parsed.main,key:parsed.key,raw:parsed.raw},url};
      conflictMap.set(r.drawDate,conflict);newConflicts.push(conflict);continue;
    }
    const complete=mainValid&&keyValid&&fields.main&&fields.key;
    if(!complete){failures.push({date:r.drawDate,reason:'INCOMPLETE_OFFICIAL_MAIN_PLUS_KEY',official:parsed,url});continue;}
    const prev=r.verification&&typeof r.verification==='object'?r.verification:{};
    const checks=[...(Array.isArray(prev.checks)?prev.checks:[])];
    for(const c of ['official-fechav3-exact-date','official-main-cross-check','official-key-cross-check'])if(!checks.includes(c))checks.push(c);
    r.verification={...prev,status:'OFFICIAL_SELAE_VALIDATED',checks,officialCrossCheck:{provider:'SELAE',sourceUrl:url,checkedAt:now,officialDrawId:row.id_sorteo||null,exactDate:true,fields,complete:true,officialResult:{main:parsed.main,key:parsed.key}}};
    touched.add(target.file);validated++;conflictMap.delete(r.drawDate);
  }catch(e){failed++;failures.push({date:r.drawDate,reason:String(e?.message||e)});}
  if(i%20===19)await sleep(250);
}
for(const file of touched){const {p,doc}=docs.get(file);fs.writeFileSync(p,JSON.stringify(doc,null,2)+'\n');}
let total=0,officiallyValidated=0;for(const {doc} of docs.values())for(const r of doc.records||[]){total++;if(r.verification?.officialCrossCheck?.provider==='SELAE'&&r.verification?.officialCrossCheck?.complete===true&&r.verification?.status==='OFFICIAL_SELAE_VALIDATED')officiallyValidated++;}
const conflictDoc={generatedAt:now,gameId:'gordo-primitiva',policy:'QUARANTINE_DO_NOT_OVERWRITE_ARCHIVE_RESULT',conflicts:[...conflictMap.values()].sort((a,b)=>a.date.localeCompare(b.date))};
fs.writeFileSync(CONFLICTS,JSON.stringify(conflictDoc,null,2)+'\n');
const out={generatedAt:now,gameId:'gordo-primitiva',source:'SELAE /servicios/fechav3 game_id=ELGR',attempted,validated,empty,failed,newConflicts:newConflicts.length,openConflicts:conflictDoc.conflicts.length,totalRecords:total,officiallyValidated,remaining:Math.max(0,targets.length-validated),qualityPass:conflictDoc.conflicts.length===0,guards:{mainPlusKeyRequired:true,economicsDoesNotImplyResultValidation:true,exactDrawDateRequired:true,conflictsQuarantined:true,overwriteOnConflict:false},failures};
fs.writeFileSync(STATUS,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({...out,failures:failures.length},null,2));
