#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ROOT='loterias-ai/casino/specialists';
const REG=`${ROOT}/official-game-specialists-v1.json`;
const QUEUE=`${ROOT}/economic-priority-queue-v1.json`;
const STATE=`${ROOT}/specialist-work-state-v1.json`;
const WORK=`${ROOT}/work`;
const limit=Math.max(1,Math.min(50,Number(process.argv.find(x=>x.startsWith('--limit='))?.split('=')[1]||5)));
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const reg=read(REG),queue=read(QUEUE),prior=read(STATE)||{completed:{},failures:{}};
if(reg?.version!=='official-game-specialists-v2')throw new Error('validated specialist registry v2 required');
if(!Array.isArray(queue?.priorityQueue))throw new Error('priority queue missing');
const validated=new Map((reg.specialists||[]).filter(x=>x.state==='OFFICIAL_GAME_PAGE_VALIDATED').map(x=>[x.specialistId,x]));
const eligible=(queue.priorityQueue||[]).filter(x=>validated.has(x.specialistId)&&!prior.completed?.[x.specialistId]);
const batch=eligible.slice(0,limit);
fs.mkdirSync(WORK,{recursive:true});
const clean=s=>String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const pct=s=>s?Number(String(s).replace(',','.')):null;
const money=s=>{if(!s)return null;const v=String(s).replace(/\./g,'').replace(',','.');const n=Number(v);return Number.isFinite(n)?n:null;};
const providerNames=['Evolution','Playtech','Blueprint Gaming','Pragmatic Play','NetEnt','Red Tiger','Play n GO','Hacksaw','Relax Gaming','Games Global','Light & Wonder','IGT','MGA Games','EGT','Spribe'];
const results=[];
for(const item of batch){
  const s=validated.get(item.specialistId);const startedAt=new Date().toISOString();
  try{
    const r=await fetch(s.officialGameUrl,{redirect:'follow',headers:{accept:'text/html','user-agent':'loterias-ai-specialist-worker/1.0'}});const html=await r.text();const text=clean(html);
    const expected=s.operator==='pokerstars-es'?'pokerstars.es':'playuzu.es';const host=new URL(r.url).hostname;if(!host.endsWith(expected)||!r.ok)throw new Error(`official page validation failed ${r.status} ${host}`);
    const rtpMatches=[...text.matchAll(/RTP(?:\s+(?:del|of))?\s*[:\-]?\s*(\d{2}(?:[.,]\d{1,3})?)\s*%/gi)].map(m=>pct(m[1])).filter(Number.isFinite);
    const minBet=(text.match(/(?:apuesta m[ií]nima|min(?:imum)? bet)\s*[:\-]?\s*(\d+(?:[.,]\d{1,2})?)\s*€/i)||[])[1];
    const maxBet=(text.match(/(?:apuesta m[aá]xima|max(?:imum)? bet)\s*[:\-]?\s*(\d+(?:[.,]\d{1,2})?)\s*€/i)||[])[1];
    const provider=(text.match(/desarrollador\s*[:\-]?\s*([A-Za-z0-9 &.'-]{2,50})/i)||[])[1]?.trim()||providerNames.find(p=>text.toLowerCase().includes(p.toLowerCase()))||null;
    const amounts=[...text.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/g)].map(m=>money(m[1])).filter(x=>Number.isFinite(x)&&x>=1000).slice(0,20);
    const stateDependentSignals=[];
    if(/must be won by|debe (?:ser|salir|ganarse)|garantizad[oa].{0,20}(?:antes|hasta)|probabilidad.{0,30}(?:bote|jackpot).{0,30}(?:aument|increment)/i.test(text))stateDependentSignals.push('EXPLICIT_STATE_DEPENDENT_JACKPOT_LANGUAGE');
    if(/jackpot|bote progresivo|premio especial progresivo/i.test(text))stateDependentSignals.push('PROGRESSIVE_PRESENT');
    if(/compra.{0,15}bonus|bonus buy|buy feature|comprar.{0,15}funci/i.test(text))stateDependentSignals.push('MODE_OR_FEATURE_BUY_PRESENT');
    if(/crash|cash out|retirar antes|multiplicador.{0,30}sube/i.test(text))stateDependentSignals.push('CRASH_OR_CASHOUT_STATE_PRESENT');
    const cadence={explicitSpinsPerHour:(text.match(/(\d{2,3})\s*(?:giros|spins)\s*(?:por|per)\s*hora/i)||[])[1]??null,fastTurboLanguage:/turbo|giro r[aá]pido|fast spin|quick spin|spin speed/i.test(text)};
    const work={version:'official-specialist-work-v1',specialistId:s.specialistId,game:s.game,operator:s.operator,officialGameUrl:s.officialGameUrl,processedAt:new Date().toISOString(),pageEvidence:{httpStatus:r.status,finalUrl:r.url,pageSha256:crypto.createHash('sha256').update(html).digest('hex')},extracted:{provider,rtpValues:[...new Set(rtpMatches)],minBetEUR:money(minBet),maxBetEUR:money(maxBet),largeDisplayedAmountsEUR:[...new Set(amounts)],stateDependentSignals,cadence},researchPosture:{class:s.class,priorityScore:item.priorityScore,mechanismFirst:true,spinSpeedTreatment:'COVARIATE_ONLY_UNLESS_OOS_PREDICTIVE',economicPotential:stateDependentSignals.includes('EXPLICIT_STATE_DEPENDENT_JACKPOT_LANGUAGE')?'HIGH_STATE_DEPENDENT_REVIEW':stateDependentSignals.includes('PROGRESSIVE_PRESENT')?'PROGRESSIVE_REVIEW':s.class==='CRASH'?'STRUCTURED_MECHANICS_REVIEW':'LOW_PRIOR_UNTIL_MECHANISM_FOUND',next:'Obtain exact official provider rules and freeze any testable mechanism before untouched observations.'},guards:{noSpinPlaced:true,noAutoplay:true,retrospectivePageFactsCannotPromote:true,realMoneyAllowed:false}};
    fs.writeFileSync(`${WORK}/${s.specialistId}.json`,JSON.stringify(work,null,2)+'\n');prior.completed[s.specialistId]={processedAt:work.processedAt,game:s.game,operator:s.operator,economicPotential:work.researchPosture.economicPotential};delete prior.failures?.[s.specialistId];results.push({specialistId:s.specialistId,game:s.game,status:'COMPLETE',economicPotential:work.researchPosture.economicPotential});
  }catch(e){prior.failures[s.specialistId]={at:new Date().toISOString(),game:s.game,error:String(e?.message||e)};results.push({specialistId:s.specialistId,game:s.game,status:'FAILED',error:String(e?.message||e)});}
}
const total=validated.size,completed=Object.keys(prior.completed||{}).filter(id=>validated.has(id)).length;
const state={version:'specialist-work-state-v1',generatedAt:new Date().toISOString(),validatedSpecialists:total,completed,remaining:Math.max(0,total-completed),failed:Object.keys(prior.failures||{}).length,lastBatch:results,completedIndex:prior.completed||{},failures:prior.failures||{},guards:{officialGamePagesOnly:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(STATE,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({validatedSpecialists:total,completed,remaining:state.remaining,lastBatch:results},null,2));
