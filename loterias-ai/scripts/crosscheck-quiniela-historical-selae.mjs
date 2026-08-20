import fs from 'node:fs';

const qdir='loterias-ai/data/archive/quiniela';
const meta='loterias-ai/data/archive/_meta';
const reportPath=`${meta}/quiniela-historical-selae-crosscheck.json`;
const limit=Math.max(1,Number(process.env.BATCH_LIMIT||120));
const fetchConcurrency=Math.max(1,Math.min(6,Number(process.env.FETCH_CONCURRENCY||4)));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const signs=a=>(a||[]).map(x=>String(x??'').trim().toUpperCase()).filter(Boolean);
const storedMain=a=>{let x=signs(a);if(x.length>=15&&!['1','X','2'].includes(x[0]))x=x.slice(1);return x.slice(0,14)};
const num=x=>{const n=Number(String(x??'').replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:null};
const normDate=v=>String(v||'').slice(0,10);
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
const stable=value=>{
  if(Array.isArray(value)) return value.map(stable);
  if(value&&typeof value==='object') return Object.fromEntries(Object.entries(value).filter(([k])=>k!=='generatedAt').map(([k,v])=>[k,stable(v)]));
  return value;
};
const sameSemantic=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

async function mapLimit(items, concurrency, worker){
  const out=new Array(items.length);
  let cursor=0;
  const runners=Array.from({length:Math.min(concurrency,items.length)},async()=>{
    while(true){
      const index=cursor++;
      if(index>=items.length) break;
      out[index]=await worker(items[index],index);
    }
  });
  await Promise.all(runners);
  return out;
}

async function getOfficial(date){
  const url=`https://www.loteriasyapuestas.es/servicios/fechav3?game_id=LAQU&fecha_sorteo=${date.replaceAll('-','')}`;
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'user-agent':'Mozilla/5.0 LoteriasAI scientific archive','accept':'*/*'}});
      if(r.status===404)return {url,row:null,reason:'HTTP_404'};
      if(!r.ok){last=new Error(`HTTP ${r.status}`);}
      else {
        const json=await r.json();
        const rows=Array.isArray(json)?json:[];
        const row=rows.find(x=>normDate(x?.fecha_sorteo)===date)||null;
        return {url,row,reason:row?null:'EXACT_DATE_NOT_RETURNED'};
      }
    }catch(e){last=e}
    await sleep(attempt*450);
  }
  throw last||new Error('official SELAE fetch failed');
}

const docs=new Map();
const targets=[];
let alreadyComplete=0,alreadyNotFound=0,alreadyPartial=0,alreadyConflict=0;
for(const file of fs.readdirSync(qdir).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const path=`${qdir}/${file}`;
  const doc=JSON.parse(fs.readFileSync(path,'utf8'));
  docs.set(file,{path,doc});
  for(const row of doc.records||[]){
    if(!row.drawDate||row.drawDate>='2020-01-01')continue;
    const verification=row.verification||{};
    const cross=verification.officialCrossCheck||{};
    if(cross.provider==='SELAE'&&cross.complete===true){alreadyComplete++;continue}
    if(verification.status==='OFFICIAL_SELAE_NOT_FOUND'&&cross.provider==='SELAE'&&cross.status==='NOT_FOUND'){alreadyNotFound++;continue}
    if(verification.status==='OFFICIAL_SELAE_PARTIAL'&&cross.provider==='SELAE'&&cross.status==='PARTIAL'){alreadyPartial++;continue}
    if(verification.status==='OFFICIAL_CONFLICT_QUARANTINED'){alreadyConflict++;continue}
    targets.push({file,row});
  }
}
targets.sort((a,b)=>b.row.drawDate.localeCompare(a.row.drawDate));

let verified=0,empty=0,partial=0,mismatch=0;
const failures=[];
const changedFiles=new Set();
const batch=targets.slice(0,limit);
const fetched=await mapLimit(batch,fetchConcurrency,async ({row})=>{
  try {
    return {ok:true,official:await getOfficial(row.drawDate)};
  } catch(e) {
    return {ok:false,error:String(e)};
  }
});

for(let i=0;i<batch.length;i++){
  const {file,row}=batch[i];
  const fetchResult=fetched[i];
  if(!fetchResult?.ok){
    failures.push({drawDate:row.drawDate,reason:fetchResult?.error||'official SELAE fetch failed'});
    continue;
  }
  const {url,row:official,reason}=fetchResult.official;
  if(!official){
    empty++;
    row.trainingEligible=false;
    row.verification={...(row.verification||{}),status:'OFFICIAL_SELAE_NOT_FOUND',officialCrossCheck:{provider:'SELAE',exactDate:false,complete:false,status:'NOT_FOUND',reason:reason||'NO_OFFICIAL_ROW',url,fields:{outcomes:false}}};
    changedFiles.add(file);
    continue;
  }
  const partidos=(official.partidos||[]).map((p,index)=>({position:index+1,home:String(p.local||'').trim(),away:String(p.visitante||'').trim(),sign:String(p.signo||'').trim().toUpperCase(),score:String(p.marcador||'').replace(/\s+/g,'')}));
  if(partidos.length!==15){
    partial++;
    row.trainingEligible=false;
    row.verification={...(row.verification||{}),status:'OFFICIAL_SELAE_PARTIAL',officialCrossCheck:{provider:'SELAE',officialDrawId:official.id_sorteo||null,exactDate:true,complete:false,status:'PARTIAL',reason:'OFFICIAL_PARTIDOS_COUNT_INCOMPLETE',url,partyCount:partidos.length,fields:{outcomes:false,drawId:Boolean(official.id_sorteo)}}};
    changedFiles.add(file);
    continue;
  }
  const officialMain=partidos.slice(0,14).map(p=>p.sign);
  const stored=storedMain(row.result?.outcomes||[]);
  if(stored.length!==14||stored.join(',')!==officialMain.join(',')){
    mismatch++;
    failures.push({drawDate:row.drawDate,reason:'OFFICIAL_RESULT_MISMATCH_QUARANTINED',stored,official:officialMain,trainingEligible:false});
    row.trainingEligible=false;
    row.verification={...(row.verification||{}),status:'OFFICIAL_CONFLICT_QUARANTINED',officialCrossCheck:{provider:'SELAE',exactDate:true,complete:false,status:'MISMATCH',url,fields:{outcomes:false}}};
    changedFiles.add(file);
    continue;
  }
  const previousSource=provenanceLeaf(row.source);
  row.drawNumber=official.id_sorteo||row.drawNumber;
  row.season=official.temporada||row.season;
  row.jornada=num(official.jornada)??row.jornada;
  row.result={outcomes:partidos.map(p=>p.sign),matches:partidos};
  row.economics={currency:'EUR',ticketCost:.75,stakes:num(official.apuestas),revenue:num(official.recaudacion),jackpot:num(official.premio_bote),prizePool:num(official.premios),rolloverFund:num(official.fondo_bote),categories:(official.escrutinio||[]).map(x=>({category:Number(x.categoria),label:String(x.tipo||'').trim(),winners:num(x.ganadores),prize:num(x.premio)})),source:{provider:'SELAE',url,capturedAt:new Date().toISOString()},validation:{status:'OFFICIAL_PARSED',officialSELAE:true}};
  row.source={provider:'SELAE',tier:'official',url,validation:'official-fechav3-historical',archivePreviousSource:previousSource};
  row.verification={status:'OFFICIAL_SELAE_VALIDATED',officialCrossCheck:{provider:'SELAE',officialDrawId:official.id_sorteo||null,exactDate:true,complete:true,status:'MATCH',url,fields:{outcomes:true,drawId:Boolean(official.id_sorteo)}}};
  row.trainingEligible=true;
  changedFiles.add(file);
  verified++;
}

for(const file of changedFiles){
  const {path,doc}=docs.get(file);
  fs.writeFileSync(path,JSON.stringify(doc,null,2)+'\n');
}
fs.mkdirSync(meta,{recursive:true});

let completeNow=0,notFoundNow=0,partialNow=0,conflictNow=0,unprocessedNow=0;
for(const {doc} of docs.values()) for(const row of doc.records||[]){
  if(!row.drawDate||row.drawDate>='2020-01-01')continue;
  const verification=row.verification||{};
  const cross=verification.officialCrossCheck||{};
  if(cross.provider==='SELAE'&&cross.complete===true) completeNow++;
  else if(verification.status==='OFFICIAL_SELAE_NOT_FOUND'&&cross.status==='NOT_FOUND') notFoundNow++;
  else if(verification.status==='OFFICIAL_SELAE_PARTIAL'&&cross.status==='PARTIAL') partialNow++;
  else if(verification.status==='OFFICIAL_CONFLICT_QUARANTINED') conflictNow++;
  else unprocessedNow++;
}

const report={
  generatedAt:new Date().toISOString(),
  gameId:'quiniela',
  scope:'dated-canonical-pre-2020',
  attempted:Math.min(limit,targets.length),
  verified,
  empty,
  partial,
  mismatch,
  failures,
  remainingTargets:unprocessedNow,
  cumulative:{officiallyVerified:completeNow,officialNotFound:notFoundNow,officialPartial:partialNow,officialConflicts:conflictNow,unprocessed:unprocessedNow},
  execution:{fetchConcurrency},
  guards:{
    exactDate:true,
    exactOfficialResponseDateRequired:true,
    exactStored14VsOfficial14:true,
    pleno15TakenOnlyAfterMainMatch:true,
    mismatchesQuarantined:true,
    official404MarkedFailClosedAndSkippedByThisPrimaryRoute:true,
    exactDateMissMarkedFailClosedAndSkippedByThisPrimaryRoute:true,
    partialOfficialRowsMarkedFailClosedAndSkippedByThisPrimaryRoute:true,
    terminalBlockersDoNotPreventOlderDatesFromBeingScanned:true,
    fetchFailuresRemainRetryable:true,
    boundedConcurrentOfficialFetches:true,
    provenanceHistoryFlattened:true,
    noInference:true,
    realMoney:false
  }
};
const previous=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')):null;
if(!previous||!sameSemantic(previous,report)) fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
else console.log('NO_SEMANTIC_REPORT_CHANGE');
console.log(JSON.stringify({...report,failures:failures.length,changedFiles:[...changedFiles].sort()},null,2));
