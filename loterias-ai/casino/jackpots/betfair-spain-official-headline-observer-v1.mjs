const finite=(v)=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=(v)=>typeof v==='string'&&v.trim()?v.trim():null;
const OFFICIAL_SOURCE='OFFICIAL_BETFAIR_ES_GAME_PAGE';

export function evaluateBetfairSpainOfficialHeadlineSequence({
  observations,
  expectedUrl='https://casino.betfair.es/juego/ap-mccoy-sporting-legends-cptn',
  expectedGame='AP McCoy Sporting Legends™',
}={}){
  const guards={
    researchOnly:true,
    operatorPageHeadlineIsTierUnbound:true,
    headlineCannotPopulateDailyAmount:true,
    headlineCannotPopulateGuaranteedHitTime:true,
    headlineCannotPopulateTickerOrIms:true,
    headlineChangeCannotAuthorizeExecution:true,
    realMoneyAllowed:false,
  };
  const fail=(reason,extra={})=>({version:'betfair-spain-official-headline-observer-v1',valid:false,reason,usableForExecution:false,guards,...extra});
  const list=Array.isArray(observations)?observations:[];
  if(list.length<2)return fail('NEED_AT_LEAST_TWO_OBSERVATIONS');
  const normalized=[];
  for(const x of list){
    if(!x||typeof x!=='object')return fail('INVALID_OBSERVATION');
    const observedAt=text(x.observedAt),sourceUrl=text(x.sourceUrl),sourceClass=text(x.sourceClass),game=text(x.game),amountEUR=finite(x.amountEUR);
    if(!observedAt||!sourceUrl||!sourceClass||!game||amountEUR===null||!(amountEUR>0))return fail('INCOMPLETE_OBSERVATION');
    const epochSeconds=Date.parse(observedAt)/1000;
    if(!Number.isFinite(epochSeconds))return fail('INVALID_OBSERVED_AT');
    if(sourceUrl!==expectedUrl)return fail('UNEXPECTED_SOURCE_URL');
    if(sourceClass!==OFFICIAL_SOURCE)return fail('UNVERIFIED_SOURCE_CLASS');
    if(game!==expectedGame)return fail('UNEXPECTED_GAME');
    if(x.exactHeadlineAmountVerified!==true)return fail('HEADLINE_AMOUNT_NOT_EXACTLY_VERIFIED');
    if(x.headlineTierBindingVerified!==false)return fail('TIER_BINDING_MUST_REMAIN_UNVERIFIED');
    normalized.push({observedAt,epochSeconds,sourceUrl,sourceClass,game,amountEUR});
  }
  normalized.sort((a,b)=>a.epochSeconds-b.epochSeconds);
  for(let i=1;i<normalized.length;i++)if(!(normalized[i].epochSeconds>normalized[i-1].epochSeconds))return fail('NON_INCREASING_OBSERVATION_TIME');
  const transitions=[];
  for(let i=1;i<normalized.length;i++){
    const a=normalized[i-1],b=normalized[i],deltaEUR=b.amountEUR-a.amountEUR,durationSeconds=b.epochSeconds-a.epochSeconds;
    transitions.push({
      fromObservedAt:a.observedAt,toObservedAt:b.observedAt,fromAmountEUR:a.amountEUR,toAmountEUR:b.amountEUR,
      deltaEUR,durationSeconds,
      classification:deltaEUR>0?'GROWTH':deltaEUR<0?'DROP_RESET_OR_AWARD_CANDIDATE':'FLAT',
    });
  }
  const first=normalized[0],last=normalized.at(-1);
  return {
    version:'betfair-spain-official-headline-observer-v1',valid:true,reason:'OFFICIAL_OPERATOR_HEADLINE_SEQUENCE_VERIFIED',
    observations:normalized,transitions,
    stateChangeVerified:transitions.some(x=>x.deltaEUR!==0),
    latestAmountEUR:last.amountEUR,
    netDeltaEUR:last.amountEUR-first.amountEUR,
    elapsedSeconds:last.epochSeconds-first.epochSeconds,
    headlineTierBindingVerified:false,
    canInferDailyAmount:false,
    canInferTickerState:false,
    canInferGuaranteedHitTime:false,
    usableForExecution:false,
    guards,
  };
}
