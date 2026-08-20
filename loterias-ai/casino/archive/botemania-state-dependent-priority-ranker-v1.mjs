#!/usr/bin/env node
import fs from 'node:fs';
const IN='loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const OUT='loterias-ai/casino/archive/evidence/botemania-state-dependent-priority-ranker-v1.json';
const j=JSON.parse(fs.readFileSync(IN,'utf8'));
const dec=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
function parseRtp(row){
  const ctx=(row.rtpContexts||[]).join(' | ');
  const vals=[...ctx.matchAll(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%/g)].map(m=>dec(m[1])).filter(x=>x>0&&x<100);
  const base=vals.find(x=>x>=70&&x<100)??null;
  const small=vals.filter(x=>x>0&&x<10);
  const explicitPlus=/\+/.test(ctx);
  const contributionWords=/contribuci[oó]n|bote|jackpot|reserva/i.test(ctx);
  let additive=[];
  if(explicitPlus&&contributionWords&&base!=null){let seenBase=false;for(const v of vals){if(!seenBase&&v===base){seenBase=true;continue}if(seenBase&&v<10)additive.push(v);}}
  additive=[...new Set(additive)].slice(0,4);
  const explicitTotal=base==null?null:Number((base+additive.reduce((a,b)=>a+b,0)).toFixed(4));
  return {baseRtpPct:base,additiveComponentsPct:additive,explicitPublishedTotalPct:explicitTotal,rtpContext:ctx.slice(0,1800)};
}
const rows=(j.games||[]).map(row=>{const r=parseRtp(row);const state=Boolean(row.stateDependentProbability||row.mustDrop||row.mechanics?.includes('MUST_DROP_OR_MUST_BE_WON'));const progressive=Boolean(row.mechanics?.includes('PROGRESSIVE')||row.mechanics?.includes('JACKPOT')||row.jackpotKing);const score=r.explicitPublishedTotalPct??r.baseRtpPct??0;return {slug:row.slug,title:row.title,url:row.url,providerHints:row.providerHints||[],mechanics:row.mechanics||[],jackpotKing:Boolean(row.jackpotKing),mustDrop:Boolean(row.mustDrop),stateDependentProbability:Boolean(row.stateDependentProbability),stateOrMustDrop:state,progressive,observedBetValuesEUR:row.observedBetValuesEUR||[],...r,distanceTo100Pct:score?Number((100-score).toFixed(4)):null,researchPriorityScore:score};}).filter(x=>x.progressive||x.stateOrMustDrop).sort((a,b)=>(b.researchPriorityScore||0)-(a.researchPriorityScore||0));
const dynamic=rows.filter(x=>x.stateOrMustDrop);
const out={version:'botemania-state-dependent-priority-ranker-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',sourceCensusGeneratedAt:j.generatedAt||null,summary:{censusGames:j.summary?.gamesDiscovered||null,progressiveOrJackpotCandidates:rows.length,stateOrMustDropCandidates:dynamic.length,topDynamic:dynamic.slice(0,15).map(x=>({slug:x.slug,publishedTotalPct:x.explicitPublishedTotalPct,baseRtpPct:x.baseRtpPct,distanceTo100Pct:x.distanceTo100Pct,jackpotKing:x.jackpotKing,mustDrop:x.mustDrop}))},rankedDynamic:dynamic,rankedProgressive:rows,interpretation:'Ranking is discovery only. Published RTP proximity to 100% prioritizes research but does not prove current positive EV. Exact state mechanics, contribution semantics and trigger distribution must be validated before promotion.',guards:{discoveryOnly:true,noAssumedUniformHazard:true,noForeignParameterSubstitution:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.summary,null,2));
