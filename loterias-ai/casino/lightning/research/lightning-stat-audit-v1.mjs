#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const file='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const out='loterias-ai/casino/lightning/evidence/stat-audit-v1.json';
const rows=fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).filter(r=>r.trainingEligible&&Number.isInteger(r.winner));
const n=rows.length;
const counts=Array(37).fill(0); for(const r of rows) counts[r.winner]++;
const exp=n/37; const chi2=counts.reduce((s,c)=>s+(c-exp)**2/exp,0);
const lagMatches={}; for(let lag=1;lag<=20;lag++){let m=0;for(let i=lag;i<n;i++) if(rows[i].winner===rows[i-lag].winner)m++;lagMatches[lag]={matches:m,rate:m/Math.max(1,n-lag),nullRate:1/37};}
const luckyCount={}; const luckyFreq=Array(37).fill(0); const multFreq={}; let winnerLucky=0,eligibleLucky=0;
for(const r of rows){const nums=Array.isArray(r.allLuckyNumbers)?r.allLuckyNumbers:[]; const mult=Array.isArray(r.allLuckyMultipliers)?r.allLuckyMultipliers:[]; luckyCount[nums.length]=(luckyCount[nums.length]||0)+1; if(nums.length){eligibleLucky++; if(nums.includes(r.winner))winnerLucky++;} for(const x of nums) if(Number.isInteger(x)&&x>=0&&x<=36) luckyFreq[x]++; for(const m of mult) if(Number.isFinite(m)) multFreq[m]=(multFreq[m]||0)+1;}
const expectedWinnerLucky=rows.reduce((s,r)=>s+((r.allLuckyNumbers?.length||0)/37),0);
const wheel=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const idx=new Map(wheel.map((x,i)=>[x,i])); let neigh1=0,neigh2=0;for(let i=1;i<n;i++){let d=Math.abs(idx.get(rows[i].winner)-idx.get(rows[i-1].winner));d=Math.min(d,37-d);if(d<=1)neigh1++;if(d<=2)neigh2++;}
const result={version:'lightning-stat-audit-v1',generatedAt:new Date().toISOString(),rounds:n,physical:{winnerCounts:counts,chiSquareUniform37:chi2,df:36,lagMatches,wheelNeighbourRate1:neigh1/Math.max(1,n-1),wheelNeighbourNull1:3/37,wheelNeighbourRate2:neigh2/Math.max(1,n-1),wheelNeighbourNull2:5/37},rng:{luckyCountDistribution:luckyCount,luckyNumberFrequency:luckyFreq,multiplierFrequency:multFreq,winnerLuckyObserved:winnerLucky,winnerLuckyEligibleRounds:eligibleLucky,winnerLuckyObservedRate:winnerLucky/Math.max(1,eligibleLucky),winnerLuckyExpectedCountUnderConditionalUniform:expectedWinnerLucky},guards:{exploratory:true,multiplicityCorrectionRequired:true,claimAllowed:false,realMoney:false,next:'permutation-calibrated-walk-forward-audit'}};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({rounds:n,chi2,winnerLucky,expectedWinnerLucky,multiplierFrequency:multFreq,luckyCountDistribution:luckyCount},null,2));
