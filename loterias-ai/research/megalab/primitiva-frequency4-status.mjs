#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const FREEZE=`${ROOT}/data/research/primitiva-frequency4-prospective-freeze-v1.json`;
const SEALS=`${ROOT}/data/research/primitiva-frequency4-prospective-seals`;
const ARCHIVE=`${ROOT}/data/archive/primitiva`;
const OUT=`${ROOT}/data/research/primitiva-frequency4-prospective-status.json`;
const freezeRaw=fs.readFileSync(FREEZE,'utf8'),freeze=JSON.parse(freezeRaw);
function assert(c,m){if(!c)throw new Error(m)}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex')}
assert(freeze.version==='primitiva-frequency4-prospective-freeze-v1'&&freeze.fixedBoundaryDraws===50&&freeze.guards?.realMoneyAllowed===false,'freeze drift');

let records=[];
for(const f of fs.readdirSync(ARCHIVE).filter(x=>/^\d{4}\.json$/.test(x)).sort())for(const r of JSON.parse(fs.readFileSync(path.join(ARCHIVE,f),'utf8')).records||[])records.push(r);
records=[...new Map(records.map(r=>[r.drawId||`${r.drawDate}-${JSON.stringify(r.result?.main||[])}`,r])).values()];
const byDate=new Map(records.map(r=>[r.drawDate,r]));
const files=fs.existsSync(SEALS)?fs.readdirSync(SEALS).filter(x=>/^primitiva-frequency4-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort():[];
assert(files.length<=50,'more than fixed 50 seals');
const freezeSha=sha256(freezeRaw);
let dataReady=0;
const targets=[];
for(const f of files){
  const seal=JSON.parse(fs.readFileSync(path.join(SEALS,f),'utf8'));
  assert(seal.freeze?.sha256===freezeSha&&seal.strategy?.id==='frequency'&&seal.strategy?.ticketsPerDraw===4&&seal.guards?.targetResultPresentAtSeal===false&&seal.guards?.retuningPerformed===false&&seal.guards?.realMoneyAllowed===false,`seal custody drift ${f}`);
  const r=byDate.get(seal.targetDrawDate),p=r?.economics?.payouts;
  const ready=Array.isArray(r?.result?.main)&&r.result.main.length===6&&Number.isInteger(Number(r?.result?.complementary))&&p&&['six','fiveC','five','four','three'].every(k=>Number.isFinite(Number(p[k]))&&Number(p[k])>=0);
  if(ready)dataReady++;
  targets.push({targetDrawDate:seal.targetDrawDate,sealed:true,resultAndEconomicsAvailable:Boolean(ready)});
}
const payload={
  version:'primitiva-frequency4-prospective-status-v1',generatedAt:new Date().toISOString(),freezeVersion:freeze.version,phase:'ACCUMULATING_BLINDED_PROSPECTIVE_ECONOMICS',
  progress:{sealedTargets:files.length,resultAndEconomicsAvailable:dataReady,fixedBoundaryDraws:50,remainingSeals:Math.max(0,50-files.length),remainingCompletedTargets:Math.max(0,50-dataReady),firstSealedTarget:targets[0]?.targetDrawDate||null,latestSealedTarget:targets.at(-1)?.targetDrawDate||null},
  targets,
  disclosure:{administrativeProgressOnly:true,interimEconomicPerformanceHidden:true,interimHitsHidden:true,interimROIHidden:true,randomComparisonHidden:true},
  finalAvailable:files.length===50&&dataReady===50,
  gates:{fixedBoundaryComplete:files.length===50&&dataReady===50,economicPromotionCandidate:false,automaticBettingAllowed:false,realMoneyAllowed:false},
  guards:{strategyFrozen:true,engineBlobFrozen:true,noFutureInformation:true,noRetuning:true,noOptionalStopping:true,post50CannotRescue:true,realMoneyAllowed:false,realStakeEUR:0}
};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload,null,2));
