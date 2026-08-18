#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const SOURCE='loterias-ai/casino/lightning/research/economic-number-selection-prospective-v1.mjs';
const EXPECTED_GIT_BLOB_SHA='1e9431d663b6f5ced9dcb24a9d6074bb6bea3874';
const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette-segment-v2.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/economic-number-selection-prospective-freeze-v2.json';
const OUT='loterias-ai/casino/lightning/evidence/economic-number-selection-prospective-status-v2.json';
const WARMUP=200;

const source=fs.readFileSync(SOURCE,'utf8');
const blob=crypto.createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex');
if(blob!==EXPECTED_GIT_BLOB_SHA)throw new Error(`v1 selector engine drifted: ${blob}`);
const f=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(f.version!=='economic-number-selection-prospective-freeze-v2'||Number(f.cleanSegmentWarmup?.rounds)!==WARMUP||f.guards?.candidateFamilyByteForByteEquivalentToV1!==true||f.guards?.v1CandidateRankingWasNotDisclosed!==true||f.guards?.allScoredLookbacksUseOnlyCleanSegmentRows!==true||f.guards?.realMoneyAllowed!==false)throw new Error('v2 selector freeze drift');

let runtime=source
  .replace("const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';",`const DATA='${DATA}';`)
  .replace("const FREEZE='loterias-ai/casino/lightning/evidence/economic-number-selection-prospective-freeze-v1.json';",`const FREEZE='${FREEZE}';`)
  .replace("const OUT='loterias-ai/casino/lightning/evidence/economic-number-selection-prospective-status-v1.json';",`const OUT='${OUT}';`)
  .replace("const eligibleIndices=[];for(let i=0;i<rows.length;i++)if(rows[i]._ts>=startMs)eligibleIndices.push(i);\nconst fixed=eligibleIndices.slice(0,finalBoundary);",
           "const eligibleIndicesRaw=[];for(let i=0;i<rows.length;i++)if(rows[i]._ts>=startMs)eligibleIndicesRaw.push(i);\nconst cleanWarmupRounds=Number(f.cleanSegmentWarmup?.rounds);if(cleanWarmupRounds!==200)throw new Error('v2 clean warmup drift');\nconst eligibleIndices=eligibleIndicesRaw.slice(cleanWarmupRounds);\nconst fixed=eligibleIndices.slice(0,finalBoundary);")
  .replace("version:'economic-number-selection-prospective-status-v1'","version:'economic-number-selection-prospective-status-v2'")
  .replace("post10000RowsIgnoredForV1","post10000RowsIgnoredForV2")
  .replace("v1 is a prospective failure","v2 is a prospective failure");

if(runtime===source||!runtime.includes('cleanWarmupRounds'))throw new Error('failed to derive v2 runtime from frozen v1 engine');
const TMP='/tmp/economic-number-selection-prospective-v2-runtime.mjs';
fs.writeFileSync(TMP,runtime);
const run=spawnSync(process.execPath,[TMP],{encoding:'utf8',maxBuffer:64*1024*1024});
if(run.status!==0){process.stderr.write(run.stderr||'');process.stdout.write(run.stdout||'');process.exit(run.status||1);}
const out=JSON.parse(fs.readFileSync(OUT,'utf8'));
const totalSegmentRows=Number(out.source?.currentEligibleCorpusRows??0);
out.algorithmCustody={sourceEngine:SOURCE,sourceEngineGitBlobSha:blob,derivation:'path/output substitutions plus fixed 200-row clean warmup; selector ranking logic unchanged'};
out.sourceSegment='authoritative-v2';
out.progress.cleanWarmupRequired=WARMUP;
out.progress.cleanWarmupObserved=Math.min(WARMUP,totalSegmentRows);
out.progress.cleanWarmupComplete=totalSegmentRows>=WARMUP;
out.progress.totalCleanSegmentRows=totalSegmentRows;
out.guards.v1SelectorAlgorithmUnchanged=true;
out.guards.cleanWarmupNotScored=true;
out.guards.realMoneyAllowed=false;
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({phase:out.phase,progress:out.progress,algorithmCustody:out.algorithmCustody,realMoneyAllowed:false},null,2));
