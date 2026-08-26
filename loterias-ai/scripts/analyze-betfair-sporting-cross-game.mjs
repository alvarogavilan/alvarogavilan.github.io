#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {evaluateBetfairSportingCrossGameNetworkBinding} from '../casino/jackpots/betfair-sporting-cross-game-network-validator-v1.mjs';

const MAX_SKEW=60;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
function usage(){return 'Usage: node loterias-ai/scripts/analyze-betfair-sporting-cross-game.mjs <left-game-id> <left.har> <right-game-id> <right.har> [--max-skew <seconds <= 60>]';}
function fail(reason,extra={}){return {version:'betfair-sporting-safe-cross-game-cli-v1',ok:false,reason,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,endpointQueriesAndFragmentsNeverEmitted:true,crossGameAnalyzerCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},...extra};}

export function analyzeSafeCrossGameHarTexts({leftRaw,rightRaw,leftGameId,rightGameId,leftSourceName='left.har',rightSourceName='right.har',maxCaptureSkewSeconds=30}={}){
  let leftHar,rightHar;
  try{leftHar=typeof leftRaw==='string'?JSON.parse(leftRaw):leftRaw;}catch{return fail('LEFT_HAR_PARSE_FAILED');}
  try{rightHar=typeof rightRaw==='string'?JSON.parse(rightRaw):rightRaw;}catch{return fail('RIGHT_HAR_PARSE_FAILED');}
  const maxSkew=finite(maxCaptureSkewSeconds);
  if(maxSkew===null||maxSkew<0||maxSkew>MAX_SKEW)return fail('INVALID_CAPTURE_SKEW_POLICY',{maxAllowedCaptureSkewSeconds:MAX_SKEW});
  const analysis=evaluateBetfairSportingCrossGameNetworkBinding({leftHar,rightHar,leftGameId,rightGameId,leftSourceName,rightSourceName,maxCaptureSkewSeconds:maxSkew});
  return {version:'betfair-sporting-safe-cross-game-cli-v1',ok:true,leftGameId,rightGameId,maxCaptureSkewSeconds:maxSkew,analysis,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,endpointQueriesAndFragmentsNeverEmitted:true,sharedNetworkDoesNotProveExecutionEquivalence:true,crossGameAnalyzerCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true}};
}

export function main(argv=process.argv.slice(2)){
  if(!argv.length||argv[0]==='--help'||argv[0]==='-h'){process.stdout.write(`${usage()}\n`);return argv[0]?0:2;}
  const skewIndices=argv.map((v,i)=>v==='--max-skew'?i:-1).filter(i=>i>=0);
  if(skewIndices.length>1){process.stdout.write(`${JSON.stringify(fail('DUPLICATE_MAX_SKEW_OPTION'),null,2)}\n`);return 2;}
  let maxCaptureSkewSeconds=30,positionals=[...argv];
  if(skewIndices.length===1){const i=skewIndices[0],v=finite(argv[i+1]);if(v===null||v<0||v>MAX_SKEW){process.stdout.write(`${JSON.stringify(fail('INVALID_CAPTURE_SKEW_POLICY',{maxAllowedCaptureSkewSeconds:MAX_SKEW}),null,2)}\n`);return 2;}maxCaptureSkewSeconds=v;positionals=argv.filter((_,j)=>j!==i&&j!==i+1);}
  const unknown=positionals.find(v=>String(v).startsWith('--'));
  if(unknown){process.stdout.write(`${JSON.stringify(fail('UNKNOWN_OPTION',{option:unknown}),null,2)}\n`);return 2;}
  if(positionals.length!==4){process.stdout.write(`${JSON.stringify(fail('FOUR_POSITIONAL_ARGUMENTS_REQUIRED',{usage:usage()}),null,2)}\n`);return 2;}
  const [leftGameId,leftFile,rightGameId,rightFile]=positionals;
  try{
    const result=analyzeSafeCrossGameHarTexts({leftRaw:fs.readFileSync(leftFile,'utf8'),rightRaw:fs.readFileSync(rightFile,'utf8'),leftGameId,rightGameId,leftSourceName:path.basename(leftFile),rightSourceName:path.basename(rightFile),maxCaptureSkewSeconds});
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);return result.ok?0:1;
  }catch{process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED'),null,2)}\n`);return 1;}
}

if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();
