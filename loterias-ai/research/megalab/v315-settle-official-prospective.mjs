#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const PROTOCOL=`${ROOT}/data/research/metapleno-v315-execution-protocol-v1.json`;
const SEALS=`${ROOT}/data/research/v315-prospective-seals`;
const SETTLEMENTS=`${ROOT}/data/research/v315-prospective-settlements`;
const ARCHIVE=`${ROOT}/data/archive/primitiva`;

const protocolRaw=fs.readFileSync(PROTOCOL,'utf8');
const protocol=JSON.parse(protocolRaw);
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex')}
function canonical(o){
  if(Array.isArray(o))return `[${o.map(canonical).join(',')}]`;
  if(o&&typeof o==='object')return `{${Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')}}`;
  return JSON.stringify(o);
}
function assert(cond,msg){if(!cond)throw new Error(msg)}
function hits(a,b){const s=new Set(b);return a.filter(n=>s.has(n)).length}

assert(protocol.status==='EXECUTION_PROTOCOL_FROZEN_BEFORE_FIRST_ELIGIBLE_TARGET_RESULT','execution protocol not frozen');
assert(protocol.fixedDecisionBoundary?.eligibleTargetDraws===200,'fixed v315 boundary changed');
assert(protocol.guards?.noOptionalStopping===true&&protocol.guards?.noPost200Rescue===true,'optional-stopping guards missing');

let records=[];
for(const f of fs.readdirSync(ARCHIVE).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const doc=JSON.parse(fs.readFileSync(path.join(ARCHIVE,f),'utf8'));
  for(const r of doc.records||[])if(r?.drawDate)records.push(r);
}
const byDate=new Map(records.map(r=>[r.drawDate,r]));
const sealFiles=fs.existsSync(SEALS)?fs.readdirSync(SEALS).filter(x=>/^v315-primitiva-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort():[];
fs.mkdirSync(SETTLEMENTS,{recursive:true});
let created=0,awaitingResult=0,awaitingOfficial=0,alreadySettled=0;
const createdPaths=[];

for(const file of sealFiles){
  const sealPath=path.join(SEALS,file),seal=JSON.parse(fs.readFileSync(sealPath,'utf8'));
  const target=seal.targetDrawDate;
  const settlementPath=path.join(SETTLEMENTS,`v315-primitiva-${target}.json`);
  if(fs.existsSync(settlementPath)){alreadySettled++;continue}
  const record=byDate.get(target);
  if(!record){awaitingResult++;continue}
  const officialOK=record.economics?.validation?.officialSELAE===true&&record.economics?.source?.provider==='SELAE';
  if(!officialOK){awaitingOfficial++;continue}

  assert(seal.targetGame==='primitiva','unexpected target game in seal');
  assert(seal.executionProtocol?.sha256===sha256(protocolRaw),`protocol hash mismatch for ${target}`);
  assert(seal.executionProtocol?.fixedDecisionBoundary===200,`seal boundary mismatch for ${target}`);
  assert(seal.guards?.targetResultPresentAtSeal===false&&seal.guards?.targetOutcomeUsedForSelection===false,`invalid pre-result custody for ${target}`);
  assert(seal.guards?.retuningPerformed===false&&seal.guards?.realMoneyPass===false,`retuning/real-money regression for ${target}`);
  assert(Array.isArray(seal.lines)&&seal.lines.length===12,`expected 12 sealed lines for ${target}`);
  const core={...seal};delete core.sealedAt;delete core.sealHashAlgorithm;delete core.sealHash;
  assert(sha256(canonical(core))===seal.sealHash,`seal hash mismatch for ${target}`);

  const winning=(record.result?.main||[]).map(Number).sort((a,b)=>a-b);
  assert(winning.length===6&&new Set(winning).size===6&&winning.every(n=>Number.isInteger(n)&&n>=1&&n<=49),`invalid official winning main for ${target}`);
  const extremeEvents=[];
  for(const line of seal.lines){
    const h=hits(line.numbers,winning);
    if(h>=5)extremeEvents.push({slot:line.slot,configId:line.config?.id,hits:h,sealedNumbers:line.numbers});
  }
  const officialResult={drawDate:target,main:winning,complementary:record.result?.complementary??null,reintegro:record.result?.reintegro??null,officialDrawId:record.official?.drawId??null,officialDrawNumber:record.official?.drawNumber??null,officialProvider:'SELAE',officialCapturedAt:record.economics?.source?.capturedAt??null};
  const out={
    version:'v315-prospective-settlement-v1',
    family:'CROSS_GAME_TRANSFER_AUDIT',
    targetGame:'primitiva',
    targetDrawDate:target,
    settledAt:new Date().toISOString(),
    seal:{path:sealPath,sealHash:seal.sealHash,sealedAt:seal.sealedAt},
    officialResult,
    officialResultHash:sha256(canonical(officialResult)),
    custody:{sealHashVerified:true,protocolHashVerified:true,officialSELAECrossCheckRequired:true,officialSELAECrossCheckPassed:true,sealedBeforeResult:seal.guards.targetResultPresentAtSeal===false,settlementRecomputedPrediction:false},
    disclosure:{candidatePerformanceHidden:true,candidateRankingPublished:false,reason:'Fixed v315 protocol forbids interim candidate ranking before 200 eligible prospective target draws.'},
    extremeAudit:{triggered:extremeEvents.length>0,threshold:'5/6 or 6/6',events:extremeEvents,doesNotChangeBoundaryOrConfigs:true},
    guards:{retuningPerformed:false,optionalStoppingAllowed:false,post200RescueAllowed:false,realMoneyPass:false,realStakeEUR:0}
  };
  fs.writeFileSync(settlementPath,JSON.stringify(out,null,2)+'\n');created++;createdPaths.push(settlementPath);
}

console.log(JSON.stringify({status:'V315_SETTLEMENT_SCAN_COMPLETE',sealedTargets:sealFiles.length,created,createdPaths,awaitingResult,awaitingOfficial,alreadySettled,fixedDecisionBoundary:200,candidateRankingsPublished:false,realMoneyPass:false},null,2));
