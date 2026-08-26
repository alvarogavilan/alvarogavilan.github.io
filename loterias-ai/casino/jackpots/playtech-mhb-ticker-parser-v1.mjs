const TARGETS = Object.freeze({
  'aognjp-2': {network:'AGE_OF_GODS_NORSE', tier:'DAILY', guarantee:'TIME'},
  'aognjp-3': {network:'AGE_OF_GODS_NORSE', tier:'EXTRA', guarantee:'AMOUNT'},
  'aognjp-7': {network:'AGE_OF_GODS_NORSE', tier:'INSTANT', guarantee:'AMOUNT'},
  'mrj-4': {network:'AGE_OF_GODS', tier:'ULTIMATE_POWER', guarantee:'NONE'},
  'krjp-1': {network:'KINGDOMS_RISE', tier:'EPIC', guarantee:'NONE'},
  'krjp-2': {network:'KINGDOMS_RISE', tier:'POWER_STRIKE', guarantee:'AMOUNT'},
  'krjp-3': {network:'KINGDOMS_RISE', tier:'DAILY_STRIKE', guarantee:'TIME'},
});

function attrs(src='') {
  const out={};
  for (const m of src.matchAll(/([A-Za-z_][\w:-]*)\s*=\s*(["'])(.*?)\2/g)) out[m[1]]=m[3];
  return out;
}
function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function epoch(v){const n=finite(v);return n!=null&&n>0?Math.trunc(n):null;}
function normalizeText(v){return typeof v==='string'&&v.trim()?v.trim():null;}
function normalizeLocal(v){
  if(v===true||v===1||v==='1') return 1;
  if(v===false||v===0||v==='0') return 0;
  return null;
}

export function parsePlaytechMhbTickerXml(xml,{
  nowEpochSeconds=Math.floor(Date.now()/1000),
  currency=null,
  casino=null,
  local=null,
  instanceCode=null,
}={}) {
  const s=String(xml||'');
  const wantedCurrency=normalizeText(currency)?.toLowerCase()??null;
  const wantedCasino=normalizeText(casino)?.toLowerCase()??null;
  const wantedLocal=normalizeLocal(local);
  const wantedInstanceCode=normalizeText(instanceCode);
  const out=[];
  const rejected={currency:0,casino:0,local:0,instanceCode:0};
  const requestMatch=s.match(/<request\b([^>]*)>/i);
  const requestAttrs=requestMatch?attrs(requestMatch[1]):{};
  const requestCasino=normalizeText(requestAttrs.casino);
  const requestCasinoNormalized=requestCasino?.toLowerCase()??null;
  const gameRe=/<gamedata\b([^>]*)>([\s\S]*?)<\/gamedata>/gi;
  for(const gm of s.matchAll(gameRe)){
    const ga=attrs(gm[1]);
    const code=ga.game||null;
    if(!code||!TARGETS[code]) continue;
    const rowLocal=normalizeLocal(ga.local);
    const amountRe=/<amount\b([^>]*)>([^<]*)<\/amount>/gi;
    for(const amountMatch of gm[2].matchAll(amountRe)){
      const aa=attrs(amountMatch[1]);
      const rowCurrency=normalizeText(aa.currency);
      const rowInstanceCode=normalizeText(aa.instancecode);
      if(wantedCurrency&&String(rowCurrency||'').toLowerCase()!==wantedCurrency){rejected.currency++;continue;}
      if(wantedCasino&&requestCasinoNormalized!==wantedCasino){rejected.casino++;continue;}
      if(wantedLocal!=null&&rowLocal!==wantedLocal){rejected.local++;continue;}
      if(wantedInstanceCode&&rowInstanceCode!==wantedInstanceCode){rejected.instanceCode++;continue;}
      const amount=finite(String(amountMatch[2]).trim());
      const guaranteedHitTime=epoch(aa.guaranteedHitTime);
      // Playtech's published XML specification historically misspells this
      // attribute as `guranteedHitAmount`; accept the corrected spelling too.
      const guaranteedHitAmount=finite(aa.guranteedHitAmount ?? aa.guaranteedHitAmount);
      const t=TARGETS[code];
      const distanceToGuaranteedHitAmount=(amount!=null&&guaranteedHitAmount!=null)?guaranteedHitAmount-amount:null;
      const secondsToGuaranteedHit=(guaranteedHitTime!=null)?guaranteedHitTime-nowEpochSeconds:null;
      out.push({
        code,network:t.network,tier:t.tier,expectedGuarantee:t.guarantee,
        amount,currency:rowCurrency,sign:aa.sign||null,stepPerSecond:finite(aa.step),
        wins:finite(aa.wins),instanceCode:rowInstanceCode,
        requestCasino,local:rowLocal,isLocal:rowLocal==null?null:rowLocal===1,
        guaranteedHitTime,guaranteedHitAmount,
        distanceToGuaranteedHitAmount,
        secondsToGuaranteedHit,
        guaranteeObserved: guaranteedHitTime!=null?'TIME':guaranteedHitAmount!=null?'AMOUNT':'NONE',
        failClosedMismatch:(t.guarantee==='TIME'&&guaranteedHitTime==null)||(t.guarantee==='AMOUNT'&&guaranteedHitAmount==null),
        bindingObserved:{casino:requestCasino!=null,local:rowLocal!=null,instanceCode:rowInstanceCode!=null},
      });
    }
  }
  return {
    version:'playtech-mhb-ticker-parser-v1.2-topology-safe',
    filters:{currency:wantedCurrency,casino:wantedCasino,local:wantedLocal,instanceCode:wantedInstanceCode},
    requestCasino,
    rows:out,
    rejected,
    guards:{
      parserOnly:true,multiCurrencySafe:true,topologyMetadataPreserved:true,exactBindingFiltersSupported:true,
      noTopologyInference:true,noBetting:true,realMoneyAllowed:false,
    },
  };
}

export const PLAYTECH_MHB_TARGETS = TARGETS;
