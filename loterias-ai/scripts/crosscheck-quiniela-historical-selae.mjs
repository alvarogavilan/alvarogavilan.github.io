import fs from 'node:fs';

const qdir='loterias-ai/data/archive/quiniela';
const meta='loterias-ai/data/archive/_meta';
const limit=Math.max(1,Number(process.env.BATCH_LIMIT||120));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const signs=a=>(a||[]).map(x=>String(x??'').trim().toUpperCase()).filter(Boolean);
const storedMain=a=>{let x=signs(a);if(x.length>=15&&!['1','X','2'].includes(x[0]))x=x.slice(1);return x.slice(0,14)};
const num=x=>{const n=Number(String(x??'').replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:null};

async function getOfficial(date){
  const url=`https://www.loteriasyapuestas.es/servicios/fechav3?game_id=LAQU&fecha_sorteo=${date.replaceAll('-','')}`;
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'user-agent':'Mozilla/5.0 LoteriasAI scientific archive','accept':'*/*'}});
      if(r.ok)return {url,json:await r.json()};
      if(r.status===404)return {url,json:[]};
      last=new Error(`HTTP ${r.status}`);
    }catch(e){last=e}
    await sleep(attempt*450);
  }
  throw last;
}

const docs=new Map();
const targets=[];
for(const file of fs.readdirSync(qdir).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const path=`${qdir}/${file}`;
  const doc=JSON.parse(fs.readFileSync(path,'utf8'));
  docs.set(file,{path,doc});
  for(const row of doc.records||[]){
    if(!row.drawDate||row.drawDate>='2020-01-01')continue;
    if(row.verification?.officialCrossCheck?.provider==='SELAE'&&row.verification?.officialCrossCheck?.complete===true)continue;
    targets.push({file,row});
  }
}
targets.sort((a,b)=>b.row.drawDate.localeCompare(a.row.drawDate));

let verified=0,empty=0,mismatch=0;
const failures=[];
for(const [i,{row}] of targets.slice(0,limit).entries()){
  try{
    const {url,json}=await getOfficial(row.drawDate);
    const official=Array.isArray(json)?json[0]:null;
    if(!official){empty++;continue}
    const partidos=(official.partidos||[]).map((p,index)=>({position:index+1,home:String(p.local||'').trim(),away:String(p.visitante||'').trim(),sign:String(p.signo||'').trim().toUpperCase(),score:String(p.marcador||'').replace(/\s+/g,'')}));
    if(partidos.length!==15){failures.push({drawDate:row.drawDate,reason:'party-count',count:partidos.length});continue}
    const officialMain=partidos.slice(0,14).map(p=>p.sign);
    const stored=storedMain(row.result?.outcomes||[]);
    if(stored.length!==14||stored.join(',')!==officialMain.join(',')){
      mismatch++;
      failures.push({drawDate:row.drawDate,reason:'OFFICIAL_RESULT_MISMATCH_QUARANTINED',stored,official:officialMain,trainingEligible:false});
      row.trainingEligible=false;
      row.verification={...(row.verification||{}),status:'OFFICIAL_CONFLICT_QUARANTINED',officialCrossCheck:{provider:'SELAE',exactDate:true,complete:false,url,fields:{outcomes:false}}};
      continue;
    }
    const previousSource=row.source;
    row.drawNumber=official.id_sorteo||row.drawNumber;
    row.season=official.temporada||row.season;
    row.jornada=num(official.jornada)??row.jornada;
    row.result={outcomes:partidos.map(p=>p.sign),matches:partidos};
    row.economics={currency:'EUR',ticketCost:.75,stakes:num(official.apuestas),revenue:num(official.recaudacion),jackpot:num(official.premio_bote),prizePool:num(official.premios),rolloverFund:num(official.fondo_bote),categories:(official.escrutinio||[]).map(x=>({category:Number(x.categoria),label:String(x.tipo||'').trim(),winners:num(x.ganadores),prize:num(x.premio)})),source:{provider:'SELAE',url,capturedAt:new Date().toISOString()},validation:{status:'OFFICIAL_PARSED',officialSELAE:true}};
    row.source={provider:'SELAE',tier:'official',url,validation:'official-fechav3-historical',archivePreviousSource:previousSource};
    row.verification={status:'OFFICIAL_SELAE_VALIDATED',officialCrossCheck:{provider:'SELAE',exactDate:true,complete:true,url,fields:{outcomes:true,drawId:Boolean(official.id_sorteo)}}};
    row.trainingEligible=true;
    verified++;
  }catch(e){failures.push({drawDate:row.drawDate,reason:String(e)})}
  if(i%20===19)await sleep(250);
}

for(const {path,doc} of docs.values())fs.writeFileSync(path,JSON.stringify(doc,null,2)+'\n');
fs.mkdirSync(meta,{recursive:true});
const report={generatedAt:new Date().toISOString(),gameId:'quiniela',scope:'dated-canonical-pre-2020',attempted:Math.min(limit,targets.length),verified,empty,mismatch,failures,remainingTargets:Math.max(0,targets.length-Math.min(limit,targets.length)),guards:{exactDate:true,exactStored14VsOfficial14:true,pleno15TakenOnlyAfterMainMatch:true,mismatchesQuarantined:true,noInference:true,realMoney:false}};
fs.writeFileSync(`${meta}/quiniela-historical-selae-crosscheck.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,failures:failures.length},null,2));