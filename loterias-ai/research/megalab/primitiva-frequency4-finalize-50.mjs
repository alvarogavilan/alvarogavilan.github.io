#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const FREEZE=`${ROOT}/data/research/primitiva-frequency4-prospective-freeze-v1.json`;
const SEALS=`${ROOT}/data/research/primitiva-frequency4-prospective-seals`;
const ARCHIVE=`${ROOT}/data/archive/primitiva`;
const OUT=`${ROOT}/data/research/primitiva-frequency4-prospective-final-50.json`;
const freezeRaw=fs.readFileSync(FREEZE,'utf8'),freeze=JSON.parse(freezeRaw);
function assert(c,m){if(!c)throw new Error(m)}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex')}
function canonical(o){if(Array.isArray(o))return `[${o.map(canonical).join(',')}]`;if(o&&typeof o==='object')return `{${Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')}}`;return JSON.stringify(o)}
function mulberry32(a){return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function sampleTicket(r){const a=Array.from({length:49},(_,i)=>i+1),o=[];while(o.length<6)o.push(a.splice(Math.floor(r()*a.length),1)[0]);return o.sort((x,y)=>x-y)}
function prize(ticket,row){const win=row.result.main.map(Number),hits=ticket.filter(n=>win.includes(n)).length,p=row.economics.payouts;if(hits===6)return Number(p.six)||0;if(hits===5){const missing=win.find(n=>!ticket.includes(n));return Number(missing===Number(row.result.complementary)?p.fiveC:p.five)||0}if(hits===4)return Number(p.four)||0;if(hits===3)return Number(p.three)||0;return 0}
assert(freeze.version==='primitiva-frequency4-prospective-freeze-v1'&&freeze.fixedBoundaryDraws===50&&freeze.economics?.matchedRandomReplicates===10000&&freeze.economics?.familyAlpha===0.01&&freeze.guards?.realMoneyAllowed===false,'freeze drift');

const files=fs.existsSync(SEALS)?fs.readdirSync(SEALS).filter(x=>/^primitiva-frequency4-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort():[];
if(files.length<50){console.log(JSON.stringify({status:'WAITING_FOR_50_SEALS',sealedTargets:files.length,remaining:50-files.length}));process.exit(0)}
assert(files.length===50,'post-50 seals are forbidden');
let records=[];for(const f of fs.readdirSync(ARCHIVE).filter(x=>/^\d{4}\.json$/.test(x)).sort())for(const r of JSON.parse(fs.readFileSync(path.join(ARCHIVE,f),'utf8')).records||[])records.push(r);
records=[...new Map(records.map(r=>[r.drawId||`${r.drawDate}-${JSON.stringify(r.result?.main||[])}`,r])).values()];const byDate=new Map(records.map(r=>[r.drawDate,r]));
const freezeSha=sha256(freezeRaw),targets=[];
for(const f of files){const seal=JSON.parse(fs.readFileSync(path.join(SEALS,f),'utf8'));const core=structuredClone(seal);delete core.sealedAt;delete core.sealHashAlgorithm;delete core.sealHash;assert(sha256(canonical(core))===seal.sealHash,`seal hash failed ${f}`);assert(seal.freeze?.sha256===freezeSha&&seal.engine?.gitBlobSha===freeze.strategy.engineGitBlobSha&&seal.strategy?.id==='frequency'&&seal.strategy?.ticketsPerDraw===4&&seal.guards?.targetResultPresentAtSeal===false&&seal.guards?.retuningPerformed===false,`seal custody drift ${f}`);const row=byDate.get(seal.targetDrawDate),p=row?.economics?.payouts;const ready=Array.isArray(row?.result?.main)&&row.result.main.length===6&&Number.isInteger(Number(row.result.complementary))&&p&&['six','fiveC','five','four','three'].every(k=>Number.isFinite(Number(p[k]))&&Number(p[k])>=0);if(!ready){console.log(JSON.stringify({status:'WAITING_FOR_TARGET_DATA',target:seal.targetDrawDate}));process.exit(0)}targets.push({seal,row});}
let observedReturn=0,profitableDraws=0,maxMainHits=0,hitHistogram=[0,0,0,0,0,0,0];
for(const {seal,row} of targets){let drawReturn=0;for(const t of seal.tickets){const hits=t.numbers.filter(n=>row.result.main.includes(n)).length;maxMainHits=Math.max(maxMainHits,hits);hitHistogram[hits]++;drawReturn+=prize(t.numbers,row)}observedReturn+=drawReturn;if(drawReturn>4)profitableDraws++;}
const observedStake=50*4,observedPL=observedReturn-observedStake,observedROI=observedPL/observedStake;
const N=freeze.economics.matchedRandomReplicates,base=freeze.economics.randomSeed>>>0,nullRois=[];
for(let rep=0;rep<N;rep++){const seed=(base+Math.imul(rep,2654435761))>>>0,r=mulberry32(seed);let ret=0;for(const {row} of targets)for(let slot=0;slot<4;slot++)ret+=prize(sampleTicket(r),row);nullRois.push((ret-observedStake)/observedStake)}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length,sorted=[...nullRois].sort((a,b)=>a-b),q=p=>sorted[Math.min(sorted.length-1,Math.max(0,Math.floor(p*(sorted.length-1))))],nullMean=mean(nullRois),ge=nullRois.filter(x=>x>=observedROI).length,pUpper=(1+ge)/(N+1),pass=observedROI>0&&observedROI>nullMean&&pUpper<freeze.economics.familyAlpha;
const payload={
  version:'primitiva-frequency4-prospective-final-50-v1',generatedAt:new Date().toISOString(),freezeVersion:freeze.version,fixedBoundary:{draws:50,firstTarget:targets[0].seal.targetDrawDate,lastTarget:targets.at(-1).seal.targetDrawDate,post50CanRescue:false},
  observed:{stakeEUR:observedStake,returnEUR:observedReturn,plEUR:observedPL,roi:observedROI,profitableDraws,maxMainHits,hitHistogramAcross200Tickets:hitHistogram},
  matchedRandom:{replicates:N,meanROI:nullMean,p50ROI:q(.5),p95ROI:q(.95),p99ROI:q(.99),maxROI:sorted.at(-1),oneSidedPUpper:pUpper,randomAtLeastObserved:ge},
  gates:{positiveObservedROI:observedROI>0,beatsMatchedRandomMean:observedROI>nullMean,monteCarloPBelowAlpha:pUpper<freeze.economics.familyAlpha,economicPromotionCandidate:pass,realMoneyPass:false},
  interpretation:pass?'Prospective economic signal passed its fixed 50-draw matched-cost gate; requires explicit review and an untouched replication before any real-money authorization.':'Fixed 50-draw prospective economic gate did not pass; this version cannot be rescued with later draws.',
  guards:{all50SealedBeforeResult:true,noRetuning:true,noOptionalStopping:true,post50RescueAllowed:false,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}
};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify(payload,null,2));
