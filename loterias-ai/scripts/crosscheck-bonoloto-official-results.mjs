import fs from 'node:fs';
import path from 'node:path';

const DIR='loterias-ai/data/archive/bonoloto';
const META='loterias-ai/data/archive/_meta';
const STATUS=`${META}/bonoloto-official-result-crosscheck.json`;
const CONFLICTS=`${META}/bonoloto-official-result-conflicts.json`;
const RESOLUTIONS=`${META}/bonoloto-official-conflict-resolutions.json`;
const LIMIT=Math.max(1,Number(process.env.BATCH_LIMIT||120));
const UA='Mozilla/5.0 LoteriasAI official result cross-check';
const now=new Date().toISOString();
fs.mkdirSync(META,{recursive:true});

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const normDate=v=>String(v||'').slice(0,10);
const sorted=a=>(a||[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const storedInt=v=>v===null||v===undefined||v===''?null:Number(v);
const key=a=>sorted(a).join('-');

const resolutionDoc=fs.existsSync(RESOLUTIONS)?JSON.parse(fs.readFileSync(RESOLUTIONS,'utf8')):{resolutions:[]};
const resolutionMap=new Map((resolutionDoc.resolutions||[]).filter(r=>r?.drawDate&&r?.canonical?.numbers).map(r=>[r.drawDate,r]));

async function getOfficial(drawDate){
  const url=`https://www.loteriasyapuestas.es/servicios/fechav3?game_id=BONO&fecha_sorteo=${drawDate.replaceAll('-','')}`;
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'user-agent':UA,'accept':'application/json,text/plain,*/*'}});
      if(response.status===404)return {url,row:null,reason:'HTTP_404'};
      if(!response.ok) lastError=new Error(`HTTP ${response.status}`);
      else {
        const json=await response.json();
        const rows=Array.isArray(json)?json:[];
        const row=rows.find(x=>normDate(x?.fecha_sorteo)===drawDate)||null;
        return {url,row,reason:row?null:'EXACT_DATE_NOT_RETURNED'};
      }
    }catch(error){lastError=error;}
    await sleep(attempt*500);
  }
  throw lastError||new Error('official SELAE fetch failed');
}

function parseCombination(raw){
  const text=String(raw||'').trim();
  const beforeC=text.split(/\bC\s*\(/i)[0];
  const main=(beforeC.match(/\b\d{1,2}\b/g)||[]).map(Number).filter(n=>n>=1&&n<=49).slice(0,6).sort((a,b)=>a-b);
  const cm=text.match(/\bC\s*\(\s*(\d{1,2})\s*\)/i);
  const rm=text.match(/\bR\s*\(\s*(\d)\s*\)/i);
  return {main,complementary:cm?Number(cm[1]):null,reintegro:rm?Number(rm[1]):null,raw:text};
}

function applyResolvedAuthority(record,resolution){
  const canonical=resolution?.canonical||{};
  const matches=key(record.result?.main)===key(canonical.numbers)
    && Number(record.result?.complementary)===Number(canonical.complementario)
    && Number(record.result?.reintegro)===Number(canonical.reintegro);
  if(!matches) throw new Error(`Resolved-authority guard failed ${record.drawDate}: canonical tuple no longer matches stored row`);
  const prev=record.verification&&typeof record.verification==='object'?record.verification:{};
  const checks=(Array.isArray(prev.checks)?prev.checks:[]).filter(c=>c!=='official-selae-conflict-quarantined');
  if(!checks.includes('official-boe-result-validation'))checks.push('official-boe-result-validation');
  if(!checks.includes('selae-series-date-shift-diagnosed'))checks.push('selae-series-date-shift-diagnosed');
  record.verification={
    ...prev,
    status:'OFFICIAL_BOE_VALIDATED',
    checks,
    authorityResolution:{
      provider:'BOE',
      official:true,
      reference:resolution.evidence?.find(e=>e.provider==='BOE')?.reference||null,
      reviewedAt:resolution.reviewedAt||null,
      resolutionStatus:resolution.status,
      canonical,
      seriesActuallyMatchesDrawDate:resolution.seriesActuallyMatchesDrawDate||null,
      complete:true,
    },
  };
  delete record.verification.officialCrossCheck;
  record.trainingEligible=true;
}

const docs=new Map();
const targets=[];
let authorityResolved=0;
for(const file of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort().reverse()){
  const p=path.join(DIR,file);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  docs.set(file,{p,doc});
  let changedByResolution=false;
  for(const record of doc.records||[]){
    if(!record?.drawDate)continue;
    const resolution=resolutionMap.get(record.drawDate);
    if(resolution){
      applyResolvedAuthority(record,resolution);
      authorityResolved++;
      changedByResolution=true;
      continue;
    }
    if(record.verification?.officialCrossCheck?.provider==='SELAE'&&record.verification?.officialCrossCheck?.complete===true&&record.verification?.status==='OFFICIAL_SELAE_VALIDATED')continue;
    targets.push({file,record});
  }
  if(changedByResolution)fs.writeFileSync(p,JSON.stringify(doc,null,2)+'\n');
}
targets.sort((a,b)=>b.record.drawDate.localeCompare(a.record.drawDate));

const existingConflicts=fs.existsSync(CONFLICTS)?JSON.parse(fs.readFileSync(CONFLICTS,'utf8')):{conflicts:[]};
const conflictMap=new Map((existingConflicts.conflicts||[]).filter(x=>!resolutionMap.has(x.date)).map(x=>[x.date,x]));
let attempted=0,validated=0,partial=0,empty=0,failed=0;
const newConflicts=[];
const failures=[];
const touched=new Set();

for(const [index,target] of targets.slice(0,LIMIT).entries()){
  const r=target.record;
  attempted++;
  try{
    const {url,row,reason}=await getOfficial(r.drawDate);
    if(!row){empty++;failures.push({date:r.drawDate,reason:reason||'NO_OFFICIAL_ROW',url});continue;}
    const parsed=parseCombination(row.combinacion);
    const storedMain=sorted(r.result?.main);
    const storedComplementary=storedInt(r.result?.complementary);
    const storedReintegro=storedInt(r.result?.reintegro);
    const mainParsed=parsed.main.length===6&&new Set(parsed.main).size===6;
    const complementaryParsed=Number.isInteger(parsed.complementary)&&parsed.complementary>=1&&parsed.complementary<=49;
    const reintegroParsed=Number.isInteger(parsed.reintegro)&&parsed.reintegro>=0&&parsed.reintegro<=9;
    const fields={
      main:mainParsed&&storedMain.length===6&&same(parsed.main,storedMain),
      complementary:complementaryParsed&&Number.isInteger(storedComplementary)&&parsed.complementary===storedComplementary,
      reintegro:reintegroParsed&&Number.isInteger(storedReintegro)&&parsed.reintegro===storedReintegro
    };
    const parseComplete=mainParsed&&complementaryParsed&&reintegroParsed;
    const complete=parseComplete&&fields.main&&fields.complementary&&fields.reintegro;
    const mismatch=(mainParsed&&storedMain.length===6&&!fields.main)
      ||(complementaryParsed&&Number.isInteger(storedComplementary)&&!fields.complementary)
      ||(reintegroParsed&&Number.isInteger(storedReintegro)&&!fields.reintegro);

    if(mismatch){
      const conflict={date:r.drawDate,reason:'OFFICIAL_RESULT_COMPONENT_MISMATCH',stored:{main:storedMain,complementary:storedComplementary,reintegro:storedReintegro},official:{main:parsed.main,complementary:parsed.complementary,reintegro:parsed.reintegro,raw:parsed.raw},url};
      newConflicts.push(conflict); conflictMap.set(r.drawDate,conflict); continue;
    }

    const previousVerification=r.verification&&typeof r.verification==='object'?r.verification:{};
    const checks=[...(Array.isArray(previousVerification.checks)?previousVerification.checks:[])];
    const addCheck=check=>{if(!checks.includes(check))checks.push(check)};
    addCheck('official-fechav3-exact-date');
    if(fields.main)addCheck('official-main-cross-check');
    if(fields.complementary)addCheck('official-complementary-cross-check');
    if(fields.reintegro)addCheck('official-reintegro-cross-check');
    r.verification={...previousVerification,...(complete?{status:'OFFICIAL_SELAE_VALIDATED'}:{}),checks,officialCrossCheck:{provider:'SELAE',sourceUrl:url,checkedAt:now,officialDrawId:row.id_sorteo||null,exactDate:true,fields,complete,officialResult:{main:parsed.main,complementary:parsed.complementary,reintegro:parsed.reintegro}}};
    touched.add(target.file);
    if(complete){validated++;conflictMap.delete(r.drawDate);}else partial++;
  }catch(error){failed++;failures.push({date:r.drawDate,reason:String(error?.message||error)});}
  if(index%20===19)await sleep(250);
}

for(const file of touched){const {p,doc}=docs.get(file);fs.writeFileSync(p,JSON.stringify(doc,null,2)+'\n');}
let total=0,officiallyValidated=0,componentCrossChecked=0,authorityValidated=0;
for(const {doc} of docs.values())for(const r of doc.records||[]){
  total++;
  if(r.verification?.officialCrossCheck?.provider==='SELAE')componentCrossChecked++;
  if(r.verification?.officialCrossCheck?.provider==='SELAE'&&r.verification?.officialCrossCheck?.complete===true&&r.verification?.status==='OFFICIAL_SELAE_VALIDATED')officiallyValidated++;
  if(r.verification?.authorityResolution?.provider==='BOE'&&r.verification?.authorityResolution?.complete===true&&r.verification?.status==='OFFICIAL_BOE_VALIDATED')authorityValidated++;
}
const conflictDoc={generatedAt:now,gameId:'bonoloto',policy:'QUARANTINE_DO_NOT_OVERWRITE_ARCHIVE_RESULT; BOE-resolved SELAE date-shifts are excluded from open conflicts',conflicts:[...conflictMap.values()].sort((a,b)=>a.date.localeCompare(b.date))};
fs.writeFileSync(CONFLICTS,JSON.stringify(conflictDoc,null,2)+'\n');
const out={generatedAt:now,gameId:'bonoloto',source:'SELAE /servicios/fechav3 game_id=BONO + official BOE conflict resolutions',attempted,validated,authorityResolved,authorityValidated,partial,empty,failed,newConflicts:newConflicts.length,openConflicts:conflictDoc.conflicts.length,totalRecords:total,componentCrossChecked,officiallyValidated,remaining:Math.max(0,targets.length-validated),qualityPass:conflictDoc.conflicts.length===0,guards:{economicsDoesNotImplyResultValidation:true,exactDrawDateRequired:true,mainPlusComplementaryPlusReintegroRequired:true,conflictsQuarantined:true,overwriteOnConflict:false,officialAuthorityResolutionCanSupersedeKnownSELAEDateShift:true},failures};
fs.writeFileSync(STATUS,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,failures:failures.length},null,2));
