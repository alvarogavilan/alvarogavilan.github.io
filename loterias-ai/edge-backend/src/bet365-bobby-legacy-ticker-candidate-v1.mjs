import {analyzeBet365BobbySportingHar} from './bet365-bobby-sporting-har-discovery-v1.mjs';
import {parsePlaytechMhbTickerXml} from '../../casino/jackpots/playtech-mhb-ticker-parser-v1.mjs';

const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const lower=v=>text(v)?.toLowerCase()??null;
const upper=v=>text(v)?.toUpperCase()??null;
const isoEpoch=v=>{const ms=Date.parse(String(v||''));return Number.isFinite(ms)?ms/1000:null;};
function decodeContent(content){const raw=String(content?.text||'');if(!raw)return '';if(String(content?.encoding||'').toLowerCase()!=='base64')return raw;try{if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');}catch{}return '';}
function fail(reason,extra={}){return {version:'bet365-bobby-legacy-ticker-candidate-v1',valid:false,reason,exactLegacySljp1ProtocolFieldsRecovered:false,bet365LicenseeBindingVerified:false,usableForOverduePair:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}
function safeRow(row){return {code:row?.code||null,network:row?.network||null,tier:row?.tier||null,providerScope:row?.providerScope||null,gameGroup:row?.gameGroup||null,gameTimestamp:row?.gameTimestamp??null,winCount:row?.winCount??null,amount:row?.amount??null,currency:row?.currency||null,instanceCode:row?.instanceCode||null,requestCasino:row?.requestCasino||null,requestStartTimestamp:row?.requestStartTimestamp??null,requestExecInterval:row?.requestExecInterval??null,local:row?.local??null,guaranteedHitTime:row?.guaranteedHitTime??null,guaranteeObserved:row?.guaranteeObserved||null};}

export function recoverBet365BobbyLegacySljp1Candidate(har,{sourceName='capture.har',maxFeedAgeIntervals=2}={}){
  const intervals=finite(maxFeedAgeIntervals);
  if(intervals===null||intervals<1||intervals>10)return fail('INVALID_FEED_AGE_POLICY',{maxFeedAgeIntervals});
  let obj;
  try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED',{sourceName});}
  const discovery=analyzeBet365BobbySportingHar(obj,{sourceName});
  if(discovery?.valid!==true)return fail('BOBBY_DISCOVERY_FAILED',{discoveryReason:discovery?.reason||null});
  const exact=(discovery?.candidates||[]).filter(x=>x?.exactTargetMarkerPrecedesTicker===true&&x?.conflictingLatestSportingMarker!==true&&/new_jackpotxml\.php$/i.test(String(x?.endpoint||'')));
  if(exact.length!==1)return fail(exact.length?'AMBIGUOUS_EXACT_LEGACY_SLJP1_CANDIDATES':'EXACT_LEGACY_SLJP1_CANDIDATE_NOT_FOUND',{candidateCount:exact.length});
  const candidate=exact[0],entry=(obj?.log?.entries||[])[candidate.tickerEntryIndex];
  if(!entry)return fail('LEGACY_TICKER_ENTRY_NOT_FOUND');
  const captureEpochSeconds=isoEpoch(entry?.startedDateTime);
  if(captureEpochSeconds===null)return fail('LEGACY_TICKER_CAPTURE_TIME_MISSING');
  const xml=decodeContent(entry?.response?.content);
  if(!xml||!/<request\b/i.test(xml)||!/<gamedata\b/i.test(xml))return fail('LEGACY_TICKER_XML_NOT_RECOVERED');
  const casinoCandidates=Array.isArray(candidate.requestCasinoCandidates)?candidate.requestCasinoCandidates.filter(Boolean):[];
  if(casinoCandidates.length!==1)return fail('EXACT_REQUEST_CASINO_NOT_UNAMBIGUOUS',{requestCasinoCandidateCount:casinoCandidates.length});
  const instanceCandidates=Array.isArray(candidate.instanceCodeCandidates)?candidate.instanceCodeCandidates.filter(Boolean):[];
  if(instanceCandidates.length>1)return fail('INSTANCE_CODE_AMBIGUOUS',{instanceCodeCandidateCount:instanceCandidates.length});
  const expectedCasino=casinoCandidates[0],expectedInstanceCode=instanceCandidates.length===1?instanceCandidates[0]:null;
  const parsed=parsePlaytechMhbTickerXml(xml,{nowEpochSeconds:captureEpochSeconds,currency:'EUR',casino:expectedCasino,local:0,instanceCode:expectedInstanceCode});
  const rows=(parsed?.rows||[]).filter(x=>x?.code==='sljp-1');
  if(rows.length!==1)return fail(rows.length?'AMBIGUOUS_PARSED_SLJP1_ROWS':'PARSED_SLJP1_ROW_NOT_FOUND',{parsedSljp1RowCount:rows.length});
  const row=rows[0];
  const amount=finite(row.amount),ght=finite(row.guaranteedHitTime),gameTs=finite(row.gameTimestamp),winc=finite(row.winCount),exec=finite(row.requestExecInterval);
  if(!(amount>0&&ght>0&&gameTs>0&&winc!==null&&winc>=0&&exec>0))return fail('INCOMPLETE_SLJP1_PROTOCOL_FIELDS',{snapshot:safeRow(row)});
  if(upper(row.currency)!=='EUR'||row.local!==0||row.providerScope!=='GLOBAL'||row.network!=='SPORTING_LEGENDS'||row.tier!=='DAILY')return fail('SLJP1_SCOPE_MISMATCH',{snapshot:safeRow(row)});
  if(lower(row.requestCasino)!==lower(expectedCasino))return fail('REQUEST_CASINO_ECHO_MISMATCH',{snapshot:safeRow(row)});
  if(expectedInstanceCode&&text(row.instanceCode)!==text(expectedInstanceCode))return fail('INSTANCE_CODE_ECHO_MISMATCH',{snapshot:safeRow(row)});
  if(row.guaranteeObserved!=='TIME')return fail('GUARANTEED_HIT_TIME_NOT_OBSERVED',{snapshot:safeRow(row)});
  const feedAgeSeconds=captureEpochSeconds-gameTs,maxFeedAgeSeconds=exec*intervals;
  if(feedAgeSeconds<0)return fail('FUTURE_SERVER_TIMESTAMP',{snapshot:safeRow(row),feedAgeSeconds});
  if(feedAgeSeconds>maxFeedAgeSeconds)return fail('SERVER_FEED_TOO_STALE',{snapshot:safeRow(row),feedAgeSeconds,maxFeedAgeSeconds});
  return {
    version:'bet365-bobby-legacy-ticker-candidate-v1',valid:true,
    reason:'EXACT_BOBBY_SESSION_MARKER_AND_FRESH_LEGACY_SLJP1_PROTOCOL_FIELDS_RECOVERED_OPERATOR_OWNERSHIP_PENDING',
    sourceName,captureEpochSeconds,tickerEntryIndex:candidate.tickerEntryIndex,tickerEndpoint:candidate.endpoint,
    expectedRequestCasino:expectedCasino,expectedInstanceCode,
    snapshot:safeRow(row),feedAgeSeconds,maxFeedAgeSeconds,
    exactBobbyProviderGameMarkerVerified:true,exactLegacySljp1ProtocolFieldsRecovered:true,
    currentDailyAmountCandidateRecovered:true,currentGuaranteedHitTimeCandidateRecovered:true,currentWinCountCandidateRecovered:true,currentGameTimestampCandidateRecovered:true,currentRequestExecIntervalCandidateRecovered:true,
    bet365LicenseeBindingVerified:false,exactBet365LauncherSemanticsVerified:false,exactBet365TickerEndpointOwnershipVerified:false,currentSljp1ExecutionStateVerified:false,usableForOverduePair:false,
    scientificUse:'This result recovers a fresh exact Sporting Legends Daily sljp-1 legacy XML vector from traffic that occurs after an exclusive Bobby George provider-game marker. It proves protocol-field recovery inside the supplied passive HAR, not that bet365 Spain owns the request casino or ticker endpoint. Licensee-specific session/config ownership must be independently bound before this vector may enter an overdue pair.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,rawXmlNeverEmitted:true,rawHarNeverEmitted:true,credentialsAndCookiesNeverEmitted:true,endpointQueriesAndFragmentsNeverEmitted:true,exclusiveBobbyMarkerRequired:true,legacySljp1Only:true,exactRequestCasinoEchoRequired:true,eurGlobalDailyRequired:true,freshServerTimestampRequired:true,licenseeEndpointOwnershipStillRequired:true,protocolVectorCannotAuthorizeGreen:true,noWagerProbe:true,noAutomaticBetting:true},
  };
}
