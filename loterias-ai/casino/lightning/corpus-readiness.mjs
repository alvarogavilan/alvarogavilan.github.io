#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root='loterias-ai/casino/lightning';
const auditScript=path.join(root,'audit-corpus.mjs');
const auditPath=path.join(root,'evidence/corpus-audit.json');
const outPath=path.join(root,'evidence/corpus-readiness.json');

// The strict audit is the single source of truth. Recompute it every time so
// readiness can never become fresher than its QA/provenance evidence.
const run=spawnSync(process.execPath,[auditScript],{encoding:'utf8'});
if(run.stdout) process.stdout.write(run.stdout);
if(run.stderr) process.stderr.write(run.stderr);
if(!fs.existsSync(auditPath)) throw new Error('STRICT_CORPUS_AUDIT_MISSING');
const a=JSON.parse(fs.readFileSync(auditPath,'utf8'));

const scientificState={
  auditGeneratedAt:a.generatedAt,
  corpusFingerprint:a.corpusFingerprint,
  files:a.files,
  rawRows:a.rawRows,
  validPublicObservations:a.validPublicObservations,
  uniqueAuthoritativeRounds:a.uniqueAuthoritativeRounds,
  duplicateAuthoritativeRows:a.duplicateAuthoritativeRows,
  invalidRows:a.invalidRows,
  qualityPass:a.qualityPass,
  violations:a.violations,
  minimumReplayRounds:a.minimumReplayRounds,
  remainingAuthoritativeToReplay:a.remainingAuthoritativeToReplay,
  // Global training must fail closed across a censored continuity barrier.
  trainingEligible:a.trainingEligible===true&&a.qualityPass===true,
  historicalReplayEligible:a.historicalReplayEligible===true&&a.qualityPass===true,
  continuity:a.continuity||null,
  activeSegmentTrainingEligible:a.continuity?.activeSegmentTrainingEligible===true&&a.qualityPass===true,
  observationCorpusUsableForExploratoryPhysicalAnalysis:a.validPublicObservations>0,
  sourceCounts:a.sourceCounts,
  distinctUtcDays:a.distinctUtcDays,
  authenticationBypassAttempted:false,
  aggregateDataAccepted:false,
  syntheticDataAccepted:false,
  realMoney:false,
  next:a.next
};

let out={generatedAt:new Date().toISOString(),...scientificState};
if(fs.existsSync(outPath)){
  try{
    const previous=JSON.parse(fs.readFileSync(outPath,'utf8'));
    const {generatedAt:_previousGeneratedAt,...previousScientificState}=previous;
    if(JSON.stringify(previousScientificState)===JSON.stringify(scientificState)){
      out=previous;
      console.log(JSON.stringify({...out,persistence:'NO_SEMANTIC_CHANGE'},null,2));
      if(run.status!==0||!out.qualityPass) process.exitCode=run.status||2;
      process.exit();
    }
  }catch{}
}
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,persistence:'UPDATED_SEMANTIC_CHANGE'},null,2));
if(run.status!==0||!out.qualityPass) process.exitCode=run.status||2;
