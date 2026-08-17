#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root='loterias-ai/casino/lightning';
const dataRoot=path.join(root,'data');
const outPath=path.join(root,'evidence/corpus-audit.json');
const files=[];
function walk(d){if(!fs.existsSync(d))return;for(const n of fs.readdirSync(d)){const p=path.join(d,n),s=fs.statSync(p);if(s.isDirectory())walk(p);else if(n.endsWith('.jsonl'))files.push(p)}}
walk(dataRoot);

let rawRows=0,invalidRows=0,authoritativeRows=0,observationRows=0;
const roundIds=new Set(),duplicates=[],sources={},days=new Set(),violations=[];
for(const f of files){
  let lineNo=0;
  for(const line of fs.readFileSync(f,'utf8').split(/\r?\n/).filter(Boolean)){
    lineNo++; rawRows++;
    let r; try{r=JSON.parse(line)}catch{invalidRows++;violations.push({file:f,line:lineNo,type:'invalid_json'});continue}
    const winner=Number(r.winner),ts=r.timestamp||r.observedAt||null,t=ts?new Date(ts):null;
    if(!Number.isInteger(winner)||winner<0||winner>36||!t||Number.isNaN(t.getTime())){invalidRows++;violations.push({file:f,line:lineNo,type:'invalid_core_fields'});continue}
    const source=r.source||'unknown'; sources[source]=(sources[source]||0)+1; days.add(t.toISOString().slice(0,10));
    const partial=r.timestampQuality==='snapshot_only_no_round_timestamp'||r.roundIdQuality==='absent'||r.trainingEligible===false;
    if(partial){observationRows++;continue}
    authoritativeRows++;
    if(!r.roundId){violations.push({file:f,line:lineNo,type:'authoritative_missing_round_id'});continue}
    const id=String(r.roundId); if(roundIds.has(id))duplicates.push(id); else roundIds.add(id);
    if(r.roundIdQuality!=='authoritative_source_id') violations.push({file:f,line:lineNo,type:'non_authoritative_id_quality',value:r.roundIdQuality??null});
    if(r.timestampQuality!=='authoritative_settled_at') violations.push({file:f,line:lineNo,type:'non_authoritative_timestamp_quality',value:r.timestampQuality??null});
    if(r.trainingEligible!==true) violations.push({file:f,line:lineNo,type:'authoritative_not_training_eligible'});
    if(r.realMoney!==false) violations.push({file:f,line:lineNo,type:'real_money_invariant_broken'});
    if(!r.sourceRole) violations.push({file:f,line:lineNo,type:'missing_source_role'});
    if(!r.rawHash||!/^([a-f0-9]{64})$/.test(String(r.rawHash))) violations.push({file:f,line:lineNo,type:'missing_or_invalid_raw_hash'});
  }
}
const minimumReplayRounds=500;
const uniqueAuthoritativeRounds=roundIds.size;
const audit={
  generatedAt:new Date().toISOString(),files:files.length,rawRows,invalidRows,authoritativeRows,uniqueAuthoritativeRounds,
  duplicateAuthoritativeRoundIds:[...new Set(duplicates)],duplicateAuthoritativeRows:duplicates.length,validPublicObservations:observationRows,
  minimumReplayRounds,remainingAuthoritativeToReplay:Math.max(0,minimumReplayRounds-uniqueAuthoritativeRounds),
  trainingEligible:uniqueAuthoritativeRounds>=minimumReplayRounds&&violations.length===0&&duplicates.length===0,
  sourceCounts:sources,distinctUtcDays:days.size,violations,qualityPass:invalidRows===0&&violations.length===0&&duplicates.length===0,
  authenticationBypassAttempted:false,aggregateDataAccepted:false,syntheticDataAccepted:false,realMoney:false,
  corpusFingerprint:crypto.createHash('sha256').update([...roundIds].sort().join('\n')).digest('hex'),
  next:uniqueAuthoritativeRounds>=minimumReplayRounds?'validate-and-replay-paper':'continue-authoritative-public-acquisition'
};
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit,null,2));
if(!audit.qualityPass) process.exitCode=2;
