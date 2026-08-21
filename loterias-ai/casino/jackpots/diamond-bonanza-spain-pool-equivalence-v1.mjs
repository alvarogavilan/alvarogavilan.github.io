#!/usr/bin/env node
import fs from 'node:fs';

const OUT='loterias-ai/casino/jackpots/evidence/diamond-bonanza-spain-pool-equivalence-v1.json';
const QUERY='query loadJackpots { jackpots { id amount } }';
const TARGET_ID='diamondbonanza25BTM';
const timeoutMs=8000;

const fetchText=async(url,opts={})=>{
  const c=new AbortController(); const t=setTimeout(()=>c.abort(),timeoutMs);
  try{const r=await fetch(url,{...opts,signal:c.signal,redirect:'follow'}); const text=await r.text(); return {ok:r.ok,status:r.status,url:r.url,text:text.slice(0,500000),error:null};}
  catch(e){return {ok:false,status:null,url,error:String(e?.name==='AbortError'?'TIMEOUT':e?.message||e),text:''};}
  finally{clearTimeout(t);}
};

const ventures={
  botemania:['botemania_es'],
  monopoly:['monopolycasino_es','monopoly_es','monopolycasino','']
};
const cfg={
  botemania:{origin:'https://www.botemania.es',endpoint:'https://www.botemania.es/es/graphql',page:'https://www.botemania.es/juegos/slots-online/danza-de-los-diamantes'},
  monopoly:{origin:'https://www.monopolycasino.es',endpoint:'https://www.monopolycasino.es/es/graphql',page:'https://www.monopolycasino.es/juegos/slots-online/danza-de-los-diamantes'}
};

const probeGraphql=async(name)=>{
  const c=cfg[name],attempts=[];
  for(const venture of ventures[name]){
    const headers={accept:'application/json','content-type':'application/json',origin:c.origin,referer:c.origin+'/','cache-control':'no-cache, no-store, max-age=0','user-agent':'edge-diamond-spain-equivalence/1.0'};
    if(venture) headers.venture=venture;
    const r=await fetchText(c.endpoint,{method:'POST',headers,body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY})});
    let json=null; try{json=JSON.parse(r.text)}catch{}
    const rows=(json?.data?.jackpots||[]).map(x=>({id:String(x?.id??''),amount:Number(x?.amount)})).filter(x=>x.id&&Number.isFinite(x.amount));
    const target=rows.find(x=>x.id===TARGET_ID)||null;
    attempts.push({venture:venture||null,httpStatus:r.status,ok:r.ok,error:r.error,graphqlErrors:(json?.errors||[]).map(e=>String(e?.message||e)).slice(0,5),rowCount:rows.length,target});
    if(r.ok&&rows.length) return {resolvedVenture:venture||null,httpStatus:r.status,rows,target,attempts};
  }
  return {resolvedVenture:null,httpStatus:attempts.at(-1)?.httpStatus??null,rows:[],target:null,attempts};
};

const extractPageFacts=async(name)=>{
  const c=cfg[name],r=await fetchText(c.page,{headers:{accept:'text/html','user-agent':'edge-diamond-spain-equivalence/1.0'}});
  const s=r.text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').toLowerCase();
  const has=(x)=>s.includes(x.toLowerCase());
  return {httpStatus:r.status,ok:r.ok,finalUrl:r.url,error:r.error,facts:{titleOrDiamondBonanza:has('danza de los diamantes')||has('diamond bonanza'),rtp9544:has('95,44')||has('95.44'),coin25c:has('25c')||has('0,25'),coin1eur:has('1€')||has('1 €'),fivePaylines:has('5 líneas')||has('5 lineas')||has('5 líneas de premio')}};
};

const observedAt=new Date().toISOString();
const [bg,mg,bp,mp]=await Promise.all([probeGraphql('botemania'),probeGraphql('monopoly'),extractPageFacts('botemania'),extractPageFacts('monopoly')]);
const bothTargets=bg.target&&mg.target;
const amountDiffEUR=bothTargets?Math.abs(bg.target.amount-mg.target.amount):null;
const sameToCent=bothTargets?Math.round(bg.target.amount*100)===Math.round(mg.target.amount*100):false;
const identicalSpanishPublicRules=bp.facts.rtp9544&&mp.facts.rtp9544&&bp.facts.coin25c&&mp.facts.coin25c&&bp.facts.coin1eur&&mp.facts.coin1eur&&bp.facts.fivePaylines&&mp.facts.fivePaylines;
const sameSpanishSharedPoolStronglySupported=Boolean(sameToCent&&identicalSpanishPublicRules);
const out={
  version:'diamond-bonanza-spain-pool-equivalence-v1',observedAt,targetId:TARGET_ID,
  operators:{botemania:{graphql:bg,page:bp},monopoly:{graphql:mg,page:mp}},
  comparison:{exactTargetIdPresentBoth:Boolean(bothTargets),sameAmountToCent:sameToCent,amountDiffEUR,identicalSpanishPublicRules,sharedPoolEvidence:sameToCent?'VERY_HIGH_SIMULTANEOUS_EXACT_ID_AMOUNT_MATCH':bothTargets?'SAME_EXACT_ID_DIFFERENT_AMOUNT_OR_TIMING':'NOT_ESTABLISHED'},
  interpretation:{sameSpanishSharedPoolStronglySupported,sameProviderFamilyConfigurationStronglySupported:Boolean(identicalSpanishPublicRules&&bothTargets),exactHistoricalGBP25pConfigurationEquivalent:false,seed500EURVerified:false,averageHit7309EURVerified:false,exactJackpotContributionVerifiedForSpain:false,breakEvenJackpotEURVerified:false,economicPromotionAllowed:false,realMoneyAllowed:false},
  guards:{publicNoAuthOnly:true,noCookies:true,noLogin:true,noGameLaunch:true,noBetting:true,noCrossCurrencyThresholdPromotion:true,noHistoricalSeedSubstitution:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({observedAt,botemania:bg.target,monopoly:mg.target,comparison:out.comparison,interpretation:out.interpretation},null,2));
