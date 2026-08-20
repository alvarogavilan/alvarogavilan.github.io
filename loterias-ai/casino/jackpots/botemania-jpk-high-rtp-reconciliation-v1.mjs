#!/usr/bin/env node
import fs from 'node:fs';

const CENSUS='loterias-ai/casino/jackpots/evidence/botemania-jpk-game-economics-census-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-high-rtp-reconciliation-v1.json';
const c=JSON.parse(fs.readFileSync(CENSUS,'utf8'));
const rows=(Array.isArray(c?.rows)?c.rows:[]).map(r=>{
 const base=Number(r?.baseRtpPct),active=Number(r?.activeContributionPct),reserve=Number(r?.reserveContributionPct),explicit=Number(r?.explicitComponentsTotalPct);
 const clean=!r?.contributionConsistency?.mechanicsVsRtpConflict;
 const aggregate=Number.isFinite(explicit)?explicit:(Number.isFinite(base)?base+(Number.isFinite(active)?active:0)+(Number.isFinite(reserve)?reserve:0):null);
 return {slug:r.slug,title:r.title||null,url:r.url||null,baseRtpPct:Number.isFinite(base)?base:null,activeContributionPct:Number.isFinite(active)?active:null,reserveContributionPct:Number.isFinite(reserve)?reserve:null,publishedAggregatePct:Number.isFinite(aggregate)?+aggregate.toFixed(4):null,semanticsClean:clean,stateDependentProbability:r?.stateDependentProbability===true,sharedNetwork:r?.explicitBotemaniaCanalBingoSharedNetwork===true,rtpContexts:(r?.rtpContexts||[]).slice(0,3),genericMechanicsContribution:r?.genericMechanicsContribution||null};
}).filter(x=>Number.isFinite(x.baseRtpPct));
const ranked=[...rows].sort((a,b)=>(b.publishedAggregatePct??b.baseRtpPct)-(a.publishedAggregatePct??a.baseRtpPct));
const unresolved=ranked.filter(x=>!x.semanticsClean&&x.baseRtpPct>=95);
const clean=ranked.filter(x=>x.semanticsClean);
const out={version:'botemania-jpk-high-rtp-reconciliation-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',purpose:'Prevent high-base-RTP Jackpot King titles from being silently discarded when Botemania page mechanics text conflicts with the title-specific RTP section.',summary:{gamesReviewed:ranked.length,cleanSemantics:clean.length,unresolvedHighBase:unresolved.length,bestPublishedAggregate:ranked[0]||null,bestClean:clean[0]||null},ranked,unresolvedHighBase:unresolved,decision:{economicPromotionAllowed:false,realMoneyAllowed:false,reason:unresolved.length?'HIGH_RTP_CONFLICTS_REQUIRE_TITLE_SPECIFIC_SEMANTIC_RESOLUTION_AND_HAZARD_VALIDATION':'NO_UNRESOLVED_HIGH_RTP_CONFLICTS'},guards:{specificRtpSectionPreserved:true,genericMechanicsConflictNeverSilentlyOverridden:true,publishedAggregateIsLongRunNotCurrentStateEdge:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,unresolvedHighBase:out.unresolvedHighBase},null,2));
