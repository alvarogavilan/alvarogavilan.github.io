#!/usr/bin/env node
import fs from 'node:fs';

const TARGET_ID='DealOrNoDealStateful3';
const OUT='loterias-ai/casino/jackpots/evidence/deal-stateful3-spain-pool-equivalence-v1.json';
const QUERY='query loadJackpots { jackpots { id amount } }';
const timeoutMs=8000;
const cfg={
  botemania:{origin:'https://www.botemania.es',endpoint:'https://www.botemania.es/es/graphql',ventures:['botemania_es']},
  monopoly:{origin:'https://www.monopolycasino.es',endpoint:'https://www.monopolycasino.es/es/graphql',ventures:['monopolycasino_es','monopoly_es','monopolycasino','']}
};

const fetchText=async(url,opts={})=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetch(url,{...opts,signal:c.signal,redirect:'follow'});return {ok:r.ok,status:r.status,url:r.url,text:(await r.text()).slice(0,500000),error:null};}catch(e){return {ok:false,status:null,url,error:String(e?.name==='AbortError'?'TIMEOUT':e?.message||e),text:''};}finally{clearTimeout(t);}};

async function probe(name){
  const c=cfg[name],attempts=[];
  for(const venture of c.ventures){
    const headers={accept:'application/json','content-type':'application/json',origin:c.origin,referer:c.origin+'/','cache-control':'no-cache, no-store, max-age=0','user-agent':'edge-deal-stateful3-equivalence/1.0'};
    if(venture)headers.venture=venture;
    const r=await fetchText(c.endpoint,{method:'POST',headers,body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY})});
    let body=null;try{body=JSON.parse(r.text)}catch{}
    const rows=(body?.data?.jackpots||[]).map(x=>({id:String(x?.id??''),amountEUR:Number(x?.amount)})).filter(x=>x.id&&Number.isFinite(x.amountEUR));
    const target=rows.find(x=>x.id===TARGET_ID)||null;
    attempts.push({venture:venture||null,httpStatus:r.status,ok:r.ok,error:r.error,graphqlErrors:(body?.errors||[]).map(e=>String(e?.message||e)).slice(0,5),rowCount:rows.length,target});
    if(r.ok&&rows.length)return {resolvedVenture:venture||null,httpStatus:r.status,rowCount:rows.length,target,attempts};
  }
  return {resolvedVenture:null,httpStatus:attempts.at(-1)?.httpStatus??null,rowCount:0,target:null,attempts};
}

const observedAt=new Date().toISOString();
const [botemania,monopoly]=await Promise.all([probe('botemania'),probe('monopoly')]);
const both=Boolean(botemania.target&&monopoly.target);
const sameToCent=both&&Math.round(botemania.target.amountEUR*100)===Math.round(monopoly.target.amountEUR*100);
const diff=both?Math.abs(botemania.target.amountEUR-monopoly.target.amountEUR):null;
const out={
  version:'deal-stateful3-spain-pool-equivalence-v1',observedAt,targetId:TARGET_ID,
  operators:{botemania,monopoly},
  comparison:{exactTargetIdPresentBoth:both,sameAmountToCent:sameToCent,amountDiffEUR:diff,sharedSpanishPoolEvidence:sameToCent?'VERY_HIGH_SIMULTANEOUS_EXACT_ID_AMOUNT_MATCH':both?'SAME_EXACT_ID_AMOUNT_NOT_MATCHED_TO_CENT':'NOT_ESTABLISHED'},
  interpretation:{sameSpanishSharedPoolStronglySupported:sameToCent,currentPlayableGameIdentityVerified:false,currentProviderVerified:false,currentDenominationVerified:false,historical5pGamesysConfigurationEquivalent:false,historicalSeed2000GBPApplicable:false,historicalAverageHit101969GBPApplicable:false,currentSpainSeedEUR:null,currentSpainAverageHitEUR:null,currentSpainBreakEvenEUR:null,economicPromotionAllowed:false,realMoneyAllowed:false},
  guards:{publicNoAuthOnly:true,noCookies:true,noLogin:true,noGameLaunch:true,noBetting:true,noLegacyFamilyEqualsCurrentStatefulAssumption:true,noCrossCurrencyThresholdPromotion:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({observedAt,botemania:botemania.target,monopoly:monopoly.target,comparison:out.comparison,interpretation:out.interpretation},null,2));
