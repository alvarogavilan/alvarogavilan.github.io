#!/usr/bin/env node
import fs from 'node:fs';
const N=13983816; // C(49,6)
const S=259;      // C(6,5)C(43,1)+C(6,6): lines scoring >=5 against a fixed draw
const lines=30,validationDraws=731,postDraws=591,candidateCount=12;
function portfolioHitProb(){let no=1;for(let i=0;i<lines;i++)no*=((N-S-i)/(N-i));return 1-no}
const q=portfolioHitProb();
const pVal=1-Math.pow(1-q,validationDraws);
const pPost=1-Math.pow(1-q,postDraws);
const pRepeat=pVal*pPost;
const bonf=Math.min(1,pRepeat*candidateCount);
const out={version:'v235',family:'V234_MATCHED_COST_NULL',gameId:'bonoloto',generatedAt:new Date().toISOString(),source:'v234',observed:{validationUnique5PlusDates:['2023-08-07'],postFreezeUnique5PlusDates:['2026-07-18'],repeat5PlusAcrossEras:true,fullAcrossEras:false},null:{type:'exact random distinct-line matched-cost',combinationSpace:N,successLinesPerDraw:S,linesPerDraw:lines,theoreticalCostEUR:15,portfolio5PlusProbabilityPerDraw:q,validationDraws,postFreezeDraws,probAtLeastOne5PlusValidation:pVal,probAtLeastOne5PlusPostFreeze:pPost,rawRepeatAcrossErasP:pRepeat},multipleTesting:{candidateCount,method:'Bonferroni',adjustedP:bonf},decision:bonf<0.05?'SURVIVES_FIRST_AUDIT':'NOT_SIGNIFICANT_AFTER_MATCHED_NULL',realMoneyPass:false,realStakeEUR:0,note:'Exact cost-matched random-line null; does not authorize money real. Any surviving signal still requires prospective freeze and independent repetition.'};
fs.mkdirSync('loterias-ai/data/research',{recursive:true});fs.writeFileSync('loterias-ai/data/research/metapleno-v235-v234-matched-null.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));