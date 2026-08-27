#!/usr/bin/env node
import fs from 'node:fs';
import {verifyBet365SportingServedOverduePair} from '../edge-backend/src/bet365-sporting-served-overdue-pair-v1.mjs';

const VERSION='analyze-bet365-frank-overdue-pair-v1';
const GAME_CODE='gpas_slfbruno_pop';
const args=process.argv.slice(2);
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function usage(){process.stderr.write('Usage: node loterias-ai/scripts/analyze-bet365-frank-overdue-pair.mjs <before.har> <after.har>\n');process.exitCode=2;}

if(args.length!==2)usage();
else{
  try{
    const [beforeFile,afterFile]=args;
    const result=verifyBet365SportingServedOverduePair({
      gameCode:GAME_CODE,
      beforeHar:fs.readFileSync(beforeFile,'utf8'),
      afterHar:fs.readFileSync(afterFile,'utf8'),
      beforeSourceName:beforeFile.split(/[\\/]/).pop()||'before.har',
      afterSourceName:afterFile.split(/[\\/]/).pop()||'after.har',
      requiredStakeEUR:0.10,
    });
    process.stdout.write(`${JSON.stringify({version:VERSION,target:{title:'Frank Bruno: Sporting Legends',gameCode:GAME_CODE,exactPublicPlayUrl:'https://casino.bet365.es/play/FrankBrunoSL'},result,execution:execution()},null,2)}\n`);
    if(result?.valid!==true)process.exitCode=1;
  }catch(error){
    process.stdout.write(`${JSON.stringify({version:VERSION,valid:false,reason:'LOCAL_ANALYSIS_FAILED',message:String(error?.message||error),execution:execution()},null,2)}\n`);
    process.exitCode=1;
  }
}
