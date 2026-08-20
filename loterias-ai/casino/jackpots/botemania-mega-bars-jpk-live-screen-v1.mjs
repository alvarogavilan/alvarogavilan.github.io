#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const URL='https://www.botemania.es/juegos/slots-online/mega-bars-jackpot-king';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-mega-bars-jpk-live-screen-v1.json';
const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const ALLOC='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-status-v1.json';
const MBWB='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-mbwb-v1.json';
const HELP='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-help-hazard-v1.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const strip=s=>s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const n=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
const r=await fetch(URL,{headers:{accept:'text/html,*/*','user-agent':'loterias-ai-mega-bars-jpk-live-screen/1.0','cache-control':'no-cache'},redirect:'follow'});
const html=await r.text(),text=strip(html);
const exact=text.match(/Porcentaje de Retorno al Jugador[^.]{0,700}?([0-9]{1,2}[.,][0-9]+)\s*%\s*\(\s*Base\s*\)[^.]{0,180}?Contribuci[oó]n al Bote\s*:?\s*([0-9]{1,2}[.,][0-9]+)\s*%\s*\(\s*Bote\s*\)\s*\+\s*([0-9]{1,2}[.,][0-9]+)\s*%\s*\(\s*Reserva\s*\)/i)
 ||text.match(/Porcentaje de Retorno al Jugador[^.]{0,700}?([0-9]{1,2}[.,][0-9]+)\s*%\s*\(\s*Base\s*\)[^.]{0,180}?([0-9]{1,2}[.,][0-9]+)\s*%[^+]{0,80}\+\s*([0-9]{1,2}[.,][0-9]+)\s*%[^.]{0,80}Reserva/i);
const base=exact?n(exact[1])/100:null,active=exact?n(exact[2])/100:null,reserve=exact?n(exact[3])/100:null;
const stateDependent=/probabilidades?[^.]{0,260}(?:aumentan|aumenta|crecen|crece|incrementan|incrementa)[^.]{0,200}(?:valor|cantidad)[^.]{0,120}(?:Bote|jackpot)/i.test(text);
const proportional=/probabilidades?[^.]{0,220}proporcionales? al valor de la Apuesta Total/i.test(text);
const shared=/Botes Progresivos[^.]{0,500}(?:compartidos|compartidas)[^.]{0,500}Jackpot King/i.test(text)||/compartidos? con todos los dem[aá]s juegos de Blueprint[^.]{0,300}Jackpot King/i.test(text);
const flow=read(FLOW),alloc=read(ALLOC),mbwb=read(MBWB),help=read(HELP);
const pots=flow?.latest?.potsEUR||{};
const shares=alloc?.decision?.networkAllocationProspectivelyValidated===true?alloc?.weightedAllocationShares:null;
const cap={ROYAL:Number(mbwb?.mustBeWonBeforeEUR?.ROYAL),REGAL:Number(mbwb?.mustBeWonBeforeEUR?.REGAL)};
const exactMbwb=mbwb?.decision?.exactSpainMbwbKnown===true&&Number.isFinite(cap.ROYAL)&&Number.isFinite(cap.REGAL);
const monotone=help?.hazardEvidence?.qualitativeMonotonicIncreaseKnown===true;
const seed={ROYAL:500,REGAL:5000};
const q={ROYAL:(Number(pots.ROYAL)-seed.ROYAL)/(cap.ROYAL-seed.ROYAL),REGAL:(Number(pots.REGAL)-seed.REGAL)/(cap.REGAL-seed.REGAL)};
const clamp=x=>Math.max(0.0001,Math.min(0.9998,x));
function tierEv(tier,alpha){
 const qq=clamp(q[tier]),span=cap[tier]-seed[tier],V=seed[tier]+qq*span,share=Number(shares?.[tier]);
 if(!Number.isFinite(active)||!Number.isFinite(share)||share<=0||!Number.isFinite(span)||span<=0)return null;
 const rate=active*share,F=qq**alpha,f=alpha*qq**(alpha-1),h=rate/span*f/Math.max(1e-15,1-F);
 return V*h;
}
const alphaGrid=monotone?[1,1.25,1.5,2,3,4,5,7.5,10]:[];
const scenarios=alphaGrid.map(alpha=>{const royal=tierEv('ROYAL',alpha),regal=tierEv('REGAL',alpha),total=(base||0)+(royal||0)+(regal||0);return{alpha,totalRtp:+total.toFixed(6),totalRtpPct:+(total*100).toFixed(4),royalEv:royal==null?null:+royal.toFixed(6),regalEv:regal==null?null:+regal.toFixed(6)};});
const vals=scenarios.map(x=>x.totalRtp).filter(Number.isFinite),worst=vals.length?Math.min(...vals):null,best=vals.length?Math.max(...vals):null;
const prerequisites=Boolean(r.ok&&base&&active&&Number.isFinite(reserve)&&stateDependent&&proportional&&shared&&shares&&exactMbwb&&monotone);
const out={version:'botemania-mega-bars-jpk-live-screen-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',game:{slug:'mega-bars-jackpot-king',title:'Mega Bars: Jackpot King',url:URL},pageEvidence:{httpStatus:r.status,finalUrl:r.url,bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex'),baseRtpPct:base==null?null:+(base*100).toFixed(4),activeContributionPct:active==null?null:+(active*100).toFixed(4),reserveContributionPct:reserve==null?null:+(reserve*100).toFixed(4),publishedComponentSumPct:base==null||active==null||reserve==null?null:+((base+active+reserve)*100).toFixed(4),stateDependentProbability:stateDependent,probabilityProportionalToTotalBet:proportional,sharedJackpotKingNetwork:shared},inputs:{observedAt:flow?.latest?.observedAt||null,potsEUR:pots,exactSpainMbwbKnown:exactMbwb,capEUR:cap,networkAllocationProspectivelyValidated:Boolean(shares),networkAllocationShares:shares,qualitativeHazardDirectionKnown:monotone,seedHypothesisEUR:seed,exactHazardKnown:false,exactMegaBarsStakeLadderKnown:false},model:{purpose:'DEDICATED_CURRENT_STATE_RESEARCH_SCREEN_NOT_WAGER_RECOMMENDATION',hazardFamily:'BETA_ALPHA_1_SENSITIVITY_ONLY',alphaGrid,mainJackpotKingCredit:'ZERO_CONSERVATIVE',reserveCredit:'ZERO_CONSERVATIVE',warning:'Exact Spanish MBWB and monotone direction are verified for the shared Jackpot King mechanism, but reserve seed, exact hazard magnitude/form and Mega Bars stake ladder remain unverified.'},result:{prerequisites,scenarios,worstRtp:worst==null?null:+worst.toFixed(6),bestRtp:best==null?null:+best.toFixed(6),worstRtpPct:worst==null?null:+(worst*100).toFixed(4),bestRtpPct:best==null?null:+(best*100).toFixed(4),allModeledBelow100:vals.length>0&&vals.every(x=>x<1),robustAtOrAbove100:vals.length>0&&vals.every(x=>x>=1)},decision:{economicPromotionCandidate:false,realMoneyAllowed:false,automaticBettingAllowed:false,reason:!prerequisites?'DEDICATED_SCREEN_PREREQUISITES_INCOMPLETE':vals.every(x=>x<1)?'ALL_CURRENT_CONSERVATIVE_SENSITIVITY_SCENARIOS_BELOW_100':'RESEARCH_SCREEN_ONLY_EXACT_HAZARD_AND_PROSPECTIVE_REPLICATION_REQUIRED'},guards:{noCrossGameExactHazardAssumption:true,noSeedHypothesisAsFact:true,noMainKingCredit:true,noReserveCredit:true,noPublishedComponentSumAsCurrentEv:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({pageEvidence:out.pageEvidence,result:out.result,decision:out.decision},null,2));
