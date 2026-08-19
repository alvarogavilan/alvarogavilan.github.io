import fs from 'node:fs';
import path from 'node:path';

const DIR='loterias-ai/data/archive/primitiva';
const META='loterias-ai/data/archive/_meta';
const STATUS=`${META}/primitiva-pre-reintegro-certification.json`;
const REINTEGRO_FIRST_DRAW='1991-06-20';
const now=new Date().toISOString();

const legalEvidence={
  lastPreReintegroOfficialResolution:{
    ref:'BOE-A-1991-15603',
    url:'https://www.boe.es/diario_boe/txt.php?id=BOE-A-1991-15603',
    draws:['1991-06-13','1991-06-15'],
    publishedComponents:['main','complementary']
  },
  firstReintegroOfficialResolution:{
    ref:'BOE-A-1991-16395',
    url:'https://www.boe.es/diario_boe/txt.php?id=BOE-A-1991-16395',
    draws:['1991-06-20','1991-06-22'],
    publishedComponents:['main','complementary','reintegro']
  },
  implementingRule:{
    ref:'BOE-A-1991-13414',
    url:'https://www.boe.es/diario_boe/txt.php?id=BOE-A-1991-13414'
  }
};

const stable=value=>{
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['generatedAt','checkedAt'].includes(k)).map(([k,v])=>[k,stable(v)]));
  return value;
};
const sameSemantic=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

fs.mkdirSync(META,{recursive:true});
let examined=0,eligible=0,certified=0,alreadyCertified=0,blocked=0;
const blockedReasons={};
const touched=[];

for(const file of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const p=path.join(DIR,file);
  const doc=JSON.parse(fs.readFileSync(p,'utf8'));
  let changed=false;
  for(const r of doc.records||[]){
    if(!r?.drawDate||r.drawDate>=REINTEGRO_FIRST_DRAW)continue;
    examined++;
    const v=r.verification||{};
    const x=v.officialCrossCheck||{};
    if(v.status==='OFFICIAL_SELAE_VALIDATED'&&x.complete===true){alreadyCertified++;continue;}
    if(v.status!=='OFFICIAL_SELAE_PARTIAL')continue;
    eligible++;
    const reasons=[];
    if(x.provider!=='SELAE')reasons.push('provider_not_selae');
    if(x.exactDate!==true)reasons.push('exact_date_not_verified');
    if(x.fields?.main!==true)reasons.push('main_not_verified');
    if(x.fields?.complementary!==true)reasons.push('complementary_not_verified');
    if(x.officialResult?.reintegro!==null&&x.officialResult?.reintegro!==undefined)reasons.push('official_source_reports_reintegro');
    if(reasons.length){
      blocked++;
      for(const reason of reasons)blockedReasons[reason]=(blockedReasons[reason]||0)+1;
      continue;
    }
    const checks=[...(Array.isArray(v.checks)?v.checks:[])];
    for(const check of ['historical-component-schema-pre-reintegro','boe-era-boundary-verified'])if(!checks.includes(check))checks.push(check);
    r.verification={
      ...v,
      status:'OFFICIAL_SELAE_VALIDATED',
      checks,
      componentSchema:{
        era:'PRE_REINTEGRO',
        appliesBefore:REINTEGRO_FIRST_DRAW,
        requiredComponents:['main','complementary'],
        reintegroApplicable:false,
        legalEvidence
      },
      officialCrossCheck:{
        ...x,
        checkedAt:now,
        status:'MATCH_HISTORICAL_COMPONENT_SCHEMA',
        fields:{main:true,complementary:true},
        complete:true,
        completenessBasis:'HISTORICAL_RULES_IN_FORCE'
      }
    };
    r.trainingEligible=true;
    r.reintegroTrainingEligible=false;
    changed=true;
    certified++;
  }
  if(changed){fs.writeFileSync(p,JSON.stringify(doc,null,2)+'\n');touched.push(file);}
}

const out={
  generatedAt:now,
  gameId:'primitiva',
  policy:'CERTIFY_ONLY_COMPONENTS_REQUIRED_BY_RULES_IN_FORCE_AT_DRAW_DATE',
  reintegroFirstDraw:REINTEGRO_FIRST_DRAW,
  legalEvidence,
  examinedPreReintegro:examined,
  eligiblePartialRows:eligible,
  newlyCertified:certified,
  alreadyCertified,
  blocked,
  blockedReasons,
  touchedFiles:touched,
  guards:{
    selaeExactDateRequired:true,
    mainRequired:true,
    complementaryRequired:true,
    absentHistoricalComponentNotFabricated:true,
    storedReintegroNotCertifiedForPreReintegroEra:true,
    reintegroDependentTrainingDisabled:true,
    noEconomicsShortcut:true,
    noSecondarySourcePromotion:true,
    realMoney:false
  }
};
const previous=fs.existsSync(STATUS)?JSON.parse(fs.readFileSync(STATUS,'utf8')):null;
if(!previous||!sameSemantic(previous,out))fs.writeFileSync(STATUS,JSON.stringify(out,null,2)+'\n');
else console.log('NO_SEMANTIC_STATUS_CHANGE');
console.log(JSON.stringify(out,null,2));
