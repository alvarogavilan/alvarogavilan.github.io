import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR='loterias-ai/data/archive/bonoloto';
const OUT='loterias-ai/data/shadow/bonoloto-2026-08-16-metapleno-v54-budget8.json';
const STATUS='loterias-ai/data/shadow/bonoloto-v54-budget8-freeze-status.json';
const TARGET='2026-08-16';
const REQUIRED_PREVIOUS='2026-08-15';
const SPEC={id:386952,sw:5,lw:960,wS:8,wL:-1,wGap:-3,wLast:-4,wPrev2:-1,wNum:-4,wParity:-1,wLow:-1,gapCap:160,powerS:1,powerL:2,setSize:8};
const sha=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const writeStatus=(status,extra={})=>{fs.mkdirSync('loterias-ai/data/shadow',{recursive:true});const o={generatedAt:new Date().toISOString(),engine:'MetaPleno-v54-bonoloto-budget8-prospective-freeze',status,targetDrawDate:TARGET,requiredPreviousDrawDate:REQUIRED_PREVIOUS,specId:SPEC.id,budget:{numbers:8,combinations:28,theoreticalCostEUR:14,maxEUR:15,realStakeEUR:0},realMoneyPass:false,...extra};fs.writeFileSync(STATUS,JSON.stringify(o,null,2)+'\n');console.log(JSON.stringify(o,null,2));return o};

let rows=[];
for(const f of fs.readdirSync(DIR).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const j=JSON.parse(fs.readFileSync(`${DIR}/${f}`,'utf8'));
  rows.push(...(j.records||[]));
}
rows=rows.filter(r=>r.drawDate&&Array.isArray(r.result?.main)&&r.result.main.length===6&&new Set(r.result.main).size===6).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
if(!rows.length){writeStatus('AWAITING_ARCHIVE_DATA');process.exit(0)}
const latest=rows.at(-1).drawDate;
if(latest!==REQUIRED_PREVIOUS){writeStatus('AWAITING_REQUIRED_PREVIOUS_DRAW',{latestArchiveDrawDate:latest,reason:`Freeze forbidden until archive latest draw is exactly ${REQUIRED_PREVIOUS}`});process.exit(0)}
if(fs.existsSync(OUT)){
  const old=JSON.parse(fs.readFileSync(OUT,'utf8'));
  writeStatus('ALREADY_FROZEN_IMMUTABLE',{latestArchiveDrawDate:latest,sealSHA256:old.sealSHA256,pool:old.pool});
  process.exit(0);
}
const truth=rows.map(r=>new Set(r.result.main));
const prefix=Array(rows.length+1);prefix[0]=new Uint16Array(50);
const lastSeen=new Int32Array(50);lastSeen.fill(-1);
for(let i=0;i<rows.length;i++){
  const p=new Uint16Array(prefix[i]);
  for(const n of rows[i].result.main)p[n]++;
  prefix[i+1]=p;
  for(const n of rows[i].result.main)lastSeen[n]=i;
}
const i=rows.length;
const scored=[];
for(let n=1;n<=49;n++){
  const as=Math.max(0,i-SPEC.sw),al=Math.max(0,i-SPEC.lw);
  const cs=prefix[i][n]-prefix[as][n],cl=prefix[i][n]-prefix[al][n];
  const gap=lastSeen[n]<0?SPEC.gapCap:Math.min(SPEC.gapCap,i-lastSeen[n]);
  const f0=cs/Math.max(1,i-as),f1=cl/Math.max(1,i-al);
  const v=SPEC.wS*(SPEC.powerS===2?f0*f0:f0)+SPEC.wL*(SPEC.powerL===2?f1*f1:f1)+SPEC.wGap*(gap/SPEC.gapCap)+SPEC.wLast*(truth[i-1]?.has(n)?1:0)+SPEC.wPrev2*(truth[i-2]?.has(n)?1:0)+SPEC.wNum*(n/49)+SPEC.wParity*(n%2?1:-1)+SPEC.wLow*(n<=24?1:-1);
  scored.push([v,n]);
}
scored.sort((a,b)=>b[0]-a[0]||a[1]-b[1]);
const pool=scored.slice(0,8).map(x=>x[1]).sort((a,b)=>a-b);
const frozenAt=new Date().toISOString();
const evidence={engine:'MetaPleno-v54-bonoloto-budget8-prospective-freeze',status:'PROSPECTIVE_SHADOW_FROZEN',frozenAt,targetDrawDate:TARGET,dataCutoff:latest,selectionSource:'MetaPleno v53 leader fixed before this target',spec:SPEC,pool,poolSize:8,coverage:{simpleCombinations:28,guarantee:'If all 6 winning main numbers are inside this 8-number pool, one of the 28 covered six-number combinations is exactly 6/6.'},budget:{theoreticalCostEUR:14,maxEUR:15,realStakeEUR:0},realMoneyPass:false,immutableAfterFreeze:true};
evidence.sealSHA256=sha({targetDrawDate:evidence.targetDrawDate,dataCutoff:evidence.dataCutoff,spec:evidence.spec,pool:evidence.pool,budget:evidence.budget});
fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
writeStatus('PROSPECTIVE_SHADOW_FROZEN',{latestArchiveDrawDate:latest,sealSHA256:evidence.sealSHA256,pool});
