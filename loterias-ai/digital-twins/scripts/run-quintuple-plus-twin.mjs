#!/usr/bin/env node
import {CONTRACT,asymptoticFirstCategoryBreakEvenTrueToPublicRatio,finiteCrowdBreakEvenTrueToPublicRatio,observedWinningTicketCrowdConcentration,robustFirstCategoryGate} from '../games/quintuple-plus.mjs';
const historical=[
 {date:'2026-08-30',totalBets:19983,firstCategoryWinners:9,fieldSizes:[4,6,6,10,5]},
 {date:'2026-08-12',totalBets:12393,firstCategoryWinners:1,fieldSizes:[6,6,8,10,5]}
].map(x=>({...x,...observedWinningTicketCrowdConcentration(x)}));
const out={version:'quintuple-plus-contrarian-digital-twin-v1',mode:'RESEARCH_ONLY',contract:CONTRACT,currentExecutionGate:robustFirstCategoryGate({}),historicalRealizedCrowdBenchmarks:historical,asymptoticFirstCategoryBreakEvenTrueToPublicRatio:asymptoticFirstCategoryBreakEvenTrueToPublicRatio(),finiteExampleNotExecutionEvidence:{totalBets:20000,publicTicketProbability:0.0001,requiredTrueToPublicRatio:finiteCrowdBreakEvenTrueToPublicRatio({totalBets:20000,publicTicketProbability:0.0001})},keyResult:'First-category-only conservative EV can exceed 1 only when a defendible lower bound on true outcome probability sufficiently exceeds an upper bound on public ticket probability; lower categories and Special are excluded until separately bound.',guards:{noRetroactivePlay:true,noFavoriteEqualsValue:true,noIidCrowdAsFact:true,noSpecialReceiptValueWithoutReceiptModel:true,noAutomaticBetting:true,realMoneyAllowed:false}};
process.stdout.write(`${JSON.stringify(out,null,2)}\n`);
