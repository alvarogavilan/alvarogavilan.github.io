#!/usr/bin/env node
import fs from 'node:fs';

const CENSUS='loterias-ai/casino/jackpots/evidence/botemania-jpk-game-economics-census-v1.json';
const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const ALLOC='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-status-v1.json';
const MBWB='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-mbwb-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-current-all-games-ev-screen-v1.json';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const census=read(CENSUS)||{},flow=read(FLOW)||{},alloc=read(ALLOC)||{},mbwb=read(MBWB)||{};
const exactRoyal=Number(mbwb?.mustBeWonBeforeEUR?.ROYAL),exactRegal=Number(mbwb?.mustBeWonBeforeEUR?.REGAL);
const exactMbwb=mbwb?.decision?.exactSpainMbwbKnown===true&&Number.isFinite(exactRoyal)&&Number.isFinite(exactRegal);
const caps={ROYAL:{seed:500,cap:exactMbwb?exactRoyal:3500},REGAL:{seed:5000,cap:exactMbwb?exactRegal:35000}};
const alphaGrid=[0.25,0.5,0.75,1,1.25,1.5,2,3,4,5,7.5,10];
const clamp=q=>Math.max(0.0001,Math.min(.9998,q));
const pots=flow?.latest?.potsEUR||{};
const q={ROYAL:clamp((Number(pots.ROYAL)-caps.ROYAL.seed)/(caps.ROYAL.cap-caps.ROYAL.seed)),REGAL:clamp((Number(pots.REGAL)-caps.REGAL.seed)/(caps.REGAL.cap-caps.REGAL.seed))};
const net=alloc?.decision?.networkAllocationProspectivelyValidated===true?alloc.weightedAllocationShares:null;
function evForTier(activeContribution,k,alpha){
  const share=Number(net?.[k]);if(!Number.isFinite(share)||share<=0)return null;
  const r=activeContribution*share,{seed,cap}=caps[k],span=cap-seed,qq=q[k],V=seed+qq*span,F=qq**alpha,f=alpha*qq**(alpha-1),hazardPerStake=r/span*f/Math.max(1e-15,1-F);
  return V*hazardPerStake;
}
const rows=[];
for(const g of Array.isArray(census?.rows)?census.rows:[]){
  const base=Number(g?.baseRtpPct)/100,active=Number(g?.activeContributionPct)/100;
  const conflict=g?.contributionConsistency?.mechanicsVsRtpConflict===true;
  const usable=Number.isFinite(base)&&base>0&&Number.isFinite(active)&&active>0&&g?.stateDependentProbability===true&&!conflict&&net;
  if(!usable){rows.push({slug:g?.slug,title:g?.title||null,screenable:false,reason:conflict?'CONTRIBUTION_CONFLICT':!net?'NETWORK_ALLOCATION_NOT_VALIDATED':'MISSING_OR_NON_STATE_DEPENDENT_ECONOMICS'});continue;}
  const scenarios=alphaGrid.map(alpha=>{const r=evForTier(active,'ROYAL',alpha),gg=evForTier(active,'REGAL',alpha),total=base+(r||0)+(gg||0);return {alpha,totalRtp:+total.toFixed(6),royalEv:r==null?null:+r.toFixed(6),regalEv:gg==null?null:+gg.toFixed(6)};});
  const vals=scenarios.map(x=>x.totalRtp),worst=Math.min(...vals),best=Math.max(...vals),robust=scenarios.every(x=>x.totalRtp>=1);
  rows.push({slug:g.slug,title:g.title||null,screenable:true,baseRtpPct:g.baseRtpPct,activeContributionPct:g.activeContributionPct,reserveContributionPct:g.reserveContributionPct??null,networkAllocationApplied:net,currentZeroKingSensitivity:{worstRtp:+worst.toFixed(6),bestRtp:+best.toFixed(6),worstRtpPct:+(worst*100).toFixed(4),bestRtpPct:+(best*100).toFixed(4),robustAtOrAbove100:robust,allBelow100:scenarios.every(x=>x.totalRtp<1)},scenarios});
}
const ranked=rows.filter(x=>x.screenable).sort((a,b)=>b.currentZeroKingSensitivity.bestRtp-a.currentZeroKingSensitivity.bestRtp);
const robust=ranked.filter(x=>x.currentZeroKingSensitivity.robustAtOrAbove100);
const capValues={ROYAL:caps.ROYAL.cap,REGAL:caps.REGAL.cap};
const out={
  version:'botemania-jpk-current-all-games-ev-screen-v1.1-exact-spain-mbwb',generatedAt:new Date().toISOString(),operator:'botemania-es',observedAt:flow?.latest?.observedAt||null,potsEUR:pots,
  networkAllocationProspectivelyValidated:Boolean(net),networkAllocationShares:net,
  model:{purpose:'CURRENT_STATE_RESEARCH_SENSITIVITY_ONLY',hazardFamily:'BETA_ALPHA_1',alphaGrid,kingCredit:'ZERO_CONSERVATIVE',capEUR:capValues,capSource:exactMbwb?'BOTEMANIA_SPAIN_IN_GAME_OPERATOR_UI':'FALLBACK_RESEARCH_HYPOTHESIS',seedHypothesisEUR:{ROYAL:500,REGAL:5000},exactSpainMbwbKnown:exactMbwb,exactHazardKnown:false,warning:'Royal/Regal MBWB caps are exact when operator UI evidence is present. Seed and hazard remain unverified; a screen result cannot authorize wagering.'},
  summary:{gamesScanned:rows.length,screenableGames:ranked.length,robustAtOrAbove100Count:robust.length,bestCurrentResearchCandidate:ranked[0]?{slug:ranked[0].slug,title:ranked[0].title,worstRtpPct:ranked[0].currentZeroKingSensitivity.worstRtpPct,bestRtpPct:ranked[0].currentZeroKingSensitivity.bestRtpPct,robustAtOrAbove100:ranked[0].currentZeroKingSensitivity.robustAtOrAbove100}:null,anyCurrentResearchScreenPass:robust.length>0},
  ranked,
  decision:{economicPromotionAllowed:false,realMoneyAllowed:false,automaticBettingAllowed:false,reason:robust.length?'RESEARCH_SCREEN_ONLY_HAZARD_AND_ECONOMIC_REPLICATION_STILL_REQUIRED':'NO_SCREENABLE_BOTEMANIA_JPK_TITLE_ROBUSTLY_REACHES_100_CURRENTLY'},
  guards:{validatedNetworkAllocationUsedOnlyAtNetworkLevel:true,noPerTitleSplitClaim:true,noMainKingCredit:true,exactMbwbOnlyUsedWhenOperatorUiEvidencePresent:true,seedHypothesisNeverAsFact:true,noHazardHypothesisAsFact:true,noBetting:true,realMoneyAllowed:false}
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({summary:out.summary,decision:out.decision,top:ranked.slice(0,5).map(x=>({title:x.title,best:x.currentZeroKingSensitivity.bestRtpPct,worst:x.currentZeroKingSensitivity.worstRtpPct}))},null,2));
