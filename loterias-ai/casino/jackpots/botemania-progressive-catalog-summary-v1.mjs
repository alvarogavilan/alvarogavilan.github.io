#!/usr/bin/env node
import fs from 'node:fs';
const IN='loterias-ai/casino/jackpots/evidence/botemania-progressive-catalog-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-progressive-catalog-summary-v1.json';
const j=JSON.parse(fs.readFileSync(IN,'utf8'));
const rows=Array.isArray(j.rows)?j.rows:[];
const must=rows.filter(x=>x.mustBeWonMentioned===true);
const state=rows.filter(x=>x.stateDependentMechanicMentioned===true);
const top=state.map(x=>({slug:x.slug,url:x.url,mustBeWonMentioned:x.mustBeWonMentioned,sharedNetworkMentioned:x.sharedNetworkMentioned,percentMentions:x.percentMentions||[],contexts:(x.rtpAndContributionContexts||[]).slice(0,2)})).sort((a,b)=>(Math.max(...(b.percentMentions||[0]))-Math.max(...(a.percentMentions||[0]))));
const out={version:'botemania-progressive-catalog-summary-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',source:IN,summary:{progressivePagesFound:rows.length,stateDependentCandidates:state.length,mustBeWonCandidates:must.length},mustBeWonCandidates:must.map(x=>({slug:x.slug,url:x.url,percentMentions:x.percentMentions||[],contexts:(x.rtpAndContributionContexts||[]).slice(0,3)})),topStateDependent:top.slice(0,25),decision:{dedicatedValidationRequired:true,realMoneyAllowed:false},guards:{summaryOnly:true,noSemanticPromotionFromKeywordAlone:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
