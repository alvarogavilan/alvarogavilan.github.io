import fs from 'node:fs';

const file='loterias-ai/data/archive/lototurf/2016.json';
const targetOldDate='2016-07-16';
const targetOfficialDate='2016-07-14';
const officialServiceUrl='https://www.loteriasyapuestas.es/servicios/fechav3?game_id=LOTU&fecha_sorteo=20160714';
const officialCalendarUrl='https://www.selae.es/f/loterias/documentos/publicaciones/Bolet%C3%ADn/Boletin46selae.pdf';
const officialPressUrl='https://testportal.selae.es/f/loterias/documentos/Lototurf/Notas%20de%20prensa/NOTA_DE_PRENSA_DE_LOTOTURF_14_7_16.pdf';
const expected={main:[10,13,17,21,24,28],horse:3,reintegro:5};
const apply=process.env.APPLY_OFFICIAL_DATE_CORRECTION==='1';

const normDate=v=>String(v||'').slice(0,10);
const parseCombo=s=>{
  const m=String(s||'').match(/^(.*?)\s+C\(([^)]+)\)\s+R\((\d+)\)/i);
  if(!m) return null;
  const main=(m[1].match(/\d+/g)||[]).map(Number).sort((a,b)=>a-b);
  const horses=[...new Set((m[2].match(/\d+/g)||[]).map(Number))].sort((a,b)=>a-b);
  if(main.length!==6||horses.length!==1) return null;
  return {main,horse:horses[0],reintegro:Number(m[3])};
};

const doc=JSON.parse(fs.readFileSync(file,'utf8'));
const rows=doc.records||[];
const oldRow=rows.find(r=>r.drawDate===targetOldDate);
const correctedRow=rows.find(r=>r.drawDate===targetOfficialDate);
if(oldRow&&correctedRow) throw new Error(`refuse duplicate canonical dates ${targetOldDate} and ${targetOfficialDate}`);
if(!oldRow&&!correctedRow) throw new Error(`missing Lototurf row for ${targetOldDate}/${targetOfficialDate}`);
const row=oldRow||correctedRow;

const currentMain=[...(row.result?.main||[])].map(Number).sort((a,b)=>a-b);
if(currentMain.join(',')!==expected.main.join(',')) throw new Error(`canonical main mismatch: ${currentMain.join(',')}`);
if(Number(row.result?.horse)!==expected.horse) throw new Error(`canonical horse mismatch: ${row.result?.horse}`);
if(Number(row.result?.reintegro)!==expected.reintegro) throw new Error(`canonical reintegro mismatch: ${row.result?.reintegro}`);

const response=await fetch(officialServiceUrl,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'user-agent':'LoteriasAI/1.0 official-only archive repair','accept':'application/json,*/*'}});
if(!response.ok) throw new Error(`official SELAE service HTTP ${response.status}`);
const json=await response.json();
const officialRow=(Array.isArray(json)?json:[]).find(x=>normDate(x?.fecha_sorteo)===targetOfficialDate)||null;
if(!officialRow) throw new Error('SELAE did not return exact official date 2016-07-14');
const official=parseCombo(officialRow.combinacion);
if(!official) throw new Error(`official combination parse failed: ${officialRow.combinacion}`);
if(official.main.join(',')!==expected.main.join(',')) throw new Error(`official main mismatch: ${official.main.join(',')}`);
if(official.horse!==expected.horse) throw new Error(`official horse mismatch: ${official.horse}`);
if(official.reintegro!==expected.reintegro) throw new Error(`official reintegro mismatch: ${official.reintegro}`);

const existingAudit=row.correctionAudit?.lototurf20160714;
const alreadyCorrected=Boolean(
  correctedRow &&
  row.drawId===`lototurf-${targetOfficialDate}` &&
  row.verification?.officialCrossCheck?.status==='MATCH' &&
  row.verification?.officialCrossCheck?.exactDate===true &&
  row.verification?.historicalDateCorrection?.status==='OFFICIAL_DATE_CORRECTION_VERIFIED' &&
  existingAudit?.previous?.drawDate===targetOldDate &&
  existingAudit?.official?.drawDate===targetOfficialDate
);

const diagnostic={
  gameId:'lototurf',
  previousDate:targetOldDate,
  officialDate:targetOfficialDate,
  officialServiceUrl,
  officialCalendarUrl,
  officialPressUrl,
  expected,
  officialDrawId:officialRow.id_sorteo??null,
  alreadyCorrected,
  applyRequested:apply,
  evidence:{
    exactServiceDate:true,
    allResultComponentsMatch:true,
    official2016Calendar:'SELAE calendar lists July 2016 Lototurf draws on 14, 18, 21, 25 and 28; not 16',
    officialPressNote:'SELAE press note for 14/07/2016 publishes 24-17-21-28-13-10, horse 3, reintegro 5'
  },
  policy:{officialOnly:true,noShiftedDatePromotion:true,preservePriorProvenance:true,economicsStillRequiredForFullResolution:true,trainingEligibleUntilEconomics:false,idempotentRepair:true,noInference:true}
};

if(alreadyCorrected){
  if(row.trainingEligible!==false) throw new Error('already-corrected row must remain trainingEligible=false until official economics are resolved');
  if(row.economicsResolution!=='PENDING_OFFICIAL_ECONOMICS') throw new Error(`unexpected economics resolution: ${row.economicsResolution}`);
  console.log(JSON.stringify({...diagnostic,status:'ALREADY_CORRECTED_NO_SEMANTIC_CHANGE'},null,2));
  process.exit(0);
}

if(!oldRow) throw new Error(`row at ${targetOfficialDate} is not a verified prior correction; refusing overwrite`);
if(!apply){
  console.log(JSON.stringify({...diagnostic,status:'DRY_RUN_VERIFIED_OFFICIAL_DATE_CORRECTION'},null,2));
  process.exit(0);
}

const previous={drawId:row.drawId,drawDate:row.drawDate,source:row.source??null,verification:row.verification??null,trainingEligible:row.trainingEligible??null};
row.drawDate=targetOfficialDate;
row.drawId=`lototurf-${targetOfficialDate}`;
row.drawNumber=officialRow.id_sorteo??row.drawNumber;
row.source={provider:'SELAE',tier:'official',url:officialServiceUrl,validation:'official-fechav3-date-correction',archivePreviousSource:previous.source};
row.verification={
  ...(row.verification||{}),
  officialCrossCheck:{provider:'SELAE',exactDate:true,complete:true,status:'MATCH',url:officialServiceUrl,fields:{main:true,horse:true,reintegro:true}},
  historicalDateCorrection:{from:targetOldDate,to:targetOfficialDate,provider:'SELAE',serviceUrl:officialServiceUrl,calendarUrl:officialCalendarUrl,pressUrl:officialPressUrl,status:'OFFICIAL_DATE_CORRECTION_VERIFIED'}
};
row.correctionAudit={
  ...(row.correctionAudit||{}),
  lototurf20160714:{
    correctedAt:new Date().toISOString(),
    reason:'secondary archive date shifted to a non-scheduled day; exact SELAE 14/07/2016 service result matches all components and official 2016 calendar/press evidence corroborates the draw date',
    previous,
    official:{drawDate:targetOfficialDate,result:expected,drawId:officialRow.id_sorteo??null,serviceUrl:officialServiceUrl,calendarUrl:officialCalendarUrl,pressUrl:officialPressUrl}
  }
};
row.trainingEligible=false;
row.economicsResolution='PENDING_OFFICIAL_ECONOMICS';

fs.writeFileSync(file,JSON.stringify(doc,null,2)+'\n');
console.log(JSON.stringify({...diagnostic,status:'OFFICIAL_DATE_CORRECTION_APPLIED',trainingEligible:false,economicsResolution:row.economicsResolution},null,2));
