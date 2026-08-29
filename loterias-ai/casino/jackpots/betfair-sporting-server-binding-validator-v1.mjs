import {parsePlaytechMhbTickerXml} from './playtech-mhb-ticker-parser-v1.mjs';

const VERSION='betfair-sporting-server-binding-validator-v1';
const CONTRACT_REVISION='v1.1-exact-timed-tier-selection';
const TIMED_CODES=new Set(['sljp-1','sljp-2']);
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const upper=v=>text(v)?.toUpperCase()??null;

function betfairInitialResourcesSource(url){
  try{
    const u=new URL(url),h=u.hostname.toLowerCase();
    return u.protocol==='https:'&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(u.pathname);
  }catch{return false;}
}
function sameConfiguredEndpoint(configured,response){
  try{
    const a=new URL(configured),b=new URL(response);
    return a.protocol==='https:'&&b.protocol==='https:'&&a.origin===b.origin&&a.pathname===b.pathname;
  }catch{return false;}
}
function tierName(code){return code==='sljp-1'?'DAILY':code==='sljp-2'?'WEEKLY':null;}

export function validateBetfairSportingServerSnapshot({
  configBinding,tickerXml,responseUrl,nowEpochSeconds=Math.floor(Date.now()/1000),maxFeedAgeIntervals=2,requiredCode='sljp-1',
}={}){
  const code=text(requiredCode)?.toLowerCase()||null;
  const tier=tierName(code);
  const guards={
    exactCoLocatedBetfairConfigBindingRequired:true,
    responseMustComeFromConfiguredTickerEndpoint:true,
    requestCasinoMustEchoConfigCasino:true,
    exactTimedSljpEurLocal0Required:true,
    requiredCode:code,
    supportedTimedCodes:[...TIMED_CODES],
    freshServerTimestampRequired:true,
    currentSnapshotCannotProveOverdueByItself:true,
    weeklyValidationIsResearchOnlyUntilSeparateProspectiveReview:true,
    noAutomaticWagering:true,noWagerProbe:true,realMoneyAllowed:false,
  };
  const fail=(reason,extra={})=>({
    version:VERSION,contractRevision:CONTRACT_REVISION,valid:false,usableForOverduePair:false,
    requiredCode:code,tier,exactBetfairSpainTickerImsBindingVerified:false,currentTimedTierRowRecovered:false,
    currentTimedAmountExactVerified:false,currentGuaranteedHitTimeExactVerified:false,
    currentSljp1RowRecovered:false,currentDailyAmountExactVerified:false,currentSljp2RowRecovered:false,currentWeeklyAmountExactVerified:false,
    decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,reason,guards,...extra
  });
  if(!TIMED_CODES.has(code))return fail('SUPPORTED_TIMED_SLJP_CODE_REQUIRED');
  const b=configBinding;
  if(!b||b.sameDocument!==true||b.sourceBetfairOwned!==true||b.sourceInitialResources!==true)return fail('CONFIG_BINDING_NOT_COLOCATED_AND_VERIFIED');
  if(!betfairInitialResourcesSource(b.sourceUrl))return fail('CONFIG_SOURCE_NOT_BETFAIR_INITIAL_RESOURCES');
  const casino=text(b.jackpotsCasino),tickerUrl=text(b.tickerUrl),seenUrl=text(responseUrl);
  if(!casino||!tickerUrl||!seenUrl)return fail('INCOMPLETE_CONFIG_OR_RESPONSE_URL');
  if(!sameConfiguredEndpoint(tickerUrl,seenUrl))return fail('TICKER_RESPONSE_ENDPOINT_MISMATCH');
  const now=finite(nowEpochSeconds),maxIntervals=finite(maxFeedAgeIntervals);
  if(now===null||!(maxIntervals>=1))return fail('INVALID_FRESHNESS_POLICY');

  const parsed=parsePlaytechMhbTickerXml(tickerXml,{nowEpochSeconds:now,currency:'EUR',casino,local:0,instanceCode:text(b.instanceCode)});
  const rows=parsed.rows.filter(x=>x.code===code);
  if(rows.length!==1)return fail(rows.length?'AMBIGUOUS_REQUIRED_TIMED_SLJP_ROW':'EXACT_REQUIRED_TIMED_SLJP_ROW_NOT_RECOVERED',{parsed});
  const row=rows[0];
  if(text(row.requestCasino)?.toLowerCase()!==casino.toLowerCase())return fail('REQUEST_CASINO_ECHO_MISMATCH',{parsed});
  if(upper(row.currency)!=='EUR'||row.local!==0||row.providerScope!=='GLOBAL')return fail('TIMED_SLJP_SCOPE_OR_CURRENCY_MISMATCH',{parsed});
  if(row.guaranteeObserved!=='TIME'||row.failClosedMismatch===true)return fail('TIMED_SLJP_GUARANTEED_TIME_MISSING',{parsed});
  const amount=finite(row.amount),ght=finite(row.guaranteedHitTime),gameTs=finite(row.gameTimestamp),winCount=finite(row.winCount),execInterval=finite(row.requestExecInterval);
  if(!(amount>0&&ght>0&&gameTs>0&&winCount!==null&&winCount>=0&&execInterval>0))return fail('INCOMPLETE_TIMED_SLJP_PROTOCOL_FIELDS',{parsed});
  const feedAgeSeconds=now-gameTs,maxFeedAgeSeconds=execInterval*maxIntervals;
  if(feedAgeSeconds<0)return fail('FUTURE_SERVER_TIMESTAMP',{parsed,feedAgeSeconds});
  if(feedAgeSeconds>maxFeedAgeSeconds)return fail('SERVER_FEED_TOO_STALE',{parsed,feedAgeSeconds,maxFeedAgeSeconds});

  const isDaily=code==='sljp-1',isWeekly=code==='sljp-2';
  return {
    version:VERSION,contractRevision:CONTRACT_REVISION,valid:true,
    usableForOverduePair:isDaily,
    usableForWeeklyResearch:isWeekly,
    reason:isDaily?'EXACT_BETFAIR_SPORTING_SERVER_BINDING_AND_FRESH_SLJP1_SNAPSHOT_VERIFIED':'EXACT_BETFAIR_SPORTING_SERVER_BINDING_AND_FRESH_SLJP2_SNAPSHOT_VERIFIED_RESEARCH_ONLY',
    requiredCode:code,tier,
    exactBetfairSpainTickerImsBindingVerified:true,currentTimedTierRowRecovered:true,currentTimedAmountExactVerified:true,currentGuaranteedHitTimeExactVerified:true,
    currentSljp1RowRecovered:isDaily,currentDailyAmountExactVerified:isDaily,currentSljp2RowRecovered:isWeekly,currentWeeklyAmountExactVerified:isWeekly,
    configSourceUrl:b.sourceUrl,tickerEndpoint:tickerUrl,responseUrl:seenUrl,expectedBetfairImsCasino:casino,
    snapshot:row,feedAgeSeconds,maxFeedAgeSeconds,
    currentSnapshotCannotProveOverdueByItself:true,
    decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0,guards,
  };
}
