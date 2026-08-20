#!/usr/bin/env node
import fs from 'node:fs';
const IN='loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const OUT='loterias-ai/casino/archive/evidence/botemania-state-dependent-priority-ranker-v1.json';
const j=JSON.parse(fs.readFileSync(IN,'utf8'));
const dec=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
function parseRtp(row){
  const ctx=(row.rtpContexts||[]).join(' | ');
  const pctVals=[...ctx.matchAll(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%/g)].map(m=>dec(m[1])).filter(x=>x>0&&x<100);
  const euroReturn=ctx.match(/Porcentaje de Retorno al Jugador[^:]{0,120}:?\s*(\d{2}(?:[.,]\d{1,3})?)\s*€\s*\+\s*(\d{1,2}(?:[.,]\d{1,3})?)\s*%/i);
  let base=euroReturn?dec(euroReturn[1]):(pctVals.find(x=>x>=70&&x<100)??null);
  const explicitPlus=/\+/.test(ctx);
  const contributionWords=/contribuci[oó]n|bote|jackpot|reserva|en premios/i.test(ctx);
  let additive=[];
  if(euroReturn){additive=[dec(euroReturn[2])];}
  else if(explicitPlus&&contributionWords&&base!=null){let seenBase=false;for(const v of pctVals){if(!seenBase&&v===base){seenBase=true;continue}if(seenBase&&v<10)additive.push(v);}}
  additive=[...new Set(additive.filter(x=>Number.isFinite(x)&&x>0&&x<10))].slice(0,4);
  const explicitTotal=base==null?null:Number((base+additive.reduce((a,b)=>a+b,0)).toFixed(4));
  return {baseRtpPct:base,additiveComponentsPct:additive,explicitPublishedTotalPct:explicitTotal,rtpSemantic:euroReturn?'RETURN_PER_100_EUR_PLUS_PERCENT_COMPONENT':'EXPLICIT_PERCENT_CONTEXT',rtpContext:ctx.slice(0,1800)};
}
const rows=(j.games||[]).map(row=>{
  const r=parseRtp(row);
  const blueprintJpk=Boolean(row.jackpotKing&&(row.providerHints||[]).some(x=>/Blueprint/i.test(x)));
  const pageState=Boolean(row.stateDependentProbability||row.mustDrop||row.mechanics?.includes('MUST_DROP_OR_MUST_BE_WON'));
  const mechanismState=blueprintJpk;
  const state=pageState||mechanismState;
  const progressive=Boolean(row.mechanics?.includes('PROGRESSIVE')||row.mechanics?.includes('JACKPOT')||row.jackpotKing);
  const score=r.explicitPublishedTotalPct??r.baseRtpPct??0;
  return {slug:row.slug,title:row.title,url:row.url,providerHints:row.providerHints||[],mechanics:row.mechanics||[],jackpotKing:Boolean(row.jackpotKing),mustDrop:Boolean(row.mustDrop),pageStateDependentProbability:Boolean(row.stateDependentProbability),mechanismStateDependentKnown:mechanismState,mechanismStateEvidence:mechanismState?'BOTEMANIA_SHARED_BLUEPRINT_JACKPOT_KING_NETWORK_PLUS_PROVIDER_JKD3_DIRECTION; EXACT_GAME_HAZARD_MAGNITUDE_NOT_ASSUMED':null,stateOrMustDrop:state,progressive,observedBetValuesEUR:row.observedBetValuesEUR||[],...r,distanceTo100Pct:score?Number((100-score).toFixed(4)):null,researchPriorityScore:score};
}).filter(x=>x.progressive||x.stateOrMustDrop).sort((a,b)=>(b.researchPriorityScore||0)-(a.researchPriorityScore||0));
const dynamic=rows.filter(x=>x.stateOrMustDrop);
const out={version:'botemania-state-dependent-priority-ranker-v1.1-mechanism-enriched',generatedAt:new Date().toISOString(),operator:'botemania-es',sourceCensusGeneratedAt:j.generatedAt||null,mechanismEvidence:{botemaniaSharedNetworkEvidence:'Botemania pages for Blueprint Jackpot King explicitly state Royal/Regal/King are shared with all other Blueprint games with Jackpot King active on Botemania/Canal Bingo.',providerDirectionEvidence:'Blueprint Jackpot King Deluxe profile help, including Irish Riches, states jackpot win chance increases with jackpot value and Royal/Regal are Must Be Won By.',boundary:'Qualitative state dependence is mechanism-level evidence only. Exact hazard magnitude/form, stake ladder and any game-specific contribution semantics remain independently gated.'},summary:{censusGames:j.summary?.gamesDiscovered||null,progressiveOrJackpotCandidates:rows.length,stateOrMustDropCandidates:dynamic.length,topDynamic:dynamic.slice(0,20).map(x=>({slug:x.slug,publishedTotalPct:x.explicitPublishedTotalPct,baseRtpPct:x.baseRtpPct,distanceTo100Pct:x.distanceTo100Pct,jackpotKing:x.jackpotKing,mustDrop:x.mustDrop,mechanismStateDependentKnown:x.mechanismStateDependentKnown,rtpSemantic:x.rtpSemantic}))},rankedDynamic:dynamic,rankedProgressive:rows,interpretation:'Discovery/resource-allocation ranking only. Published return proximity to 100% and qualitative state dependence do not prove current positive EV. Exact trigger distribution and operator/game-specific execution parameters remain required before promotion.',guards:{discoveryOnly:true,noAssumedUniformHazard:true,noCrossGameExactHazardEquality:true,noForeignNumericSubstitution:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.summary,null,2));
