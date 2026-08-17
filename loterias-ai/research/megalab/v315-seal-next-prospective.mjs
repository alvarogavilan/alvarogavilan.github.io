#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const PREREG=`${ROOT}/data/research/metapleno-v315-preregister.json`;
const PROTOCOL=`${ROOT}/data/research/metapleno-v315-execution-protocol-v1.json`;
const SOURCE=`${ROOT}/data/research/meta-pleno-v138-bonoloto-graph-topology.json`;
const ARCHIVE=`${ROOT}/data/archive/primitiva`;
const OUTDIR=`${ROOT}/data/research/v315-prospective-seals`;

const prereg=JSON.parse(fs.readFileSync(PREREG,'utf8'));
const protocol=JSON.parse(fs.readFileSync(PROTOCOL,'utf8'));
const sourceRaw=fs.readFileSync(SOURCE,'utf8');
const source=JSON.parse(sourceRaw);

function gitBlobSha(raw){
  const body=Buffer.from(raw,'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}\0`),body])).digest('hex');
}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex');}
function madridDate(now=new Date()){
  const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=t=>p.find(x=>x.type===t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function addDays(date,n){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function dow(date){return new Date(`${date}T12:00:00Z`).getUTCDay()}
function nextScheduled(from){
  let d=from;
  for(let i=0;i<8;i++){if([1,4,6].includes(dow(d)))return d;d=addDays(d,1)}
  throw new Error('Could not resolve next Primitiva scheduled date');
}
function assert(cond,msg){if(!cond)throw new Error(msg)}
function canonical(o){
  if(Array.isArray(o))return `[${o.map(canonical).join(',')}]`;
  if(o&&typeof o==='object')return `{${Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')}}`;
  return JSON.stringify(o);
}

assert(prereg.status==='PREREGISTERED_CONTRACT_FROZEN','v315 parent preregistration is not frozen');
assert(protocol.status==='EXECUTION_PROTOCOL_FROZEN_BEFORE_FIRST_ELIGIBLE_TARGET_RESULT','v315 execution protocol is not frozen');
assert(prereg.design?.sourceMechanismArtifact?.path===SOURCE,'source artifact path mismatch');
assert(gitBlobSha(sourceRaw)===prereg.design?.sourceMechanismArtifact?.blobSha,'source artifact git blob does not match preregistration');
assert(source.version==='v138'&&source.family==='DYNAMIC_COOCCURRENCE_GRAPH_TOPOLOGY','unexpected source family');
assert(Array.isArray(source.leaders)&&source.leaders.length===12,'expected exactly 12 frozen source leaders');
assert(protocol.fixedDecisionBoundary?.eligibleTargetDraws===200&&protocol.guards?.noOptionalStopping===true,'fixed 200-draw boundary missing');

const requested=process.env.TARGET_DRAW_DATE||null;
const eligibilityStart=prereg.design?.targetHoldoutWindow?.start;
const today=madridDate();
const target=requested||nextScheduled(today<eligibilityStart?eligibilityStart:today);
assert(/^20\d\d-\d\d-\d\d$/.test(target),'TARGET_DRAW_DATE must be YYYY-MM-DD');
assert(target>=eligibilityStart,`target ${target} precedes prospective start ${eligibilityStart}`);
assert([1,4,6].includes(dow(target)),`target ${target} is not Monday, Thursday or Saturday under frozen schedule`);

let records=[];
for(const f of fs.readdirSync(ARCHIVE).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const d=JSON.parse(fs.readFileSync(path.join(ARCHIVE,f),'utf8'));
  for(const r of d.records||[])records.push(r);
}
records=[...new Map(records.map(r=>[r.drawId||`${r.drawDate}-${JSON.stringify(r.result?.main||[])}`,r])).values()]
  .filter(r=>typeof r.drawDate==='string')
  .sort((a,b)=>a.drawDate.localeCompare(b.drawDate));

if(records.some(r=>r.drawDate===target))throw new Error(`TARGET_RESULT_ALREADY_PRESENT: ${target}; refusing post-result seal`);
const priorRecords=records.filter(r=>r.drawDate<target&&Array.isArray(r.result?.main)&&r.result.main.length===6);
assert(priorRecords.length>=protocol.transferExecution?.minimumPriorDraws,'insufficient strictly-prior Primitiva history');
const draws=priorRecords.map(r=>({date:r.drawDate,n:r.result.main.map(Number).sort((a,b)=>a-b)}));
assert(draws.every(d=>d.n.length===6&&new Set(d.n).size===6&&d.n.every(n=>Number.isInteger(n)&&n>=1&&n<=49)),'invalid prior Primitiva main numbers');

const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))||1};
const z=(v,a)=>(v-mean(a))/sd(a);
const unit=x=>.5+.5*Math.tanh(x/2);
function feats(hist,W){
  const h=hist.slice(-W),A=Array.from({length:50},()=>new Float64Array(50));
  for(const d of h)for(let i=0;i<d.n.length;i++)for(let j=i+1;j<d.n.length;j++){const a=d.n[i],b=d.n[j];A[a][b]++;A[b][a]++;}
  const deg=Array(50).fill(0),cl=Array(50).fill(0),ent=Array(50).fill(0);
  for(let n=1;n<=49;n++){
    let s=0;const neigh=[];
    for(let j=1;j<=49;j++)if(j!==n&&A[n][j]>0){s+=A[n][j];neigh.push(j)}
    deg[n]=s;
    if(neigh.length>=2){let tri=0,poss=neigh.length*(neigh.length-1)/2;for(let a=0;a<neigh.length;a++)for(let b=a+1;b<neigh.length;b++)if(A[neigh[a]][neigh[b]]>0)tri++;cl[n]=tri/poss}
    if(s>0){let e=0;for(const j of neigh){const p=A[n][j]/s;e-=p*Math.log(p)}ent[n]=e/Math.log(Math.max(2,neigh.length))}
  }
  return {deg,cl,ent};
}
function transferTicket(c){
  const f=feats(draws,c.w),dvals=f.deg.slice(1),cvals=f.cl.slice(1),evals=f.ent.slice(1),rank=[];
  for(let n=1;n<=49;n++)rank.push([n,c.dg*unit(z(f.deg[n],dvals))+c.cl*unit(z(f.cl[n],cvals))+c.en*unit(z(f.ent[n],evals))]);
  rank.sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
  return rank.slice(0,6).map(x=>x[0]).sort((a,b)=>a-b);
}
function frequencyTicket(W){
  const count=Array(50).fill(0);for(const d of draws.slice(-W))for(const n of d.n)count[n]++;
  return [...Array(49)].map((_,i)=>i+1).sort((a,b)=>count[b]-count[a]||a-b).slice(0,6).sort((a,b)=>a-b);
}
function recencyTickets(){
  const last=Array(50).fill(-1);
  for(let i=0;i<draws.length;i++)for(const n of draws[i].n)last[n]=i;
  const gap=n=>last[n]<0?draws.length+1:draws.length-1-last[n];
  const nums=[...Array(49)].map((_,i)=>i+1);
  const recent=[...nums].sort((a,b)=>gap(a)-gap(b)||a-b).slice(0,6).sort((a,b)=>a-b);
  const overdue=[...nums].sort((a,b)=>gap(b)-gap(a)||a-b).slice(0,6).sort((a,b)=>a-b);
  return {recent,overdue};
}
const recency=recencyTickets();
const lines=source.leaders.map((leader,slot)=>{
  const c=leader.config;
  assert(Number.isInteger(c.w)&&[-1,1].includes(c.dg)&&[-1,1].includes(c.cl)&&[-1,1].includes(c.en),'invalid frozen v138 config');
  const numbers=transferTicket(c),frequency=frequencyTicket(c.w);
  assert(numbers.length===6&&new Set(numbers).size===6,'invalid sealed transfer line');
  return {slot,config:{id:c.id,w:c.w,dg:c.dg,cl:c.cl,en:c.en},numbers,baselines:{marginalFrequency:frequency,recencyRecent:recency.recent,recencyOverdue:recency.overdue}};
});
assert(lines.length===12,'seal must contain 12 lines');

const protocolRaw=fs.readFileSync(PROTOCOL,'utf8');
const sealCore={
  version:'v315-prospective-seal-v1',
  family:'CROSS_GAME_TRANSFER_AUDIT',
  targetGame:'primitiva',
  targetDrawDate:target,
  prospectiveStart:eligibilityStart,
  sourceArtifact:{path:SOURCE,gitBlobSha:gitBlobSha(sourceRaw),contractGitBlobSha:prereg.design.sourceMechanismArtifact.blobSha},
  executionProtocol:{path:PROTOCOL,sha256:sha256(protocolRaw),fixedDecisionBoundary:200},
  historyBoundary:{rule:'strictly before targetDrawDate',drawsUsed:draws.length,firstDrawDate:draws[0].date,lastDrawDate:draws.at(-1).date},
  lines,
  randomBaseline:{replicates:10000,linesPerReplicate:12,numbersPerLine:6,baseSeed:31520260817,seedDerivation:protocol.frozenBaselines.matchedCostRandom.seedDerivation},
  guards:{targetResultPresentAtSeal:false,targetOutcomeUsedForSelection:false,targetTrainingPerformed:false,targetHyperparameterSearchPerformed:false,retuningPerformed:false,all12FrozenConfigsPreserved:true,realMoneyPass:false,realStakeEUR:0}
};
const sealHash=sha256(canonical(sealCore));
const out={...sealCore,sealedAt:new Date().toISOString(),sealHashAlgorithm:'sha256',sealHash};
fs.mkdirSync(OUTDIR,{recursive:true});
const outPath=`${OUTDIR}/v315-primitiva-${target}.json`;
if(fs.existsSync(outPath)){
  const old=JSON.parse(fs.readFileSync(outPath,'utf8'));
  assert(old.sealHash===sealHash,`existing seal differs for ${target}`);
  console.log(JSON.stringify({status:'ALREADY_SEALED_IDENTICAL',target,outPath,sealHash,lines:lines.map(x=>x.numbers)}));
  process.exit(0);
}
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:'SEALED_BEFORE_RESULT',target,outPath,sealHash,historyLast:draws.at(-1).date,lineCount:lines.length,lines:lines.map(x=>x.numbers)},null,2));
