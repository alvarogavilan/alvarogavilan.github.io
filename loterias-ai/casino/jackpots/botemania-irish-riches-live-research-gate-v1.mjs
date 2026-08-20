#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const PAGE='https://www.botemania.es/juegos/slots-online/irish-riches-megaways-jackpot-king';
const GRAPHQL='https://www.botemania.es/es/graphql';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-irish-riches-live-research-gate-v1.json';
const ALLOC='loterias-ai/casino/jackpots/evidence/botemania-jpk-allocation-prospective-status-v1.json';
const MBWB='loterias-ai/casino/jackpots/evidence/botemania-fishin-ingame-mbwb-v1.json';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const num=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
const strip=s=>String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const headers={accept:'text/html,*/*','user-agent':'loterias-ai-irish-riches-live-gate/1.0','cache-control':'no-cache'};
const pageResp=await fetch(PAGE,{headers,redirect:'follow'}),html=await pageResp.text(),text=strip(html);
const rtp=text.match(/Porcentaje de Retorno al Jugador\s*:\s*(\d{2}(?:[.,]\d{1,3})?)\s*€\s*\+\s*(\d{1,2}(?:[.,]\d{1,3})?)\s*%/i);
const basePct=rtp?num(rtp[1]):null,declaredExtraPct=rtp?num(rtp[2]):null;
const reserveText=text.match(/vuelve a aumentar nuevamente\s*\((\d{1,2}(?:[.,]\d{1,3})?)\s*%\s*de reserva\)/i);
const reserveMentionPct=reserveText?num(reserveText[1]):null;
const semanticsConflict=Number.isFinite(declaredExtraPct)&&Number.isFinite(reserveMentionPct)&&reserveMentionPct>declaredExtraPct;
const anyBet=/disponible con cualquier apuesta/i.test(text);
const resets=/volver[aá]n? a la cantidad inicial|restablece la cantidad del Bote de Reserva/i.test(text);

const query='query loadJackpots { blueprintJackpots { id amount } }';
const meter=await fetch(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:PAGE,'cache-control':'no-cache, no-store','user-agent':'loterias-ai-irish-riches-live-gate/1.0'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query})});
const meterText=await meter.text();let meterBody=null;try{meterBody=JSON.parse(meterText)}catch{}
const map={JACKPOTKING_ROYAL:'ROYAL',JACKPOTKING_REGAL:'REGAL',JACKPOTKING:'JACKPOT_KING'};const pots={};
for(const x of meterBody?.data?.blueprintJackpots||[]){const k=map[String(x?.id)],v=Number(x?.amount);if(k&&Number.isFinite(v))pots[k]=v;}
const sourceFresh=meter.ok&&['ROYAL','REGAL','JACKPOT_KING'].every(k=>Number.isFinite(pots[k])&&pots[k]>0);

const alloc=read(ALLOC),mbwb=read(MBWB);
const shares=alloc?.decision?.networkAllocationProspectivelyValidated===true?alloc?.weightedAllocationShares:null;
const cap={ROYAL:Number(mbwb?.mustBeWonBeforeEUR?.ROYAL),REGAL:Number(mbwb?.mustBeWonBeforeEUR?.REGAL)};
const exactMbwb=mbwb?.decision?.exactSpainMbwbKnown===true&&Number.isFinite(cap.ROYAL)&&Number.isFinite(cap.REGAL);
const alphaGrid=[1,1.25,1.5,2,3,4,5,7.5,10];
const seedFractionGrid=[0,0.1,0.2,0.3];
const declaredExtra=Number.isFinite(declaredExtraPct)?declaredExtraPct/100:null;
function tierEv(tier,alpha,seedFraction,activeContribution){
  const C=cap[tier],V=Number(pots[tier]),share=Number(shares?.[tier]);if(!Number.isFinite(C)||!Number.isFinite(V)||!Number.isFinite(share)||!Number.isFinite(activeContribution))return null;
  const seed=C*seedFraction;if(seed>=V||seed>=C)return null;const span=C-seed,q=Math.max(.0001,Math.min(.9998,(V-seed)/span));const F=q**alpha,f=alpha*q**(alpha-1);const contributionToTier=activeContribution*share;const hazardPerEuroStake=contributionToTier/span*f/Math.max(1e-15,1-F);return V*hazardPerEuroStake;
}
const scenarios=[];
if(Number.isFinite(basePct)&&Number.isFinite(declaredExtra)&&shares&&exactMbwb&&sourceFresh){
 for(const seedFraction of seedFractionGrid)for(const alpha of alphaGrid){
  // Deliberately favorable research stress: assign ALL Botemania-declared +1% to active pot growth.
  // This is not asserted as the actual contribution split; the Spanish page has a conflicting 1.5% reserve phrase.
  const royal=tierEv('ROYAL',alpha,seedFraction,declaredExtra),regal=tierEv('REGAL',alpha,seedFraction,declaredExtra);
  if(royal==null||regal==null)continue;const rr=royal+regal,totalWithoutKing=basePct/100+rr;scenarios.push({seedFraction,alpha,assumedAllDeclaredExtraActivePct:declaredExtraPct,royalEv:+royal.toFixed(8),regalEv:+regal.toFixed(8),royalRegalCombinedRtpPct:+(rr*100).toFixed(5),totalWithoutMainKingPct:+(totalWithoutKing*100).toFixed(5),requiredMainKingExtraRtpPctToReach100:+Math.max(0,100-totalWithoutKing*100).toFixed(5)});
 }
}
const best=scenarios.length?[...scenarios].sort((a,b)=>b.totalWithoutMainKingPct-a.totalWithoutMainKingPct)[0]:null;
const worst=scenarios.length?[...scenarios].sort((a,b)=>a.totalWithoutMainKingPct-b.totalWithoutMainKingPct)[0]:null;
const exactIrishTotalBetLadderKnown=false;
const exactContributionSplitKnown=false;
const exactHazardKnown=false;
const currentPositiveEvProven=false;
const blockers=[];
if(!sourceFresh)blockers.push('LIVE_SHARED_POT_SOURCE_NOT_FRESH');
if(!Number.isFinite(basePct)||!Number.isFinite(declaredExtraPct))blockers.push('BOTEMANIA_IRISH_RTP_WORDING_NOT_PARSED');
if(semanticsConflict)blockers.push('BOTEMANIA_IRISH_CONTRIBUTION_RESERVE_SEMANTICS_CONFLICT');
if(!exactContributionSplitKnown)blockers.push('EXACT_IRISH_ACTIVE_VS_RESERVE_CONTRIBUTION_SPLIT_UNKNOWN');
if(!exactHazardKnown)blockers.push('EXACT_JACKPOT_HAZARD_UNKNOWN');
if(!exactIrishTotalBetLadderKnown)blockers.push('EXACT_IRISH_TOTAL_BET_LADDER_UNKNOWN');
if(!currentPositiveEvProven)blockers.push('CURRENT_POSITIVE_EV_NOT_PROVEN');
const out={version:'botemania-irish-riches-live-research-gate-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',game:{slug:'irish-riches-megaways-jackpot-king',title:'Irish Riches Megaways: Jackpot King',url:PAGE},operatorPageEvidence:{httpStatus:pageResp.status,bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex'),baseRtpPct:basePct,declaredExtraPct,reserveMentionPct,semanticsConflict,anyBet,resetsToInitialOrReserve:resets},liveNetwork:{source:GRAPHQL,httpStatus:meter.status,sourceFresh,potsEUR:pots,networkAllocationProspectivelyValidated:Boolean(shares),allocationShares:shares,exactSpainMbwbKnown:exactMbwb,capEUR:cap},researchStress:{purpose:'FAVORABLE_ROYAL_REGAL_SENSITIVITY_ONLY_NOT_WAGERING_EV',assumption:'ASSIGN_ALL_BOTEMANIA_DECLARED_EXTRA_TO_ACTIVE_POT_GROWTH; ZERO MAIN_KING_CREDIT; SEED FRACTION GRID IS SENSITIVITY_NOT FACT',seedFractionGrid,alphaGrid,scenarios,bestCurrentRoyalRegalOnlyScenario:best,worstCurrentRoyalRegalOnlyScenario:worst},decision:{researchPriorityCandidate:true,currentPositiveEvProven,economicPromotionAllowed:false,realMoneyAllowed:false,automaticBettingAllowed:false,blockers,reason:'IRISH_IS_HIGH_PRIORITY_DISCOVERY_LEAD_BUT_OPERATOR_CONTRIBUTION_SEMANTICS_MAIN_KING_HAZARD_AND_EXACT_STAKE_REMAIN_UNRESOLVED'},guards:{operatorPagePrimary:true,foreignConfigNotUsedNumerically:true,declaredExtraNotAssertedAsActiveContribution:true,reserveMentionNotUsedAsContributionFact:true,noCrossGameExactHazardEquality:true,noSeedAsFact:true,noMainKingCreditInStress:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({operatorPageEvidence:out.operatorPageEvidence,liveNetwork:out.liveNetwork,researchStress:{best,scenarioCount:scenarios.length},decision:out.decision},null,2));
