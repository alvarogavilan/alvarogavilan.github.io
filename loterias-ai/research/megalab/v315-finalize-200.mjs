#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const CONTRACT=`${ROOT}/data/research/metapleno-v315-final-inference-contract-v1.json`;
const SEALS=`${ROOT}/data/research/v315-prospective-seals`;
const SETTLEMENTS=`${ROOT}/data/research/v315-prospective-settlements`;
const OUT=`${ROOT}/data/research/metapleno-v315-final-200.json`;

const contractRaw=fs.readFileSync(CONTRACT,'utf8');
const contract=JSON.parse(contractRaw);
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex')}
function canonical(o){if(Array.isArray(o))return `[${o.map(canonical).join(',')}]`;if(o&&typeof o==='object')return `{${Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')}}`;return JSON.stringify(o)}
function assert(c,m){if(!c)throw new Error(m)}
function hits(a,b){const s=new Set(b);let h=0;for(const n of a)if(s.has(n))h++;return h}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function randomLine(baseSeed,target,replicate,slot){
  const material=`${baseSeed}|${target}|${replicate}|${slot}`;
  const seed=parseInt(sha256(material).slice(0,8),16)>>>0;
  const rng=mulberry32(seed),a=Array.from({length:49},(_,i)=>i+1),out=[];
  for(let i=0;i<6;i++){const j=i+Math.floor(rng()*(49-i));[a[i],a[j]]=[a[j],a[i]];out.push(a[i])}
  return out;
}
function holm(raw){
  const ord=raw.map((p,slot)=>({slot,p})).sort((a,b)=>a.p-b.p||a.slot-b.slot);let prev=0;const adj=Array(raw.length).fill(null);
  for(let i=0;i<ord.length;i++){const v=Math.max(prev,Math.min(1,ord[i].p*(ord.length-i)));prev=v;adj[ord[i].slot]=v}
  return adj;
}
function round(v,d=9){return Number.isFinite(v)?Number(v.toFixed(d)):null}

assert(contract.status==='FROZEN_BEFORE_FIRST_ELIGIBLE_TARGET_RESULT','final inference contract not frozen');
assert(contract.fixedTargetDraws===200&&contract.boundaryPolicy?.noOptionalStopping===true&&contract.boundaryPolicy?.post200CannotRescue===true,'fixed boundary contract changed');
assert(contract.randomSampler?.replicates===10000&&contract.randomSampler?.slots===12,'random null contract changed');
assert(contract.holmBonferroni?.familySize===12&&contract.holmBonferroni?.alpha===0.05,'Holm contract changed');

const settlementFiles=fs.existsSync(SETTLEMENTS)?fs.readdirSync(SETTLEMENTS).filter(x=>/^v315-primitiva-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort():[];
if(settlementFiles.length<200){
  console.log(JSON.stringify({status:'WAITING_FIXED_200_BOUNDARY',settled: settlementFiles.length,required:200,rankingsPublished:false,realMoneyPass:false}));
  process.exit(0);
}
const first200=settlementFiles.slice(0,200);
const candidateTotals=Array(12).fill(0),freqTotals=Array(12).fill(0),recentTotals=Array(12).fill(0),overdueTotals=Array(12).fill(0);
const randomTotals=Array.from({length:12},()=>new Uint16Array(10000));
const dates=[],extremeEvents=[];

for(const sf of first200){
  const settlement=JSON.parse(fs.readFileSync(path.join(SETTLEMENTS,sf),'utf8'));
  assert(settlement.custody?.sealHashVerified===true&&settlement.custody?.protocolHashVerified===true&&settlement.custody?.officialSELAECrossCheckPassed===true,`custody failure ${sf}`);
  assert(settlement.guards?.retuningPerformed===false&&settlement.guards?.realMoneyPass===false,`guard failure ${sf}`);
  const target=settlement.targetDrawDate,winning=settlement.officialResult?.main;
  assert(Array.isArray(winning)&&winning.length===6,`bad winning result ${sf}`);
  const sealPath=settlement.seal?.path;
  assert(typeof sealPath==='string'&&fs.existsSync(sealPath),`missing seal ${sf}`);
  const seal=JSON.parse(fs.readFileSync(sealPath,'utf8'));
  assert(seal.sealHash===settlement.seal?.sealHash,`seal reference mismatch ${sf}`);
  const core={...seal};delete core.sealedAt;delete core.sealHashAlgorithm;delete core.sealHash;
  assert(sha256(canonical(core))===seal.sealHash,`seal hash mismatch ${sf}`);
  assert(Array.isArray(seal.lines)&&seal.lines.length===12,`line count mismatch ${sf}`);
  dates.push(target);
  for(let slot=0;slot<12;slot++){
    const line=seal.lines[slot];
    candidateTotals[slot]+=hits(line.numbers,winning);
    freqTotals[slot]+=hits(line.baselines.marginalFrequency,winning);
    recentTotals[slot]+=hits(line.baselines.recencyRecent,winning);
    overdueTotals[slot]+=hits(line.baselines.recencyOverdue,winning);
  }
  if(settlement.extremeAudit?.triggered)extremeEvents.push({targetDrawDate:target,events:settlement.extremeAudit.events});
  for(let r=0;r<10000;r++)for(let slot=0;slot<12;slot++)randomTotals[slot][r]+=hits(randomLine(31520260817,target,r,slot),winning);
}

assert(new Set(dates).size===200,'duplicate target dates inside fixed 200 boundary');
const rawP=[],randomMeans=[];
for(let slot=0;slot<12;slot++){
  const arr=randomTotals[slot],obs=candidateTotals[slot];let ge=0,sum=0;
  for(const x of arr){sum+=x;if(x>=obs)ge++}
  rawP[slot]=(1+ge)/10001;randomMeans[slot]=sum/arr.length/200;
}
const adjusted=holm(rawP),candidates=[];
for(let slot=0;slot<12;slot++){
  const seal=JSON.parse(fs.readFileSync(path.join(SEALS,`v315-primitiva-${dates[0]}.json`),'utf8'));
  const config=seal.lines[slot].config;
  const observedMean=candidateTotals[slot]/200,frequencyMean=freqTotals[slot]/200,recentMean=recentTotals[slot]/200,overdueMean=overdueTotals[slot]/200,randomMean=randomMeans[slot];
  const pass=observedMean>randomMean&&adjusted[slot]<0.05&&observedMean>frequencyMean&&observedMean>recentMean&&observedMean>overdueMean;
  candidates.push({slot,config,observedTotalHits:candidateTotals[slot],observedMeanHits:round(observedMean),matchedRandomMeanHits:round(randomMean),rawMonteCarloP:round(rawP[slot]),holmAdjustedP:round(adjusted[slot]),marginalFrequencyMeanHits:round(frequencyMean),recencyRecentMeanHits:round(recentMean),recencyOverdueMeanHits:round(overdueMean),pass});
}
const familyPass=candidates.some(x=>x.pass);
const out={
  version:'metapleno-v315-final-200',
  generatedAt:new Date().toISOString(),
  family:'CROSS_GAME_TRANSFER_AUDIT',
  fixedBoundary:{draws:200,firstTargetDate:dates[0],lastTargetDate:dates.at(-1),laterSettlementsIgnored:Math.max(0,settlementFiles.length-200),post200CanRescue:false},
  inferenceContract:{path:CONTRACT,sha256:sha256(contractRaw)},
  candidates,
  extremeEvents,
  gates:{all200SettlementsPresent:true,intactCustody:true,holmFamilyWiseAlpha:0.05,familyPass,realMoneyPass:false},
  interpretation:familyPass?'At least one frozen Bonoloto→Primitiva transfer configuration passed every preregistered v315 fixed-boundary gate. This is a prospective transfer signal only; an untouched replication is still required and real money remains blocked.':'No frozen Bonoloto→Primitiva transfer configuration passed every preregistered v315 gate at the fixed 200-draw boundary. v315 is archived as a prospective failure; later draws cannot rescue it.',
  guards:{noRetuning:true,noOptionalStopping:true,post200RescueAllowed:false,rankingsPublishedOnlyAtFixedBoundary:true,realMoneyPass:false,realStakeEUR:0}
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:'V315_FIXED_200_FINAL_AVAILABLE',familyPass,candidates:candidates.map(x=>({slot:x.slot,config:x.config.id,mean:x.observedMeanHits,random:x.matchedRandomMeanHits,holm:x.holmAdjustedP,pass:x.pass})),realMoneyPass:false},null,2));
