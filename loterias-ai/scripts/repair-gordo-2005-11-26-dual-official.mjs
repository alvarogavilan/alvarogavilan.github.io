import fs from 'node:fs';

const archivePath='loterias-ai/data/archive/gordo-primitiva/2005.json';
const conflictsPath='loterias-ai/data/archive/_meta/gordo-primitiva-official-result-conflicts.json';
const date='2005-11-26';
const expectedMain=[3,8,30,47,49];
const expectedStoredKey=7;
const expectedOfficialKey=9;
const selaeUrl='https://www.loteriasyapuestas.es/servicios/fechav3?game_id=ELGR&fecha_sorteo=20051126';
const boeUrl='https://www.boe.es/diario_boe/txt.php?id=BOE-A-2005-19961';
const key=a=>[...(a||[])].map(Number).sort((x,y)=>x-y).join('-');
const expectedMainKey=key(expectedMain);

async function getText(url){
  const response=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 LoteriasAI dual-official repair'},signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}

const doc=JSON.parse(fs.readFileSync(archivePath,'utf8'));
const row=(doc.records||[]).find(r=>r.drawDate===date);
if(!row)throw new Error('Target Gordo row missing');
if(key(row.result?.main)!==expectedMainKey)throw new Error(`Stored main changed: ${key(row.result?.main)}`);
const currentKey=Number(row.result?.key);
if(currentKey!==expectedStoredKey&&currentKey!==expectedOfficialKey)throw new Error(`Unexpected stored key ${currentKey}`);

const selae=JSON.parse(await getText(selaeUrl));
const officialRow=Array.isArray(selae)?selae.find(r=>String(r?.fecha_sorteo||'').slice(0,10)===date):null;
if(!officialRow)throw new Error('SELAE exact-date row missing');
const selaeNums=String(officialRow.combinacion||'').match(/\d+/g)?.map(Number)||[];
const selaeMain=selaeNums.slice(0,5);
const selaeKey=selaeNums[5];
if(key(selaeMain)!==expectedMainKey||Number(selaeKey)!==expectedOfficialKey)throw new Error(`SELAE guard failed: ${key(selaeMain)} R${selaeKey}`);

const boe=(await getText(boeUrl)).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const boeMainOk=expectedMain.every(n=>new RegExp(`(?:^|\\D)${n}(?:\\D|$)`).test(boe));
const boeKeyMatch=boe.match(/N[uú]mero clave\s*\(reintegro\)\s*:\s*(\d)/i);
if(!boeMainOk||Number(boeKeyMatch?.[1])!==expectedOfficialKey)throw new Error(`BOE guard failed: key=${boeKeyMatch?.[1]??'missing'}`);

const conflictsDoc=fs.existsSync(conflictsPath)?JSON.parse(fs.readFileSync(conflictsPath,'utf8')):null;
const unresolvedConflict=Boolean((conflictsDoc?.conflicts||[]).some(c=>c.date===date));
const checks=new Set(Array.isArray(row.verification?.checks)?row.verification.checks:[]);
const requiredChecks=['official-fechav3-exact-date','official-main-cross-check','official-key-cross-check','official-boe-key-confirmation'];
const cross=row.verification?.officialCrossCheck;
const secondary=row.verification?.secondaryOfficialAuthority;
const alreadyResolved=
  currentKey===expectedOfficialKey&&
  row.verification?.status==='OFFICIAL_SELAE_VALIDATED'&&
  requiredChecks.every(c=>checks.has(c))&&
  cross?.complete===true&&
  cross?.exactDate===true&&
  cross?.fields?.main===true&&
  cross?.fields?.key===true&&
  key(cross?.officialResult?.main)===expectedMainKey&&
  Number(cross?.officialResult?.key)===expectedOfficialKey&&
  secondary?.provider==='BOE'&&
  secondary?.reference==='BOE-A-2005-19961'&&
  secondary?.complete===true&&
  key(secondary?.main)===expectedMainKey&&
  Number(secondary?.key)===expectedOfficialKey&&
  row.trainingEligible===true&&
  !unresolvedConflict;

if(alreadyResolved){
  console.log(JSON.stringify({repaired:false,noSemanticChange:true,date,main:expectedMain,key:expectedOfficialKey,dualOfficialEvidence:true,boeReference:'BOE-A-2005-19961'},null,2));
  process.exit(0);
}

if(currentKey===expectedStoredKey){
  const previous={result:row.result,source:row.source,verification:row.verification};
  row.result={...row.result,key:expectedOfficialKey};
  row.source={
    ...(row.source||{}),
    validation:'official-dual-route-corrected',
    correctionAudit:{
      correctedAt:new Date().toISOString(),
      previous,
      reason:'stored key 7 contradicted by SELAE and BOE; both official routes return key 9',
      officialSources:[
        {provider:'SELAE',url:selaeUrl,officialDrawId:officialRow.id_sorteo||null},
        {provider:'BOE',url:boeUrl,reference:'BOE-A-2005-19961'}
      ]
    }
  };
}
const nextChecks=[...(Array.isArray(row.verification?.checks)?row.verification.checks:[])].filter(c=>c!=='official-selae-conflict-quarantined');
for(const c of requiredChecks)if(!nextChecks.includes(c))nextChecks.push(c);
row.verification={
  ...(row.verification||{}),
  status:'OFFICIAL_SELAE_VALIDATED',
  checks:nextChecks,
  officialCrossCheck:{provider:'SELAE',sourceUrl:selaeUrl,officialDrawId:officialRow.id_sorteo||null,checkedAt:new Date().toISOString(),exactDate:true,fields:{main:true,key:true},complete:true,officialResult:{main:expectedMain,key:expectedOfficialKey}},
  secondaryOfficialAuthority:{provider:'BOE',reference:'BOE-A-2005-19961',sourceUrl:boeUrl,main:expectedMain,key:expectedOfficialKey,complete:true}
};
row.trainingEligible=true;
fs.writeFileSync(archivePath,JSON.stringify(doc,null,2)+'\n');

if(conflictsDoc){
  const hadConflict=(conflictsDoc.conflicts||[]).some(c=>c.date===date);
  conflictsDoc.conflicts=(conflictsDoc.conflicts||[]).filter(c=>c.date!==date);
  if(hadConflict){
    conflictsDoc.generatedAt=new Date().toISOString();
    conflictsDoc.policy='QUARANTINE_DO_NOT_OVERWRITE_ARCHIVE_RESULT; dual official SELAE+BOE resolution recorded';
    conflictsDoc.resolved=[...(conflictsDoc.resolved||[]).filter(c=>c.date!==date),{date,resolvedAt:new Date().toISOString(),resolution:'SELAE_PLUS_BOE_KEY_9',previousKey:expectedStoredKey,correctedKey:expectedOfficialKey,selaeUrl,boeUrl,boeReference:'BOE-A-2005-19961'}];
    fs.writeFileSync(conflictsPath,JSON.stringify(conflictsDoc,null,2)+'\n');
  }
}

console.log(JSON.stringify({repaired:currentKey===expectedStoredKey,date,main:expectedMain,previousKey:currentKey,key:expectedOfficialKey,dualOfficialEvidence:true,boeReference:'BOE-A-2005-19961'},null,2));
