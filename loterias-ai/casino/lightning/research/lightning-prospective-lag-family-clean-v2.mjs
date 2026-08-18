#!/usr/bin/env node
import fs from 'node:fs';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette-segment-v2.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/prospective-lag-family-clean-v2-freeze-v1.json';
const OUT='loterias-ai/casino/lightning/evidence/prospective-lag-family-clean-v2-status-v1.json';

const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(freeze.version!=='lightning-prospective-lag-family-clean-v2-freeze-v1'||freeze.immutable!==true||freeze.realMoneyAllowed!==false) throw new Error('invalid immutable lag-family freeze');
const lags=freeze.ruleFamily?.lags;
if(!Array.isArray(lags)||lags.length!==20||lags.some((x,i)=>x!==i+1)) throw new Error('lag family drift');
const B=Number(freeze.fixedBoundaryComparisons), P0=Number(freeze.nullHitProbability), BREAK=Number(freeze.economicBreakEvenHitRate), FWA=Number(freeze.familyWiseAlpha);
if(B!==5000||Math.abs(P0-1/37)>1e-12||Math.abs(BREAK-1/30)>1e-12||FWA!==0.01) throw new Error('economic protocol drift');
const perAlpha=FWA/lags.length;

const rows=fs.readFileSync(DATA,'utf8').trim().split(/\n+/).filter(Boolean).map(JSON.parse)
 .filter(x=>Number.isInteger(Number(x.winner))&&Number(x.winner)>=0&&Number(x.winner)<=36&&typeof x.timestamp==='string')
 .sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
const all=rows.map(r=>({t:r.timestamp,w:Number(r.winner)}));
const eligibleIndexes=[];
for(let i=Math.max(...lags);i<all.length;i++) if(all[i].t>freeze.prospectiveStartsAt) eligibleIndexes.push(i);
const used=eligibleIndexes.slice(0,B);
const enough=used.length>=B;

function logChoose(n,k){let s=0;for(let i=1;i<=k;i++)s+=Math.log(n-k+i)-Math.log(i);return s}
function binomUpper(n,k,p){let sum=0;for(let x=k;x<=n;x++){sum+=Math.exp(logChoose(n,x)+x*Math.log(p)+(n-x)*Math.log1p(-p));if(sum>=1)return 1;}return Math.min(1,sum)}
function wilson(n,k,z=1.959963984540054){const ph=k/n,den=1+z*z/n,c=(ph+z*z/(2*n))/den,h=z*Math.sqrt((ph*(1-ph)+z*z/(4*n))/n)/den;return {lower:c-h,upper:c+h}}

const payload={
 version:'lightning-prospective-lag-family-clean-v2-status-v1',generatedAt:new Date().toISOString(),freezeVersion:freeze.version,sourceSegment:'authoritative-v2',prospectiveStartsAt:freeze.prospectiveStartsAt,
 progress:{totalCleanRows:rows.length,fixedBoundaryComparisons:B,comparisonsUsed:used.length,comparisonsRemaining:Math.max(0,B-used.length),firstEligibleAt:used.length?all[used[0]].t:null,lastEligibleAt:used.length?all[used.at(-1)].t:null,postBoundaryRowsIgnored:Math.max(0,eligibleIndexes.length-B)},
 disclosure:{policy:enough?'FIXED_BOUNDARY_OPEN':'ADMINISTRATIVE_PROGRESS_ONLY',candidatePerformanceHidden:!enough,candidateRankingHidden:!enough,pValuesHidden:!enough},
 final:null,
 gates:{fixedBoundaryComplete:enough,anyStatisticalAndEconomicPass:false,independentReplicationStillRequired:true,automaticBettingAllowed:false,realMoneyAllowed:false},
 guards:{all20LagsFrozenBeforeProspectiveStart:true,first5000Only:true,noRetuning:true,noOptionalStopping:true,bonferroniFamilyWiseAlpha:FWA,perCandidateAlpha:perAlpha,postBoundaryCannotRescue:true,realMoneyAllowed:false,realStakeEUR:0}
};
if(enough){
 const results=lags.map(lag=>{let hits=0;for(const i of used)if(all[i].w===all[i-lag].w)hits++;const rate=hits/B,p=binomUpper(B,hits,P0),ci=wilson(B,hits),roi=30*rate-1,pass=p<perAlpha&&rate>BREAK&&ci.lower>BREAK;return {lag,hits,n:B,rate,pUpper:p,wilson95:ci,conservativeNonMultipliedROI:roi,statisticalPass:p<perAlpha,economicBreakEvenPass:rate>BREAK,lowerBoundEconomicPass:ci.lower>BREAK,promotionCandidate:pass};});
 payload.final={results,passingLags:results.filter(x=>x.promotionCandidate).map(x=>x.lag),familyWiseAlpha:FWA,perCandidateAlpha:perAlpha,economicBreakEvenHitRate:BREAK,nonMultipliedGrossReturnX:30};
 payload.gates.anyStatisticalAndEconomicPass=payload.final.passingLags.length>0;
}
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify(payload,null,2));
