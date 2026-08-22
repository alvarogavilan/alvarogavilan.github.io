import fs from 'node:fs';

const file='loterias-ai/data/archive/lototurf/2011.json';
const targetOldDate='2011-07-17';
const targetOfficialDate='2011-07-16';
const officialUrl='https://www.loteriasyapuestas.es/va/lototurf/resultados/lototurf-resultados-del-s-aacute-bado-16-de-julio-de-2011';
const expected={main:[5,10,20,24,25,30],horse:2,reintegro:8};
const apply=process.env.APPLY_OFFICIAL_DATE_CORRECTION==='1';

const doc=JSON.parse(fs.readFileSync(file,'utf8'));
const rows=doc.records||[];
const row=rows.find(r=>r.drawDate===targetOldDate);
if(!row) throw new Error(`missing canonical Lototurf row ${targetOldDate}`);
if(rows.some(r=>r.drawDate===targetOfficialDate)) throw new Error(`refuse duplicate official date ${targetOfficialDate}`);

const currentMain=[...(row.result?.main||[])].map(Number).sort((a,b)=>a-b);
const expectedMain=[...expected.main].sort((a,b)=>a-b);
if(currentMain.join(',')!==expectedMain.join(',')) throw new Error(`canonical main mismatch: ${currentMain.join(',')}`);
if(Number(row.result?.horse)!==expected.horse) throw new Error(`canonical horse mismatch: ${row.result?.horse}`);
if(Number(row.result?.reintegro)!==expected.reintegro) throw new Error(`canonical reintegro mismatch: ${row.result?.reintegro}`);

const response=await fetch(officialUrl,{redirect:'follow',signal:AbortSignal.timeout(18000),headers:{'user-agent':'LoteriasAI/1.0 official-only archive repair','accept':'text/html,*/*'}});
if(!response.ok) throw new Error(`official page HTTP ${response.status}`);
const html=await response.text();
const text=html.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
const guards={
  officialDate:text.includes('16/07/2011')||/16\s+de\s+julio\s+de\s+2011/i.test(text),
  main:expected.main.every(n=>new RegExp(`(^|\\D)${n}(\\D|$)`).test(text)),
  horse:/C\s*\(\s*2\s*\)/i.test(text)||/Caballo ganador[^0-9]*2/i.test(text),
  reintegro:/R\s*\(\s*8\s*\)/i.test(text)||/Reintegro[^0-9]*8/i.test(text)
};
if(!Object.values(guards).every(Boolean)) throw new Error(`official page verification failed: ${JSON.stringify(guards)}`);

const diagnostic={
  gameId:'lototurf',
  previousDate:targetOldDate,
  officialDate:targetOfficialDate,
  officialUrl,
  expected,
  guards,
  applyRequested:apply,
  policy:{officialOnly:true,noShiftedDatePromotion:true,preservePriorProvenance:true,economicsStillRequiredForFullResolution:true,trainingEligibleUntilEconomics:false}
};

if(!apply){
  console.log(JSON.stringify({...diagnostic,status:'DRY_RUN_VERIFIED_OFFICIAL_DATE_CORRECTION'},null,2));
  process.exit(0);
}

const previous={drawId:row.drawId,drawDate:row.drawDate,source:row.source??null,verification:row.verification??null,trainingEligible:row.trainingEligible??null};
row.drawDate=targetOfficialDate;
row.drawId=`lototurf-${targetOfficialDate}`;
row.source={
  provider:'SELAE',
  tier:'official',
  url:officialUrl,
  validation:'official-public-result-page-date-correction',
  archivePreviousSource:previous.source
};
row.verification={
  ...(row.verification||{}),
  officialCrossCheck:{provider:'SELAE',exactDate:true,complete:true,status:'MATCH',url:officialUrl,fields:{main:true,horse:true,reintegro:true}},
  historicalDateCorrection:{from:targetOldDate,to:targetOfficialDate,provider:'SELAE',url:officialUrl,status:'OFFICIAL_DATE_CORRECTION_VERIFIED'}
};
row.correctionAudit={
  ...(row.correctionAudit||{}),
  lototurf20110716:{correctedAt:new Date().toISOString(),reason:'secondary archive date shifted by +1 day; exact official SELAE result page matches all result components',previous,official:{drawDate:targetOfficialDate,result:expected,url:officialUrl}}
};
// Result components are now official, but this historical row still lacks strict official economics.
row.trainingEligible=false;
row.economicsResolution='PENDING_OFFICIAL_ECONOMICS';

fs.writeFileSync(file,JSON.stringify(doc,null,2)+'\n');
console.log(JSON.stringify({...diagnostic,status:'OFFICIAL_DATE_CORRECTION_APPLIED',trainingEligible:false,economicsResolution:row.economicsResolution},null,2));
