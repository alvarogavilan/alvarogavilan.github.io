#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const VERSION='casino777-roberto-sporting-safe-har-analyzer-v1';
const TARGET_HOST='www.casino777.es';
const TARGET_PATH='/roberto-carlos-sporting-legends';
const SPORTING_GROUP='sljp';
const DAILY_CODE='sljp-1';
const PROVIDER_CODE_CANDIDATES=['gpas_rcarloslx_pop','gpas_rcarlos_pop'];
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const intOrNull=v=>{const n=finite(v);return n!==null&&Number.isInteger(n)?n:null;};
function parseUrl(raw){try{return new URL(String(raw||''));}catch{return null;}}
function safeEndpoint(raw){const u=parseUrl(raw);return u&&u.protocol==='https:'?`${u.origin}${u.pathname}`:null;}
function decodeContent(content={}){const t=typeof content.text==='string'?content.text:'';if(!t)return '';if(content.encoding==='base64'){try{return Buffer.from(t,'base64').toString('utf8');}catch{return '';}}return t;}
function attr(text,name){const m=String(text||'').match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`,'i'));return m?m[1]:null;}
function fail(reason,extra={}){return {version:VERSION,ok:false,reason,...extra,execution:execution(),hardGuards:{rawHarNeverEmitted:true,requestQueriesNeverEmitted:true,authorizationCookiePostDataNeverEmitted:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}};}
function exactTargetPage(url){const u=parseUrl(url);return !!u&&u.hostname.toLowerCase()===TARGET_HOST&&u.pathname.replace(/\/$/,'')===TARGET_PATH;}
function parseSportingRows(xml,requestUrl){
  const rows=[];const re=/<gamedata\b([^>]*)>([\s\S]*?)<\/gamedata>/gi;let m;
  while((m=re.exec(String(xml||'')))){
    const gAttrs=m[1],body=m[2];
    const game=(attr(gAttrs,'game')||'').toLowerCase();
    const group=(attr(gAttrs,'gamegroup')||'').toLowerCase();
    if(!(game.startsWith(`${SPORTING_GROUP}-`)||group===SPORTING_GROUP))continue;
    const a=body.match(/<amount\b([^>]*)>([^<]*)<\/amount>/i);if(!a)continue;
    const u=parseUrl(requestUrl),aAttrs=a[1];
    rows.push({
      game:game||u?.searchParams.get('game')?.toLowerCase()||null,
      gamegroup:group||null,
      currency:(attr(aAttrs,'currency')||u?.searchParams.get('currency')||'').toUpperCase()||null,
      local:intOrNull(attr(gAttrs,'local')),
      amount:finite(a[2]),
      guaranteedHitTime:intOrNull(attr(aAttrs,'guaranteedHitTime')),
      winCount:finite(attr(gAttrs,'winc')),
      gameTimestamp:intOrNull(attr(gAttrs,'timestamp')),
      instanceCode:attr(aAttrs,'instancecode')||null,
      requestCasino:u?.searchParams.get('casino')||null,
      requestInfo:u?.searchParams.get('info')||null,
      tickerEndpoint:safeEndpoint(requestUrl)
    });
  }
  return rows;
}

export function analyzeCasino777RobertoSportingHarObject(har,{sourceName='casino777-roberto-sporting.har'}={}){
  const entries=har?.log?.entries;if(!Array.isArray(entries))return fail('HAR_ENTRIES_REQUIRED',{sourceName});
  const targetMarkers=[],providerCodeMarkers=[],rows=[],tickerEndpoints=new Set();
  for(let i=0;i<entries.length;i++){
    const e=entries[i]||{},url=e?.request?.url||'',body=decodeContent(e?.response?.content);
    if(exactTargetPage(url))targetMarkers.push({entryIndex:i,endpoint:safeEndpoint(url),kind:'EXACT_CASINO777_ROBERTO_PUBLIC_TARGET_PAGE'});
    for(const code of PROVIDER_CODE_CANDIDATES){if(String(url).includes(code)||body.includes(code))providerCodeMarkers.push({entryIndex:i,endpoint:safeEndpoint(url),providerCode:code,kind:'PROVIDER_CODE_RUNTIME_MARKER_REQUIRES_REVIEW'});}
    if(!body)continue;
    const looksTicker=String(url).includes('new_jackpotxml.php')||/<gamedata\b[^>]*(?:game=["']sljp-|gamegroup=["']sljp)/i.test(body);
    if(!looksTicker)continue;
    for(const row of parseSportingRows(body,url)){rows.push(row);if(row.tickerEndpoint)tickerEndpoints.add(row.tickerEndpoint);}
  }
  const exactTargetPageObserved=targetMarkers.length>0;
  const eurGlobalRows=rows.filter(r=>r.currency==='EUR'&&r.local===0);
  const dailyRows=eurGlobalRows.filter(r=>r.game===DAILY_CODE);
  const exactDailyRows=dailyRows.filter(r=>Number.isFinite(r.amount)&&Number.isInteger(r.guaranteedHitTime)&&r.guaranteedHitTime>0&&Number.isFinite(r.winCount)&&Number.isInteger(r.gameTimestamp)&&r.gameTimestamp>0&&!!r.requestCasino);
  const distinctCasinos=[...new Set(exactDailyRows.map(r=>r.requestCasino).filter(Boolean))];
  const distinctTickerEndpoints=[...tickerEndpoints];
  const exactTickerSessionCandidate=exactTargetPageObserved&&distinctTickerEndpoints.length===1&&distinctCasinos.length===1&&exactDailyRows.length>=1;
  const latestDailyRow=exactDailyRows.length?exactDailyRows.slice().sort((a,b)=>(b.gameTimestamp||0)-(a.gameTimestamp||0))[0]:null;
  return {
    version:VERSION,ok:true,sourceName,
    target:{operator:'Casino777 Spain',title:'Roberto Carlos: Sporting Legends',page:`https://${TARGET_HOST}${TARGET_PATH}`,provider:'Playtech',publicMinStakeEUR:0.30,publicMaxStakeEUR:150,publicRtpPct:95.59},
    exactTargetPageObserved,targetMarkers,providerCodeCandidates:PROVIDER_CODE_CANDIDATES,providerCodeMarkers,
    tickerEndpoints:distinctTickerEndpoints,sljpRows:rows,eurGlobalRowCount:eurGlobalRows.length,dailyRowCount:dailyRows.length,exactDailyRows,
    exactTickerSessionCandidate,latestDailyRow,
    exactCasino777ServedProviderCodeVerified:providerCodeMarkers.length>0,
    exactCasino777JackpotsCasinoImsCandidate:distinctCasinos.length===1?distinctCasinos[0]:null,
    currentSljp1RowRecovered:!!latestDailyRow,
    currentDailyAmountExactCandidate:latestDailyRow?.amount??null,
    currentGuaranteedHitTimeExactCandidate:latestDailyRow?.guaranteedHitTime??null,
    currentWinCountExactCandidate:latestDailyRow?.winCount??null,
    currentTimestampExactCandidate:latestDailyRow?.gameTimestamp??null,
    dailyFollowingPeriodRuleAvailableFromExactOperatorPublicRules:true,
    reason:exactTickerSessionCandidate?'CASINO777_ROBERTO_SLJP1_RUNTIME_BINDING_REVIEW_CANDIDATE':'NO_EXACT_CASINO777_ROBERTO_SLJP1_RUNTIME_BINDING_CANDIDATE',
    nextRequiredEvidence:[
      exactTargetPageObserved?null:'exact Casino777 Roberto Carlos page/session marker',
      providerCodeMarkers.length?null:'served Roberto Carlos provider-code marker',
      dailyRows.length?null:'fresh sljp-1 row',
      distinctCasinos.length===1?null:'single authentic request casino/IMS in exact session',
      distinctTickerEndpoints.length===1?null:'single ticker endpoint in exact session',
      latestDailyRow?null:'complete EUR local=0 sljp-1 amount/GHT/winc/timestamp row',
      'independent review of exact Casino777 session binding and served jackpot eligibility',
      'same-binding pre/post-GHT snapshots proving no award/reset',
      'prospective manual race/latency lower bound above break-even',
      'fresh final state recheck before any execution authority'
    ].filter(Boolean),
    execution:execution(),
    hardGuards:{
      exactCasino777TargetSessionRequired:true,sljp1CodeMustBeExplicit:true,sljp2OrSljp3CannotSubstituteDaily:true,
      providerCodeCandidateCannotSelfBindRuntime:true,crossOperatorCasinoNameForbidden:true,thirdPartyTickerCannotBindCasino777:true,
      publicMinimumStakeDoesNotProveServedJackpotEligibility:true,completeRuntimeRowStillCannotAuthorizePlayByItself:true,
      rawHarNeverEmitted:true,requestQueriesNeverEmitted:true,authorizationCookiePostDataNeverEmitted:true,
      noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false
    }
  };
}
export function analyzeCasino777RobertoSportingHarText(raw,options={}){let har;try{har=JSON.parse(raw);}catch(error){return fail('HAR_PARSE_FAILED',{error:String(error?.message||error)});}return analyzeCasino777RobertoSportingHarObject(har,options);}
export function main(argv=process.argv.slice(2)){
  const file=argv[0];if(!file||file==='--help'||file==='-h'){process.stdout.write('Usage: node loterias-ai/scripts/analyze-casino777-roberto-sporting-har.mjs <capture.har>\n');return file?0:2;}
  try{const out=analyzeCasino777RobertoSportingHarText(fs.readFileSync(file,'utf8'),{sourceName:path.basename(file)});process.stdout.write(`${JSON.stringify(out,null,2)}\n`);return out.ok?0:1;}catch(error){process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{sourceName:path.basename(file),error:String(error?.message||error)}),null,2)}\n`);return 1;}
}
if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();
