import fs from 'node:fs';
import path from 'node:path';

const policy=JSON.parse(fs.readFileSync('loterias-ai/config/prospective-freeze-policy.json','utf8'));
const root='loterias-ai/data/prospective';
const effectiveAfter=new Date(policy.effectiveAfter).getTime();
const errors=[];
const audited=[];

function localParts(iso,tz){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));
  return Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
}
function targetDate(d){return d?.config?.target||d?.config?.targetDrawDate||d?.dataBoundary?.targetDraw||d?.targetDrawDate||null}
function hmToMinutes(v){const [h,m]=String(v).split(':').map(Number);return h*60+m}
function walk(dir){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]).filter(x=>x.endsWith('.json'))}

for(const file of walk(root)){
  let d;try{d=JSON.parse(fs.readFileSync(file,'utf8'))}catch{continue}
  if(d?.status!=='FROZEN_BEFORE_TARGET_RESULT')continue;
  const generatedAt=d.generatedAt;
  const target=targetDate(d);
  const game=d.gameId;
  const cfg=policy.games?.[game];
  if(!cfg)continue;
  if(!generatedAt){errors.push({file,reason:'MISSING_GENERATED_AT'});continue}
  const gt=new Date(generatedAt).getTime();
  const legacy=gt<effectiveAfter;
  const lp=localParts(generatedAt,policy.timezone);
  const localDate=`${lp.year}-${lp.month}-${lp.day}`;
  const localMinute=Number(lp.hour)*60+Number(lp.minute);
  const latest=hmToMinutes(cfg.latestValidFreezeLocal);
  const row={file,game,generatedAt,target,localDate,localTime:`${lp.hour}:${lp.minute}:${lp.second}`,latestValidFreezeLocal:cfg.latestValidFreezeLocal,legacy};
  audited.push(row);
  if(legacy)continue;
  if(!target){errors.push({...row,reason:'MISSING_TARGET_DATE'});continue}
  if(localDate>target || (localDate===target && localMinute>latest)) errors.push({...row,reason:'FREEZE_TOO_LATE'});
}

const out={generatedAt:new Date().toISOString(),policyVersion:policy.version,effectiveAfter:policy.effectiveAfter,auditedCount:audited.length,errorCount:errors.length,audited,errors};
fs.writeFileSync('loterias-ai/data/research/prospective-freeze-timing-validation.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({auditedCount:out.auditedCount,errorCount:out.errorCount,errors},null,2));
if(errors.length)process.exit(1);
