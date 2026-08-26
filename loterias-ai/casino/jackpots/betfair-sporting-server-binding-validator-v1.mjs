import {parsePlaytechMhbTickerXml} from './playtech-mhb-ticker-parser-v1.mjs';

const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const upper=v=>text(v)?.toUpperCase()??null;

function betfairInitialResourcesSource(url){
  try{
    const u=new URL(url),h=u.hostname.toLowerCase();
    return u.protocol==='https:'&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(u.pathname);
  }catch{return false;}
}
function bindingShapeValid(b){return !!b&&b.sameDocument===true&&b.sourceBetfairOwned===true&&b.sourceInitialResources===true&&betfairInitialResourcesSource(b.sourceUrl)&&!!text(b.jackpotsCasino)&&!!text(b.tickerUrl);}
function sameConfiguredEndpoint(configured,response){
  try{
    const a=new URL(configured),b=new URL(response);
    return a.protocol==='https:'&&b.protocol==='https:'&&a.origin===b.origin&&a.pathname===b.pathname;
  }catch{return false;}
}

export function buildBetfairSportingSljp1RequestUrl(configBinding){
  if(!bindingShapeValid(configBinding))return null;
  try{
    const u=new URL(configBinding.tickerUrl);
    if(u.protocol!=='https:')return null;
    u.searchParams.set('info','1');
    u.searchParams.set('casino',text(configBinding.jackpotsCasino));
    u.searchParams.set('game','sljp-1');
    u.searchParams.set('local','0');
    u.searchParams.set('currency','eur');
    const instanceCode=text(configBinding.instanceCode);
    if(instanceCode)u.searchParams.set('instanceCode',instanceCode);else u.searchParams.delete('instanceCode');
    return u.href;
  }catch{return null;}
}

export function validateBetfairSportingServerSnapshot({
  configBinding,tickerXml,responseUrl,nowEpochSeconds=Math.floor(Date.now()/1000),maxFeedAgeIntervals=2,
}={}){
  const guards={
    exactCoLocatedBetfairConfigBindingRequired:true,
    responseMustComeFromConfiguredTickerEndpoint:true,
    requestCasinoMustEchoConfigCasino:true,
    exactSljp1EurLocal0Required:true,
    freshServerTimestampRequired:true,
    currentSnapshotCannotProveOverdueByItself:true,
    noAutomaticWagering:true,noWagerProbe:true,realMoneyAllowed:false,
  };
  const fail=(reason,extra={})=>({version:'betfair-sporting-server-binding-validator-v1.1-request-builder',valid:false,usableForOverduePair:false,exactBetfairSpainTickerImsBindingVerified:false,currentSljp1RowRecovered:false,currentDailyAmountExactVerified:false,currentGuaranteedHitTimeExactVerified:false,decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,reason,guards,...extra});
  const b=configBinding;
  if(!bindingShapeValid(b))return fail('CONFIG_BINDING_NOT_COLOCATED_AND_VERIFIED');
  const casino=text(b.jackpotsCasino),tickerUrl=text(b.tickerUrl),seenUrl=text(responseUrl);
  if(!casino||!tickerUrl||!seenUrl)return fail('INCOMPLETE_CONFIG_OR_RESPONSE_URL');
  if(!sameConfiguredEndpoint(tickerUrl,seenUrl))return fail('TICKER_RESPONSE_ENDPOINT_MISMATCH');
  const now=finite(nowEpochSeconds),maxIntervals=finite(maxFeedAgeIntervals);
  if(now===null||!(maxIntervals>=1))return fail('INVALID_FRESHNESS_POLICY');

  const parsed=parsePlaytechMhbTickerXml(tickerXml,{nowEpochSeconds:now,currency:'EUR',casino,local:0,instanceCode:text(b.instanceCode)});
  const rows=parsed.rows.filter(x=>x.code==='sljp-1');
  if(rows.length!==1)return fail(rows.length?'AMBIGUOUS_SLJP1_ROW':'EXACT_SLJP1_ROW_NOT_RECOVERED',{parsed});
  const row=rows[0];
  if(text(row.requestCasino)?.toLowerCase()!==casino.toLowerCase())return fail('REQUEST_CASINO_ECHO_MISMATCH',{parsed});
  if(upper(row.currency)!=='EUR'||row.local!==0||row.providerScope!=='GLOBAL')return fail('SLJP1_SCOPE_OR_CURRENCY_MISMATCH',{parsed});
  if(row.guaranteeObserved!=='TIME'||row.failClosedMismatch===true)return fail('SLJP1_GUARANTEED_TIME_MISSING',{parsed});
  const amount=finite(row.amount),ght=finite(row.guaranteedHitTime),gameTs=finite(row.gameTimestamp),winCount=finite(row.winCount),execInterval=finite(row.requestExecInterval);
  if(!(amount>0&&ght>0&&gameTs>0&&winCount!==null&&winCount>=0&&execInterval>0))return fail('INCOMPLETE_SLJP1_PROTOCOL_FIELDS',{parsed});
  const feedAgeSeconds=now-gameTs,maxFeedAgeSeconds=execInterval*maxIntervals;
  if(feedAgeSeconds<0)return fail('FUTURE_SERVER_TIMESTAMP',{parsed,feedAgeSeconds});
  if(feedAgeSeconds>maxFeedAgeSeconds)return fail('SERVER_FEED_TOO_STALE',{parsed,feedAgeSeconds,maxFeedAgeSeconds});

  return {
    version:'betfair-sporting-server-binding-validator-v1.1-request-builder',valid:true,usableForOverduePair:true,
    reason:'EXACT_BETFAIR_SPORTING_SERVER_BINDING_AND_FRESH_SLJP1_SNAPSHOT_VERIFIED',
    exactBetfairSpainTickerImsBindingVerified:true,currentSljp1RowRecovered:true,currentDailyAmountExactVerified:true,currentGuaranteedHitTimeExactVerified:true,
    configSourceUrl:b.sourceUrl,tickerEndpoint:tickerUrl,responseUrl:seenUrl,expectedBetfairImsCasino:casino,
    snapshot:row,feedAgeSeconds,maxFeedAgeSeconds,
    currentSnapshotCannotProveOverdueByItself:true,
    decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,guards,
  };
}
