#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {analyzeBetfairSportingCorrelatedWebtickersPair} from '../edge-backend/src/betfair-sporting-webtickers-correlated-pair-v1.mjs';

function usage(){return 'Usage: node loterias-ai/scripts/analyze-betfair-sporting-modern-pair.mjs <before.har> <after.har>';}
function fail(reason,extra={}){return {version:'betfair-sporting-modern-pair-cli-v1',ok:false,reason,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

export function analyzeSafeModernPairText(beforeRaw,afterRaw,{beforeSourceName='before.har',afterSourceName='after.har'}={}){
  let beforeHar,afterHar;
  try{beforeHar=JSON.parse(beforeRaw);}catch{return fail('BEFORE_HAR_PARSE_FAILED');}
  try{afterHar=JSON.parse(afterRaw);}catch{return fail('AFTER_HAR_PARSE_FAILED');}
  const analysis=analyzeBetfairSportingCorrelatedWebtickersPair({beforeHar,afterHar,beforeSourceName,afterSourceName});
  return {
    version:'betfair-sporting-modern-pair-cli-v1',
    ok:true,
    analysis,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{offlineOnly:true,noNetwork:true,rawHarNeverEmitted:true,credentialsNeverEmitted:true,exactApMcCoyRequiredOnBothCaptures:true,modernResponseSemanticsRemainUnverified:true,modernPairCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}

export function main(argv=process.argv.slice(2)){
  if(argv.length<2||argv[0]==='--help'||argv[0]==='-h'){
    process.stdout.write(`${usage()}\n`);return argv[0]?0:2;
  }
  try{
    const beforeRaw=fs.readFileSync(argv[0],'utf8'),afterRaw=fs.readFileSync(argv[1],'utf8');
    const result=analyzeSafeModernPairText(beforeRaw,afterRaw,{beforeSourceName:path.basename(argv[0]),afterSourceName:path.basename(argv[1])});
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
    return result.ok?0:1;
  }catch{
    process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED'),null,2)}\n`);return 1;
  }
}

if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();
