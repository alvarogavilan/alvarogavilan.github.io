#!/usr/bin/env node
import fs from 'node:fs';

const DATA='loterias-ai/casino/lightning/data/casinoorg-lightningroulette-segment-v2.jsonl';
const FREEZE='loterias-ai/casino/lightning/evidence/prospective-lag8-clean-v3-freeze-v1.json';
const V2='loterias-ai/casino/lightning/evidence/prospective-lag8-clean-v2-status-v1.json';
const OUT='loterias-ai/casino/lightning/evidence/prospective-lag8-clean-v3-status-v1.json';

const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(freeze?.version!=='lightning-prospective-lag8-clean-v3-freeze-v1'||freeze?.guards?.immutable!==true||freeze?.protocol?.noRetuning!==true||freeze?.lag!==8||freeze?.activation?.activationIndependentOfV2Outcome!==true||freeze?.activation?.usesPreBoundaryRowsForPrediction!==false)throw new Error('Invalid clean lag8 V3 freeze');
if(freeze?.protocol?.performanceBlindBeforeBoundary!==true||freeze?.protocol?.first1000Only!==true||freeze?.custody?.preRegisteredBeforeV2Final!==true)throw new Error('Blind independent fixed-boundary protocol required');

const v2=JSON.parse(fs.readFileSync(V2,'utf8'));
const v2Ready=v2?.gates?.fixedBoundaryComplete===true&&Number(v2?.progress?.comparisonsUsed)===1000&&v2?.final!==null&&typeof v2?.progress?.lastEligibleAt==='string';
const anchor=v2Ready?String(v2.progress.lastEligibleAt):null;

const rows=fs.readFileSync(DATA,'utf8').trim().split(/\n+/).filter(Boolean).map(JSON.parse)
 .filter(x=>x.trainingEligible!==false&&Number.isInteger(Number(x.winner))&&Number(x.winner)>=0&&Number(x.winner)<=36&&typeof x.timestamp==='string'&&x.timestamp.length>0)
 .sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
const post=v2Ready?rows.filter(x=>String(x.timestamp)>anchor):[];
const lag=8,boundary=1000,p0=Number(freeze.baselineProbability),alpha=Number(freeze.alpha),totalReturn=Number(freeze.economicModel?.nonMultipliedStraightUpTotalReturn),breakEven=Number(freeze.economicModel?.conservativeBreakEvenHitRate);

const comparisons=[];
for(let i=lag;i<post.length;i++)comparisons.push({t:String(post[i].timestamp),hit:Number(post[i].winner)===Number(post[i-lag].winner)});
const used=comparisons.slice(0,boundary),n=used.length,complete=v2Ready&&n>=boundary;
function logChoose(n,k){let s=0;for(let i=1;i<=k;i++)s+=Math.log(n-k+i)-Math.log(i);return s;}
function binomUpper(n,k,p){let sum=0;for(let x=k;x<=n;x++){const lp=logChoose(n,x)+x*Math.log(p)+(n-x)*Math.log1p(-p);sum+=Math.exp(lp);if(sum>=1)return 1;}return Math.min(1,sum);}
let final=null;
if(complete){const matches=used.reduce((s,x)=>s+(x.hit?1:0),0),rate=matches/boundary,pUpper=binomUpper(boundary,matches,p0),roi=totalReturn*rate-1,statisticalPass=pUpper<alpha&&rate>p0,economicPass=rate>breakEven&&roi>0;final={comparisons:boundary,matches,hitRate:rate,baselineProbability:p0,pUpper,alpha,conservativeBreakEvenHitRate:breakEven,conservativeBaseRoi:roi,conservativeProfitPer100Units:roi*100,luckyMultiplierUpliftIncluded:false,statisticalPass,economicPass,independentReplicationPass:statisticalPass&&economicPass};}
const payload={version:'lightning-prospective-lag8-clean-v3-status-v1',freezeVersion:freeze.version,sourceSegment:freeze.sourceSegment,activation:{v2FixedBoundaryComplete:v2Ready,anchorV2FinalComparisonAt:anchor,strictlyPostAnchor:true,warmupRowsAfterAnchor:lag,preBoundaryRowsUsedForPrediction:false},state:!v2Ready?'WAITING_FOR_LAG8_V2_FIXED_BOUNDARY':complete?'FIXED_FINAL_AVAILABLE':'BLINDED_ACCUMULATING',progress:{postAnchorRows:post.length,fixedBoundaryComparisons:boundary,comparisonsUsed:n,comparisonsRemaining:Math.max(0,boundary-n),firstEligibleAt:used[0]?.t||null,lastEligibleAt:used.at(-1)?.t||null,postBoundaryRowsIgnored:Math.max(0,comparisons.length-boundary)},disclosure:complete?{policy:'FIXED_BOUNDARY_FINAL_DISCLOSURE',performanceHidden:false,pValueHidden:false,directionHidden:false}:{policy:'ADMINISTRATIVE_PROGRESS_ONLY',performanceHidden:true,pValueHidden:true,directionHidden:true},final,gates:{fixedBoundaryComplete:complete,independentReplicationPass:final?.independentReplicationPass===true,automaticBettingAllowed:false,realMoneyAllowed:false},guards:{preRegisteredBeforeV2Final:true,activationIndependentOfV2Outcome:true,sameLagAndEconomicsAsV2:true,postBoundarySampleOnly:true,first1000Only:true,noRetuning:true,noOptionalStopping:true,postBoundaryCannotRescue:true,luckyMultiplierUpliftExcludedFromPromotion:true,realMoneyAllowed:false,realStakeEUR:0}};
const semantic=JSON.stringify(payload);let oldCore=null;if(fs.existsSync(OUT)){const old=JSON.parse(fs.readFileSync(OUT,'utf8'));delete old.generatedAt;oldCore=JSON.stringify(old);}if(oldCore===semantic){console.log(JSON.stringify({changed:false,state:payload.state,...payload.progress}));process.exit(0);}fs.writeFileSync(OUT,JSON.stringify({...payload,generatedAt:new Date().toISOString()},null,2)+'\n');console.log(JSON.stringify({changed:true,state:payload.state,...payload.progress,independentReplicationPass:payload.final?.independentReplicationPass??null},null,2));
