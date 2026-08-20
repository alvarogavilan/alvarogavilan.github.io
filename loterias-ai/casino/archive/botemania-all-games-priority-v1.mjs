#!/usr/bin/env node
import fs from 'node:fs';
const IN='loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const OUT='loterias-ai/casino/archive/evidence/botemania-all-games-priority-v1.json';
const db=JSON.parse(fs.readFileSync(IN,'utf8'));
const pctFromContexts=(g)=>{
  const vals=[];for(const c of g.rtpContexts||[])for(const m of String(c).matchAll(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%/g)){const v=Number(m[1].replace(',','.'));if(Number.isFinite(v)&&v>0&&v<100)vals.push(v)}
  return [...new Set(vals)];
};
const rows=(db.games||[]).map(g=>{
  const rtp=pctFromContexts(g);const maxRtp=rtp.length?Math.max(...rtp):null;const minRtp=rtp.length?Math.min(...rtp):null;
  const flags={jackpotKing:Boolean(g.jackpotKing),mustDrop:Boolean(g.mustDrop),stateDependent:Boolean(g.stateDependentProbability),progressive:Boolean(g.mechanics?.includes('PROGRESSIVE')),jackpot:Boolean(g.mechanics?.includes('JACKPOT'))};
  const researchRelevant=flags.jackpotKing||flags.mustDrop||flags.stateDependent||flags.progressive;
  const mechanicsWeight=(flags.mustDrop?5:0)+(flags.stateDependent?4:0)+(flags.jackpotKing?3:0)+(flags.progressive?2:0);
  const rtpWeight=Number.isFinite(maxRtp)?Math.max(0,maxRtp-90):0;
  const score=+(mechanicsWeight*10+rtpWeight).toFixed(4);
  return {slug:g.slug,title:g.title,url:g.url,httpStatus:g.httpStatus,providerHints:g.providerHints||[],flags,rtpValuesPct:rtp,minDetectedRtpPct:minRtp,maxDetectedRtpPct:maxRtp,researchRelevant,priorityScore:score,warning:'Detected RTP values are page-text discovery signals only; not current EV and not wagering authorization.'};
});
const relevant=rows.filter(x=>x.researchRelevant).sort((a,b)=>b.priorityScore-a.priorityScore||((b.maxDetectedRtpPct||0)-(a.maxDetectedRtpPct||0)));
const highRtpProgressive=rows.filter(x=>x.researchRelevant&&Number.isFinite(x.maxDetectedRtpPct)&&x.maxDetectedRtpPct>=95).sort((a,b)=>b.maxDetectedRtpPct-a.maxDetectedRtpPct);
const out={version:'botemania-all-games-priority-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',inputGeneratedAt:db.generatedAt,summary:{allGames:rows.length,researchRelevant:relevant.length,highRtpProgressiveOrStateDependent:highRtpProgressive.length},topResearchPriority:relevant.slice(0,100),highRtpProgressiveOrStateDependent:highRtpProgressive.slice(0,100),decision:{purpose:'DISCOVERY_RESOURCE_ALLOCATION_ONLY',economicPromotionAllowed:false,realMoneyAllowed:false},guards:{noDetectedRtpAsCurrentEv:true,noPriorityScoreAsEdge:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,top:out.topResearchPriority.slice(0,25).map(x=>({slug:x.slug,rtp:x.maxDetectedRtpPct,flags:x.flags,score:x.priorityScore}))},null,2));