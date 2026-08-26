import {parsePlaytechMhbTickerXml} from '../../casino/jackpots/playtech-mhb-ticker-parser-v1.mjs';

const TARGETS=new Map([
  ['gpas_bgeorge_pop',{title:'Bobby George: Sporting Legends',nameMarker:'bobby george'}],
  ['gpas_slblara_pop',{title:'Brian Lara: Sporting Legends',nameMarker:'brian lara'}],
  ['gpas_slfbruno_pop',{title:'Frank Bruno: Sporting Legends',nameMarker:'frank bruno'}],
]);
const SPORTING_CODES=new Set([
  'tonymc','tmccoy','fdtsl','roos','gpas_slblara_pop','gpas_bgeorge_pop','gpas_bgeorgelo_pop',
  'gpas_slchelt_pop','gpas_slcheltlo_pop','gpas_slfbruno_pop','gpas_slfbrunolo_pop',
  'gpas_rcarloslx_pop','gpas_rcarloslxlo_pop','gpas_rcarlos_pop','gpas_rcarloslo_pop','gpas_gnsla1_pop','gpas_gnslb1_pop',
]);
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
const lower=v=>text(v)?.toLowerCase()??null;
const upper=v=>text(v)?.toUpperCase()??null;
const isoEpoch=v=>{const ms=Date.parse(String(v||''));return Number.isFinite(ms)?ms/1000:null;};
const uniq=a=>[...new Set(a.filter(Boolean))];
function decode(content){const raw=String(content?.text||'');if(!raw)return '';if(String(content?.encoding||'').toLowerCase()!=='base64')return raw;try{if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');}catch{}return '';}
function endpointShape(url){try{const u=new URL(String(url||''));if(!['https:','wss:'].includes(u.protocol))return null;return `${u.origin}${u.pathname}`;}catch{return null;}}
function parts(entry){const out=[];const req=entry?.request||{};if(req.url)out.push(String(req.url));if(req.postData?.text)out.push(String(req.postData.text));const body=decode(entry?.response?.content);if(body)out.push(body);for(const m of entry?._webSocketMessages||[])if(m?.data)out.push(String(m.data));return out;}
function codesIn(entry){const s=parts(entry).join('\n').toLowerCase();return [...SPORTING_CODES].filter(c=>s.includes(c));}
function targetMarker(entry,gameCode){const meta=TARGETS.get(gameCode);const s=parts(entry).join('\n').toLowerCase();return s.includes(gameCode)||(s.includes(meta.nameMarker)&&s.includes('sporting legends'));}
function safeQuery(url){const out={};try{const u=new URL(String(url||''));for(const key of ['casino','jackpotsCasino','currency','local','game','instanceCode']){const v=u.searchParams.get(key);if(v&&v.length<=80&&!/token|secret|password|session/i.test(v))out[key.toLowerCase()]=v;}}catch{}return out;}
function hasDaily(entry){const s=parts(entry).join('\n').toLowerCase();if(s.includes('sljp-1'))return true;try{return new URL(String(entry?.request?.url||'')).searchParams.get('game')?.toLowerCase()==='sljp-1';}catch{return false;}}
function isLegacyTicker(entry){const ep=endpointShape(entry?.request?.url)||'';return /new_jackpotxml\.php$/i.test(ep);}
function safeRow(row){return {code:row?.code||null,network:row?.network||null,tier:row?.tier||null,providerScope:row?.providerScope||null,gameGroup:row?.gameGroup||null,gameTimestamp:row?.gameTimestamp??null,winCount:row?.winCount??null,amount:row?.amount??null,currency:row?.currency||null,instanceCode:row?.instanceCode||null,requestCasino:row?.requestCasino||null,requestStartTimestamp:row?.requestStartTimestamp??null,requestExecInterval:row?.requestExecInterval??null,local:row?.local??null,guaranteedHitTime:row?.guaranteedHitTime??null,guaranteeObserved:row?.guaranteeObserved||null};}
function fail(reason,extra={}){return {version:'bet365-sporting-target-sljp1-candidate-v1',valid:false,reason,exactTargetProviderGameMarkerVerified:false,exactLegacySljp1ProtocolFieldsRecovered:false,bet365LicenseeBindingVerified:false,usableForSharedBinding:false,execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},...extra};}

export function recoverBet365SportingTargetSljp1Candidate(har,{gameCode,sourceName='capture.har',maxFeedAgeIntervals=2}={}){
  const target=String(gameCode||'').trim().toLowerCase();
  const meta=TARGETS.get(target);
  if(!meta)return fail('UNSUPPORTED_SPORTING_TARGET',{gameCode:target||null,sourceName});
  const intervals=finite(maxFeedAgeIntervals);if(intervals===null||intervals<1||intervals>10)return fail('INVALID_FEED_AGE_POLICY',{gameCode:target,sourceName,maxFeedAgeIntervals});
  let obj;try{obj=typeof har==='string'?JSON.parse(har):har;}catch{return fail('HAR_PARSE_FAILED',{gameCode:target,sourceName});}
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];if(!entries.length)return fail('HAR_HAS_NO_ENTRIES',{gameCode:target,sourceName});
  const markers=[];
  for(let i=0;i<entries.length;i++){const codes=uniq(codesIn(entries[i]));const isTarget=targetMarker(entries[i],target);if(codes.length||isTarget)markers.push({index:i,codes,isTarget});}
  const targetMarkers=markers.filter(m=>m.isTarget||m.codes.includes(target));if(!targetMarkers.length)return fail('EXACT_TARGET_MARKER_NOT_FOUND',{gameCode:target,sourceName});
  const candidates=[];
  for(let i=0;i<entries.length;i++){
    const entry=entries[i];if(!isLegacyTicker(entry)||!hasDaily(entry))continue;
    const latest=markers.filter(m=>m.index<i).sort((a,b)=>b.index-a.index)[0]||null;
    const exclusive=!!latest&&(latest.isTarget||latest.codes.includes(target))&&latest.codes.every(c=>c===target);
    if(!exclusive)continue;
    const q=safeQuery(entry?.request?.url);
    candidates.push({index:i,endpoint:endpointShape(entry?.request?.url),query:q});
  }
  if(candidates.length!==1)return fail(candidates.length?'AMBIGUOUS_EXACT_LEGACY_SLJP1_CANDIDATES':'EXACT_LEGACY_SLJP1_CANDIDATE_NOT_FOUND',{gameCode:target,sourceName,candidateCount:candidates.length});
  const candidate=candidates[0],entry=entries[candidate.index],captureEpochSeconds=isoEpoch(entry?.startedDateTime);if(captureEpochSeconds===null)return fail('LEGACY_TICKER_CAPTURE_TIME_MISSING',{gameCode:target,sourceName});
  const xml=decode(entry?.response?.content);if(!xml||!/<request\b/i.test(xml)||!/<gamedata\b/i.test(xml))return fail('LEGACY_TICKER_XML_NOT_RECOVERED',{gameCode:target,sourceName});
  const expectedCasino=text(candidate.query.casino||candidate.query.jackpotscasino);if(!expectedCasino)return fail('EXACT_REQUEST_CASINO_NOT_RECOVERED',{gameCode:target,sourceName});
  const expectedInstanceCode=text(candidate.query.instancecode);
  const parsed=parsePlaytechMhbTickerXml(xml,{nowEpochSeconds:captureEpochSeconds,currency:'EUR',casino:expectedCasino,local:0,instanceCode:expectedInstanceCode});
  const rows=(parsed?.rows||[]).filter(r=>r?.code==='sljp-1');if(rows.length!==1)return fail(rows.length?'AMBIGUOUS_PARSED_SLJP1_ROWS':'PARSED_SLJP1_ROW_NOT_FOUND',{gameCode:target,sourceName,parsedSljp1RowCount:rows.length});
  const row=rows[0],amount=finite(row.amount),ght=finite(row.guaranteedHitTime),gameTs=finite(row.gameTimestamp),winc=finite(row.winCount),exec=finite(row.requestExecInterval);
  if(!(amount>0&&ght>0&&gameTs>0&&winc!==null&&winc>=0&&exec>0))return fail('INCOMPLETE_SLJP1_PROTOCOL_FIELDS',{gameCode:target,sourceName,snapshot:safeRow(row)});
  if(upper(row.currency)!=='EUR'||row.local!==0||row.providerScope!=='GLOBAL'||row.network!=='SPORTING_LEGENDS'||row.tier!=='DAILY')return fail('SLJP1_SCOPE_MISMATCH',{gameCode:target,sourceName,snapshot:safeRow(row)});
  if(lower(row.requestCasino)!==lower(expectedCasino))return fail('REQUEST_CASINO_ECHO_MISMATCH',{gameCode:target,sourceName,snapshot:safeRow(row)});
  if(expectedInstanceCode&&text(row.instanceCode)!==expectedInstanceCode)return fail('INSTANCE_CODE_ECHO_MISMATCH',{gameCode:target,sourceName,snapshot:safeRow(row)});
  if(row.guaranteeObserved!=='TIME')return fail('GUARANTEED_HIT_TIME_NOT_OBSERVED',{gameCode:target,sourceName,snapshot:safeRow(row)});
  const feedAgeSeconds=captureEpochSeconds-gameTs,maxFeedAgeSeconds=exec*intervals;if(feedAgeSeconds<0)return fail('FUTURE_SERVER_TIMESTAMP',{gameCode:target,sourceName,feedAgeSeconds});if(feedAgeSeconds>maxFeedAgeSeconds)return fail('SERVER_FEED_TOO_STALE',{gameCode:target,sourceName,feedAgeSeconds,maxFeedAgeSeconds});
  return {version:'bet365-sporting-target-sljp1-candidate-v1',valid:true,reason:'EXACT_TARGET_MARKER_AND_FRESH_SLJP1_VECTOR_RECOVERED_BET365_OWNERSHIP_PENDING',sourceName,gameCode:target,title:meta.title,captureEpochSeconds,tickerEntryIndex:candidate.index,tickerEndpoint:candidate.endpoint,expectedRequestCasino:expectedCasino,expectedInstanceCode,snapshot:safeRow(row),feedAgeSeconds,maxFeedAgeSeconds,exactTargetProviderGameMarkerVerified:true,exactLegacySljp1ProtocolFieldsRecovered:true,bet365LicenseeBindingVerified:false,exactBet365TickerEndpointOwnershipVerified:false,servedTenCentEligibilityVerified:false,usableForSharedBinding:true,scientificUse:'Passive exact-target recovery for one current low-cost bet365 Spain Sporting Legends candidate. It binds a fresh EUR global Daily sljp-1 vector to the latest exclusive provider-game marker inside the supplied HAR, but does not infer that the endpoint/casino belongs to bet365 Spain or that the operator-published 0.10 EUR minimum is jackpot-eligible.',execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,passiveHarOnly:true,exclusiveTargetMarkerRequired:true,legacySljp1Only:true,eurGlobalDailyRequired:true,freshServerTimestampRequired:true,rawHarNeverEmitted:true,rawXmlNeverEmitted:true,credentialsNeverEmitted:true,licenseeOwnershipStillRequired:true,tenCentEligibilityStillRequired:true,noWagerProbe:true,noAutomaticBetting:true}};
}
