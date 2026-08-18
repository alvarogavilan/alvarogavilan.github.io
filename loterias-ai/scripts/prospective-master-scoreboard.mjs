import fs from 'node:fs';
import path from 'node:path';

const DATA='loterias-ai/data';
const OUT=`${DATA}/shadow/prospective-master-scoreboard.json`;
const roots=['shadow','research','prospective'];
const excluded=new Set(['prospective-master-scoreboard.json','public-attempts-v1.json','metapleno-research-registry.json']);

function walk(dir,root,rel=''){
  if(!fs.existsSync(dir)) return [];
  const out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const r=path.join(rel,e.name),p=path.join(dir,e.name);
    if(e.isDirectory()) out.push(...walk(p,root,r));
    else if(e.name.endsWith('.json')&&!excluded.has(e.name)) out.push({root,file:r.replaceAll('\\','/'),path:p});
  }
  return out;
}

const items=roots.flatMap(root=>walk(`${DATA}/${root}`,root));
const rows=[];
const first=(...xs)=>xs.find(v=>v!==undefined&&v!==null&&v!=='');
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const arr=v=>Array.isArray(v)?v:[];

for(const item of items){
  if(item.root!=='shadow'&&!/(prospective|evaluation|settlement|freeze)/i.test(item.file)) continue;
  let z;try{z=JSON.parse(fs.readFileSync(item.path,'utf8'))}catch{continue}
  const status=String(first(z.status,z.state,z.classification,'UNKNOWN'));
  const prospectiveHint=/PROSPECTIVE|AWAITING|PENDING|FROZEN|EVALUAT|SETTLED/i.test(status)||
    /prospective|evaluation|settlement|freeze/i.test(item.file)||z.selectionUsedTargetResult===false||z.sealedBeforeResult===true;
  if(!prospectiveHint) continue;
  const target=first(z.targetDrawDate,z.targetDate,z.target?.drawDate,z.officialTarget?.targetDate,z.freeze?.targetDrawDate,null);
  const stake=num(first(z.realStakeEUR,z.budget?.realStakeEUR,z.pleno15?.realStakeEUR,0))??0;
  const pass=z.realMoneyPass===true||z.gates?.realMoneyAllowed===true;
  const officialMain=arr(first(z.officialResult?.main,z.winningNumbers,z.target?.main,z.result?.main));
  const pending=/AWAIT|PENDING|WAITING/i.test(status);
  const evaluated=!pending&&(/EVALUAT|SETTLED|SCORED|COMPLETE|REJECTED/i.test(status)||officialMain.length>0);
  rows.push({
    sourcePath:`${item.root}/${item.file}`,
    file:path.basename(item.file),
    store:item.root,
    status,
    targetDrawDate:target||null,
    engine:first(z.engine,z.sourceEngine,z.model,z.version,null),
    sealSHA256:first(z.sealSHA256,z.freezeSealSHA256,z.freezeFingerprintSha256,z.full15Hash,z.forecastHash,z.freeze?.sealSHA256,null),
    outcomeObserved:evaluated,
    realStakeEUR:stake,
    realMoneyPass:pass
  });
}

rows.sort((a,b)=>String(a.targetDrawDate||'9999').localeCompare(String(b.targetDrawDate||'9999'))||a.sourcePath.localeCompare(b.sourcePath));
const counts={
  total:rows.length,
  pending:rows.filter(x=>/AWAIT|PENDING|WAITING/i.test(x.status)).length,
  frozen:rows.filter(x=>/FROZEN/i.test(x.status)&&!x.outcomeObserved).length,
  evaluated:rows.filter(x=>x.outcomeObserved).length,
  realMoneyPass:rows.filter(x=>x.realMoneyPass).length,
  byStore:Object.fromEntries(roots.map(root=>[root,rows.filter(x=>x.store===root).length]))
};
const out={
  version:'prospective-master-scoreboard-v2',
  generatedAt:new Date().toISOString(),
  engine:'Prospective-Master-Scoreboard',
  sourcePolicy:'Aggregates persisted prospective/freeze/evaluation artifacts across shadow, research and prospective stores. Pending artifacts are not counted as evaluated.',
  counts,
  entries:rows,
  policy:{maxRealStakeEURPerGameDraw:15,realMoneyPass:false,note:'Research/shadow evidence never authorizes real money merely by appearing in this scoreboard.'}
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(counts));
