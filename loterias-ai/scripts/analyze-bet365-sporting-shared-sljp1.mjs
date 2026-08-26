#!/usr/bin/env node
import fs from 'node:fs';
import {verifyBet365SportingSharedSljp1Binding} from '../edge-backend/src/bet365-sporting-shared-sljp1-binding-v1.mjs';

const args=process.argv.slice(2);
function usage(){console.error('Usage: node loterias-ai/scripts/analyze-bet365-sporting-shared-sljp1.mjs <gameCode1> <har1> <gameCode2> <har2> [<gameCode3> <har3>]');process.exitCode=2;}
if(!(args.length===4||args.length===6)){usage();}
else{
  try{
    const sessions=[];
    for(let i=0;i<args.length;i+=2){const gameCode=args[i],file=args[i+1];sessions.push({gameCode,sourceName:file.split(/[\\/]/).pop()||'capture.har',har:fs.readFileSync(file,'utf8')});}
    const result=verifyBet365SportingSharedSljp1Binding({sessions});
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
    if(result?.valid!==true)process.exitCode=1;
  }catch(error){
    process.stdout.write(`${JSON.stringify({version:'analyze-bet365-sporting-shared-sljp1',valid:false,reason:'LOCAL_ANALYSIS_FAILED',message:String(error?.message||error),execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0}},null,2)}\n`);
    process.exitCode=1;
  }
}
