#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const CAT='loterias-ai/casino/jackpots/evidence/botemania-progressive-catalog-v1.json';
const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const ALLOC='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-status-v1.json';
const MBWB='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-mbwb-v1.json';
const HELP='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-help-hazard-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-mega-bars-jpk-priority-screen-v1.json';
const cat=read(CAT)||{},flow=read(FLOW)||{},alloc=read(ALLOC)||{},mbwb=read(MBWB)||{},help=read(HELP)||{};
const row=(cat.rows||[]).find(x=>x.slug==='mega-bars-jackpot-king')||null;
const ctx=(row?.rtpAndContributionContexts||[]).find(x=>/95[,.]50\s*%[^]*?0[,.]86\s*%[^]*?0[,.]13\s*%/i.test(String(x)))||'';
const titleSpecificVerified=Boolean(ctx);
const base=0.955,active=0.0086,reserve=0.0013;
const net=alloc?.decision?.networkAllocationProspectivelyValidated===true?alloc.weightedAllocationShares:null;
const cap={ROYAL:Number(mbwb?.mustBeWonBeforeEUR?.ROYAL),REGAL:Number(mbwb?.mustBeWonBeforeEUR?.REGAL)};
const seed={ROYAL:500,REGAL:5000};
const pots=flow?.latest?.potsEUR||{};
const exactMbwb=mbwb?.decision?.exactSpainMbwbKnown===true&&Number.isFinite(cap.ROYAL)&&Number.isFinite(cap.REGAL);
const monotone=help?.hazardEvidence?.qualitativeMonotonicIncreaseKnown===true;
const alphaGrid=monotone?[1,1.25,1.5,2,3,4,5,7.5,10]:[0.25,0.5,0.75,1,1.25,1.5,2,3,4,5,7.5,10];
const clamp=q=>Math.max(.0001,Math.min(.9998,q));
const q={ROYAL:clamp((Number(pots.ROYAL)-seed.ROYAL)/(cap.ROYAL-seed.ROYAL)),REGAL:clamp((Number(pots.REGAL)-seed.REGAL)/(cap.REGAL-seed.REGAL))};
function ev(k,a){const share=Number(net?.[k]);if(!Number.isFinite(share)||!Number.isFinite(cap[k]))return null;const r=active*share,span=cap[k]-seed[k],qq=q[k],V=Number(pots[k]),F=qq**a,f=a*qq**(a-1),h=r/span*f/Math.max(1e-15,1-F);return V*h;}
const scenarios=alphaGrid.map(alpha=>{const royal=ev('ROYAL',alpha),regal=ev('REGAL',alpha),total=base+(royal||0)+(regal||0);return {alpha,totalRtp:+total.toFixed(6),totalRtpPct:+(100*total).toFixed(4),royalEv:royal==null?null:+royal.toFixed(6),regalEv:regal==null?null:+regal.toFixed(6)};});
const vals=scenarios.map(x=>x.totalRtp),worst=Math.min(...vals),best=Math.max(...vals),robust=scenarios.every(x=>x.totalRtp>=1);
const publishedAggregate=base+active+reserve;
const out={version:'botemania-mega-bars-jpk-priority-screen-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',game:{slug:'mega-bars-jackpot-king',url:row?.url||'https://www.botemania.es/juegos/slots-online/mega-bars-jackpot-king'},evidence:{titleSpecificRtpComponentsVerified:titleSpecificVerified,baseRtpPct:95.5,activeContributionPct:0.86,reserveContributionPct:0.13,publishedAggregatePct:+(publishedAggregate*100).toFixed(2),exactSpainMbwbKnown:exactMbwb,qualitativeHazardDirectionKnown:monotone,networkAllocationProspectivelyValidated:Boolean(net),exactHazardKnown:false},current:{observedAt:flow?.latest?.observedAt||null,potsEUR:pots,normalizedSeedToCap:q,alphaGrid,scenarios,worstRtp:+worst.toFixed(6),bestRtp:+best.toFixed(6),worstRtpPct:+(worst*100).toFixed(4),bestRtpPct:+(best*100).toFixed(4),robustAtOrAbove100:robust},decision:{priorityResearchCandidate:titleSpecificVerified&&exactMbwb&&monotone&&Boolean(net),currentPositiveEvProven:false,economicPromotionAllowed:false,realMoneyAllowed:false,reason:robust?'SENSITIVITY_SCREEN_PASS_BUT_EXACT_HAZARD_STILL_REQUIRED':'CURRENT_MONOTONE_SENSITIVITY_BELOW_100'},guards:{publishedAggregateIsLongRunNotCurrentEdge:true,zeroCreditToMainJackpotKing:true,noExactHazardInference:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
