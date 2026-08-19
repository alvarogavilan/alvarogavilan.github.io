import fs from 'node:fs';

const DIR='loterias-ai/data/archive/euromillones';
const META='loterias-ai/data/archive/_meta';
const STATUS=`${META}/euromillones-official-current-sync.json`;
const CONFLICTS=`${META}/euromillones-official-current-conflicts.json`;
const MAX_LOOKBACK_DAYS=Math.max(1,Math.min(31,Number(process.env.MAX_LOOKBACK_DAYS||14)));
fs.mkdirSync(META,{recursive:true});

const now=new Date();
const nowIso=now.toISOString();
const isoDate=d=>d.toISOString().slice(0,10);
const normDate=v=>String(v||'').slice(0,10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const money=v=>{if(v==null||v==='')return null;const n=Number(String(v).replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:null;};
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const sorted=a=>(a||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);

function parseOfficial(row){
  const combo=(String(row?.combinacion||'').match(/\d{1,2}/g)||[]).map(Number);
  const main=combo.slice(0,5).sort((a,b)=>a-b);
  const stars=combo.slice(5,7).sort((a,b)=>a-b);
  const validMain=main.length===5&&new Set(main).size===5&&main.every(n=>n>=1&&n<=50);
  const validStars=stars.length===2&&new Set(stars).size===2&&stars.every(n=>n>=1&&n<=12);
  return {main,stars,validMain,validStars,raw:String(row?.combinacion||'')};
}

async function fetchOfficial(date){
  const url=`https://www.loteriasyapuestas.es/servicios/fechav3?game_id=EMIL&fecha_sorteo=${date.replaceAll('-','')}`;
  let last=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const res=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'user-agent':'Mozilla/5.0 LoteriasAI Euromillones current official sync','accept':'application/json,text/plain,*/*'}});
      if(res.status===404)return {url,row:null,reason:'HTTP_404'};
      if(!res.ok){last=new Error(`HTTP ${res.status}`);}
      else {
        const json=await res.json();
        const rows=Array.isArray(json)?json:[];
        const row=rows.find(x=>normDate(x?.fecha_sorteo)===date&&String(x?.game_id||'')==='EMIL')||null;
        return {url,row,reason:row?null:'EXACT_DATE_NOT_RETURNED'};
      }
    }catch(e){last=e;}
    await sleep(attempt*400);
  }
  throw last||new Error('SELAE current sync failed');
}

const docs=new Map();
const byDate=new Map();
let latest=null;
for(const file of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const p=`${DIR}/${file}`,doc=JSON.parse(fs.readFileSync(p,'utf8'));
  docs.set(file,{p,doc});
  for(const record of doc.records||[]){
    if(!record?.drawDate)continue;
    byDate.set(record.drawDate,{file,record});
    if(!latest||record.drawDate>latest)latest=record.drawDate;
  }
}

const start=new Date(now);start.setUTCDate(start.getUTCDate()-MAX_LOOKBACK_DAYS);start.setUTCHours(0,0,0,0);
if(latest){const afterLatest=new Date(`${latest}T00:00:00Z`);afterLatest.setUTCDate(afterLatest.getUTCDate()+1);if(afterLatest>start)start.setTime(afterLatest.getTime());}
const targetDates=[];
for(let d=new Date(start);d<=now;d.setUTCDate(d.getUTCDate()+1)){
  const dow=d.getUTCDay();
  if(dow===2||dow===5)targetDates.push(isoDate(d));
}

const oldConflictDoc=fs.existsSync(CONFLICTS)?JSON.parse(fs.readFileSync(CONFLICTS,'utf8')):{conflicts:[]};
const conflictMap=new Map((oldConflictDoc.conflicts||[]).map(x=>[x.date,x]));
let attempted=0,inserted=0,alreadyPresent=0,empty=0,failed=0;
const failures=[],insertedDates=[];

for(const [i,date] of targetDates.entries()){
  attempted++;
  try{
    const {url,row,reason}=await fetchOfficial(date);
    if(!row){empty++;failures.push({date,reason:reason||'NO_OFFICIAL_ROW',url});continue;}
    const parsed=parseOfficial(row);
    if(!parsed.validMain||!parsed.validStars){failed++;failures.push({date,reason:'INCOMPLETE_OFFICIAL_5PLUS2',official:{main:parsed.main,stars:parsed.stars,raw:parsed.raw},url});continue;}
    const existing=byDate.get(date)?.record||null;
    if(existing){
      const storedMain=sorted(existing.result?.main),storedStars=sorted(existing.result?.stars);
      if(!same(storedMain,parsed.main)||!same(storedStars,parsed.stars)){
        conflictMap.set(date,{date,reason:'OFFICIAL_CURRENT_5PLUS2_MISMATCH',stored:{main:storedMain,stars:storedStars},official:{main:parsed.main,stars:parsed.stars,raw:parsed.raw},url});
      }else {alreadyPresent++;conflictMap.delete(date);}
      continue;
    }
    const year=Number(date.slice(0,4)),file=`${year}.json`;
    if(!docs.has(file))docs.set(file,{p:`${DIR}/${file}`,doc:{gameId:'euromillones',year,records:[]}});
    const record={
      drawId:`euromillones-${date}`,
      gameId:'euromillones',
      drawDate:date,
      result:{main:parsed.main,stars:parsed.stars},
      source:{official:true,provider:'SELAE',service:'fechav3',url,retrievedAt:nowIso},
      economics:{
        currency:'EUR',ticketCost:2.5,stakes:money(row.apuestas),revenue:money(row.recaudacion),jackpot:money(row.premio_bote),prizePool:money(row.premios),rolloverFund:money(row.fondo_bote),
        categories:(row.escrutinio||[]).map(x=>({category:x.categoria??null,label:String(x.tipo||'').trim(),winners:money(x.ganadores),prize:money(x.premio)})),
        source:{provider:'SELAE',url,capturedAt:nowIso},validation:{status:'OFFICIAL_PARSED',officialSELAE:true}
      },
      official:{drawId:row.id_sorteo||null,drawNumber:row.numero||row.num_sorteo||null,selaeCode:'EMIL'},
      verification:{status:'OFFICIAL_SELAE_VALIDATED',checks:['official-fechav3-exact-date','official-main-cross-check','official-stars-cross-check'],officialCrossCheck:{provider:'SELAE',sourceUrl:url,checkedAt:nowIso,officialDrawId:row.id_sorteo||null,exactDate:true,fields:{main:true,stars:true},complete:true,officialResult:{main:parsed.main,stars:parsed.stars}}}
    };
    docs.get(file).doc.records.push(record);
    docs.get(file).doc.records.sort((a,b)=>String(a.drawDate).localeCompare(String(b.drawDate)));
    byDate.set(date,{file,record});
    inserted++;insertedDates.push(date);conflictMap.delete(date);
  }catch(e){failed++;failures.push({date,reason:String(e?.message||e)});}
  if(i%5===4)await sleep(200);
}

for(const {p,doc} of docs.values())fs.writeFileSync(p,JSON.stringify(doc,null,2)+'\n');
const conflictDoc={generatedAt:nowIso,gameId:'euromillones',policy:'QUARANTINE_DO_NOT_OVERWRITE_ARCHIVE_RESULT',conflicts:[...conflictMap.values()].sort((a,b)=>a.date.localeCompare(b.date))};
fs.writeFileSync(CONFLICTS,JSON.stringify(conflictDoc,null,2)+'\n');
const out={generatedAt:nowIso,gameId:'euromillones',source:'SELAE /servicios/fechav3 game_id=EMIL',latestBefore:latest,targetDates,attempted,inserted,insertedDates,alreadyPresent,empty,failed,openConflicts:conflictDoc.conflicts.length,qualityPass:conflictDoc.conflicts.length===0,guards:{exactDateRequired:true,complete5plus2Required:true,officialSourceOnly:true,noSecondaryFill:true,overwriteOnConflict:false,conflictsQuarantined:true},failures};
fs.writeFileSync(STATUS,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,failures:failures.length},null,2));
