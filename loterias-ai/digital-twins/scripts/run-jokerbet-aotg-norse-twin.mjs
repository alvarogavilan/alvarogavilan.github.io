#!/usr/bin/env node
import {CONTRACT,requiredNetJackpotWinProbability,monteCarloConditionalEv,executionGate} from '../games/jokerbet-aotg-norse.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>{const [k,v='true']=x.replace(/^--/,'').split('=');return [k,v];}));
const n=k=>args[k]===undefined?null:Number(args[k]);
const stake=n('stake'),jackpot=n('jackpot'),p=n('pwin'),share=n('share')??1,trials=n('trials')??5_000_000;
const out={version:'jokerbet-aotg-norse-digital-twin-v1',mode:'RESEARCH_ONLY',contract:CONTRACT,currentExecutionGate:executionGate({}),formula:'returnRatio = 0.9456 + netJackpotWinProbability * jackpotAwardEUR / stakeEUR',requiredLiveInputs:['liveExtraAmountEUR','guaranteedHitAmountEUR','instanceCode','tickerEndpoint','exact stake','operator-bound trigger probability or defendible lower bound','accepted race share / competition-latency bound']};
if(stake&&jackpot)out.requiredNetJackpotWinProbability=requiredNetJackpotWinProbability({stakeEUR:stake,jackpotAwardEUR:jackpot});
if(stake&&jackpot&&p!==null)out.monteCarlo=monteCarloConditionalEv({stakeEUR:stake,jackpotAwardEUR:jackpot,ownTriggerProbabilityPerSpin:p,acceptedRaceShare:share,trials});
process.stdout.write(`${JSON.stringify(out,null,2)}\n`);
