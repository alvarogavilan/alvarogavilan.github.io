#!/usr/bin/env node
import fs from 'node:fs';

const OUT='loterias-ai/casino/jackpots/evidence/bouncy-bubbles-spain-pool-screen-v1.json';
const QUERY='query loadJackpots { jackpots { id amount } }';
const TARGET_ID='bouncy_bubbles_id';
const timeoutMs=8000;
const fetchText=async(url,opts={})=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetch(url,{...opts,signal:c.signal,redirect:'follow'});const text=await r.text();return{ok:r.ok,status:r.status,url:r.url,text:text.slice(0,500000),error:null}}catch(e){return{ok:false,status:null,url,error:String(e?.name==='AbortError'?'TIMEOUT':e?.message||e),text:''}}finally{clearTimeout(t)}};
const ventures={botemania:['botemania_es'],monopoly:['monopolycasino_es','monopoly_es','monopolycasino','']};
const cfg={
  botemania:{origin:'https://www.botemania.es',endpoint:'https://www.botemania.es/es/graphql',page:'https://www.botemania.es/juegos/slots-online/burbujas-saltarinas',triple:'https://www.botemania.es/juegos/slots-online/duble-buble-bote-triple'},
  monopoly:{origin:'https://www.monopolycasino.es',endpoint:'https://www.monopolycasino.es/es/graphql',page:'https://www.monopolycasino.es/juegos/slots-online/burbujas-saltarinas',triple:'https://www.monopolycasino.es/juegos/slots-online/duble-buble-bote-triple'}
};
async function probeGraphql(name){
  const c=cfg[name],attempts=[];
  for(const venture of ventures[name]){
    const headers={accept:'application/json','content-type':'application/json',origin:c.origin,referer:c.origin+'/','cache-control':'no-cache, no-store, max-age=0','user-agent':'edge-bouncy-spain-screen/1.1'};if(venture)headers.venture=venture;
    const r=await fetchText(c.endpoint,{method:'POST',headers,body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY})});let json=null;try{json=JSON.parse(r.text)}catch{}
    const rows=(json?.data?.jackpots||[]).map(x=>({id:String(x?.id??''),amount:Number(x?.amount)})).filter(x=>x.id&&Number.isFinite(x.amount));const target=rows.find(x=>x.id===TARGET_ID)||null;
    attempts.push({venture:venture||null,httpStatus:r.status,ok:r.ok,error:r.error,graphqlErrors:(json?.errors||[]).map(e=>String(e?.message||e)).slice(0,5),rowCount:rows.length,target});
    if(r.ok&&rows.length)return{resolvedVenture:venture||null,httpStatus:r.status,rows,target,attempts};
  }
  return{resolvedVenture:null,httpStatus:attempts.at(-1)?.httpStatus??null,rows:[],target:null,attempts};
}
const clean=t=>t.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').toLowerCase();
async function pageFacts(name){
  const c=cfg[name],r=await fetchText(c.page,{headers:{accept:'text/html','user-agent':'edge-bouncy-spain-screen/1.1'}});const s=clean(r.text),has=x=>s.includes(x.toLowerCase());
  return{httpStatus:r.status,ok:r.ok,finalUrl:r.url,error:r.error,facts:{title:has('burbujas saltarinas'),rtp9538:has('95,38')||has('95.38'),contribution009:has('0,09')||has('0.09'),coin10c:has('10c')||has('0,10'),coin20eur:has('20€')||has('20 €'),tenPaylines:has('10 líneas')||has('10 lineas'),proportionalToBet:has('proporcionales a la apuesta total')||has('proporcional a la apuesta total'),bubblePop:has('buble pop')||has('bubble pop')}};
}
async function tripleFacts(name){
  const c=cfg[name],r=await fetchText(c.triple,{headers:{accept:'text/html','user-agent':'edge-bouncy-spain-screen/1.1'}});const s=clean(r.text),has=x=>s.includes(x.toLowerCase());
  return{httpStatus:r.status,ok:r.ok,finalUrl:r.url,error:r.error,facts:{tripleTitle:has('duble buble bote triple'),threePots:has('tres botes progresivos')||has('tres botes'),boteMayorSharedWithBouncy:has('bote mayor')&&has('compartido con burbujas saltarinas'),allLinkedPotsResetTogether:(has('todos los botes progresivos')&&has('se reiniciarán')&&has('a la vez'))||(has('todos los botes progresivos')&&has('se reiniciaran')&&has('a la vez')),rtp9151:has('91,51')||has('91.51'),contribution049:has('0,49')||has('0.49')}};
}
const observedAt=new Date().toISOString();
const [bg,mg,bp,mp,bt,mt]=await Promise.all([probeGraphql('botemania'),probeGraphql('monopoly'),pageFacts('botemania'),pageFacts('monopoly'),tripleFacts('botemania'),tripleFacts('monopoly')]);
const bothTargets=Boolean(bg.target&&mg.target);const sameToCent=bothTargets&&Math.round(bg.target.amount*100)===Math.round(mg.target.amount*100);
const sameRules=['title','rtp9538','contribution009','coin10c','coin20eur','tenPaylines','proportionalToBet','bubblePop'].every(k=>bp.facts[k]===true&&mp.facts[k]===true);
const topologyConfirmedBoth=bt.facts.boteMayorSharedWithBouncy&&mt.facts.boteMayorSharedWithBouncy&&bt.facts.allLinkedPotsResetTogether&&mt.facts.allLinkedPotsResetTogether;
const baseRtpPct=95.38,contributionPct=0.09,requiredJackpotRtpPct=100-baseRtpPct,requiredContributionScale=requiredJackpotRtpPct/contributionPct;
const out={
  version:'bouncy-bubbles-spain-pool-screen-v1.1-shared-reset-topology',observedAt,targetId:TARGET_ID,
  operators:{botemania:{graphql:bg,page:bp,triplePage:bt},monopoly:{graphql:mg,page:mp,triplePage:mt}},
  comparison:{exactTargetIdPresentBoth:bothTargets,sameAmountToCent:sameToCent,amountDiffEUR:bothTargets?Math.abs(bg.target.amount-mg.target.amount):null,identicalSpanishPublicRules:sameRules,sharedPoolEvidence:sameToCent&&sameRules?'VERY_HIGH_SIMULTANEOUS_EXACT_ID_AMOUNT_MATCH':bothTargets?'SAME_ID_WITHOUT_FULL_RULE_OR_AMOUNT_MATCH':'NOT_ESTABLISHED'},
  spanishEconomics:{publishedBasePaybackPct:baseRtpPct,publishedContributionToJackpotPct:contributionPct,requiredJackpotRtpComponentPctToReach100:+requiredJackpotRtpPct.toFixed(2),requiredMultipleOfPublishedContributionRate:+requiredContributionScale.toFixed(3),interpretation:'Arithmetic screen only: 100 - 95.38 = 4.62 percentage points, equal to 51.333 times the published 0.09% contribution rate. This is NOT a jackpot meter threshold and assumes no meter-to-EV law.'},
  sharedResetTopology:{verifiedFromBothSpainOperatorRulePages:topologyConfirmedBoth,bouncyLinkedRole:'Duble Buble Bote Triple BOTE_MAYOR is explicitly shared with Burbujas Saltarinas',tripleHasThreeProgressivePots:bt.facts.threePots&&mt.facts.threePots,linkedPotsResetTogether:bt.facts.allLinkedPotsResetTogether&&mt.facts.allLinkedPotsResetTogether,implicationForInference:{aBouncyMeterResetProvesBouncyGameWonJackpot:false,aBouncyMeterResetMayRevealPostResetSeedCandidate:true,bouncyResetCountCanEstimateBouncySpecificHitProbability:false,reason:'Official Spain rules state a linked jackpot hit can reset all linked progressive pots together. A Burbujas meter drop therefore cannot be attributed to a Burbujas-originating hit without identifying the triggering game/tier.'}},
  externalComparator:{source:'Virgin/Gamesys-Roxor family public Bouncy Bubbles page',reportedSeedGBP:1000,configurationEquivalentToSpainVerified:false,reason:'Current external Bouncy Bubbles configurations publish different RTP/contribution values from Botemania Spain; the GBP seed must not be imported as EUR fact.'},
  interpretation:{sameSpanishSharedPoolStronglySupported:Boolean(sameToCent&&sameRules),exactBotemaniaFeedToGameIdentityVerified:false,exactSpainSeedEUR:null,exactSpainAverageHitEUR:null,exactSpainHitProbability:null,breakEvenJackpotEUR:null,currentPositiveEvProven:false,researchPriority:'LOWER_UNTIL_SHARED_RESET_TOPOLOGY_IDS_AND_LOCAL_SEED_HIT_LAW_RESOLVED',economicPromotionAllowed:false,realMoneyAllowed:false},
  guards:{publicNoAuthOnly:true,noCookies:true,noLogin:true,noGameLaunch:true,noBetting:true,noExternalSeedSubstitution:true,requiredContributionScaleIsNotThreshold:true,noLinearMeterEvAssumption:true,noResetAttributionWithoutTriggeringGame:true,noResetCountAsBouncyPHit:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({observedAt,botemania:bg.target,monopoly:mg.target,comparison:out.comparison,spanishEconomics:out.spanishEconomics,sharedResetTopology:out.sharedResetTopology,interpretation:out.interpretation},null,2));
