#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const VERSION='casino777-aotgn-safe-har-analyzer-v1';
const TARGET_HOST='www.casino777.es';
const TARGET_PATH='/age-of-the-gods-norse-king-of-asgard';
const IMS_CODE_CANDIDATE='gpas_aogkasgard_pop';
const execution=()=>({decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0});
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const intOrNull=v=>{const n=finite(v);return n!==null&&Number.isInteger(n)?n:null;};
function safeEndpoint(raw){try{const u=new URL(String(raw||''));return u.protocol==='https:'?`${u.origin}${u.pathname}`:null;}catch{return null;}}
function parseUrl(raw){try{return new URL(String(raw||''));}catch{return null;}}
function decodeContent(content={}){const t=typeof content.text==='string'?content.text:'';if(!t)return '';if(content.encoding==='base64'){try{return Buffer.from(t,'base64').toString('utf8');}catch{return '';}}return t;}
function attr(text,name){const m=String(text||'').match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`,'i'));return m?m[1]:null;}
function fail(reason,extra={}){return {version:VERSION,ok:false,reason,...extra,execution:execution(),hardGuards:{rawHarNeverEmitted:true,requestQueriesNeverEmitted:true,authorizationCookiePostDataNeverEmitted:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}};}
function exactTargetPage(url){const u=parseUrl(url);return !!u&&u.hostname.toLowerCase()===TARGET_HOST&&u.pathname.replace(/\/$/,'')===TARGET_PATH;}
function boundarySemantic(gha,ght){
  if(gha!==null&&ght===null)return 'GUARANTEED_AMOUNT_BOUNDARY';
  if(ght!==null&&gha===null)return 'GUARANTEED_TIME_BOUNDARY';
  if(gha!==null&&ght!==null)return 'AMBIGUOUS_DUAL_BOUNDARY';
  return 'NO_GUARANTEED_BOUNDARY';
}
function semanticTierCandidate(boundary){
  if(boundary==='GUARANTEED_TIME_BOUNDARY')return 'DAILY_BY_EXACT_OPERATOR_TIME_SEMANTICS';
  if(boundary==='GUARANTEED_AMOUNT_BOUNDARY')return 'EXTRA_OR_INSTANT_BY_EXACT_OPERATOR_AMOUNT_SEMANTICS';
  return null;
}
function parseRows(xml,requestUrl){
  const rows=[];const re=/<gamedata\b([^>]*)>([\s\S]*?)<\/gamedata>/gi;let m;
  while((m=re.exec(xml))){
    const gAttrs=m[1],body=m[2],game=attr(gAttrs,'game'),group=attr(gAttrs,'gamegroup');
    const familyCandidate=String(game||'').toLowerCase().startsWith('aognjp')||String(group||'').toLowerCase()==='aognjp';
    if(!familyCandidate)continue;
    const a=body.match(/<amount\b([^>]*)>([^<]*)<\/amount>/i);if(!a)continue;
    const aAttrs=a[1],amount=finite(a[2]);
    const guaranteedHitAmount=finite(attr(aAttrs,'guranteedHitAmount')??attr(aAttrs,'guaranteedHitAmount'));
    const guaranteedHitTime=intOrNull(attr(aAttrs,'guaranteedHitTime'));
    const boundary=boundarySemantic(guaranteedHitAmount,guaranteedHitTime);
    const u=parseUrl(requestUrl);
    rows.push({
      game:game||u?.searchParams.get('game')||null,gamegroup:group||null,
      currency:(attr(aAttrs,'currency')||u?.searchParams.get('currency')||'').toUpperCase()||null,
      local:intOrNull(attr(gAttrs,'local')),amount,guaranteedHitAmount,guaranteedHitTime,
      boundarySemantic:boundary,semanticTierCandidate:semanticTierCandidate(boundary),
      winCount:finite(attr(gAttrs,'winc')),gameTimestamp:intOrNull(attr(gAttrs,'timestamp')),
      instanceCode:attr(aAttrs,'instancecode')||null,requestCasino:u?.searchParams.get('casino')||null,
      tickerEndpoint:safeEndpoint(requestUrl),
      numericTierIdentityVerified:false,
      exactDailyBindingVerified:false,
      exactExtraOrInstantIdentityVerified:false
    });
  }
  return rows;
}

export function analyzeCasino777AotgnHarObject(har,{sourceName='casino777-aotgn.har'}={}){
  const entries=har?.log?.entries;if(!Array.isArray(entries))return fail('HAR_ENTRIES_REQUIRED',{sourceName});
  const targetMarkers=[],imsMarkers=[],rows=[],tickerEndpoints=new Set();
  for(let i=0;i<entries.length;i++){
    const e=entries[i]||{},url=e?.request?.url||'',body=decodeContent(e?.response?.content);
    if(exactTargetPage(url))targetMarkers.push({entryIndex:i,endpoint:safeEndpoint(url),kind:'EXACT_CASINO777_PUBLIC_TARGET_PAGE'});
    if(String(url).includes(IMS_CODE_CANDIDATE)||body.includes(IMS_CODE_CANDIDATE))imsMarkers.push({entryIndex:i,endpoint:safeEndpoint(url),imsCode:IMS_CODE_CANDIDATE,kind:'CROSS_SPANISH_PROVIDER_CODE_MATCH_REQUIRES_RUNTIME_REVIEW'});
    if(!body)continue;
    const looksTicker=String(url).includes('new_jackpotxml.php')||/<gamedata\b[^>]*(?:game=["']aognjp|gamegroup=["']aognjp)/i.test(body);
    if(!looksTicker)continue;
    for(const row of parseRows(body,url)){rows.push(row);if(row.tickerEndpoint)tickerEndpoints.add(row.tickerEndpoint);}
  }
  const exactTargetPageObserved=targetMarkers.length>0;
  const eurGlobalRows=rows.filter(r=>r.currency==='EUR'&&r.local===0);
  const timedRows=eurGlobalRows.filter(r=>r.boundarySemantic==='GUARANTEED_TIME_BOUNDARY');
  const amountRows=eurGlobalRows.filter(r=>r.boundarySemantic==='GUARANTEED_AMOUNT_BOUNDARY');
  const dualBoundaryRows=eurGlobalRows.filter(r=>r.boundarySemantic==='AMBIGUOUS_DUAL_BOUNDARY');
  const exactTickerSessionCandidate=exactTargetPageObserved&&tickerEndpoints.size===1&&eurGlobalRows.some(r=>!!r.requestCasino);
  const dailySemanticBindingCandidate=exactTickerSessionCandidate&&timedRows.length===1&&dualBoundaryRows.length===0;
  const amountMhbFamilyBindingCandidate=exactTickerSessionCandidate&&amountRows.length>0&&dualBoundaryRows.length===0;
  return {
    version:VERSION,ok:true,sourceName,
    target:{operator:'Casino777 Spain',title:'Age of the Gods Norse: King of Asgard',page:`https://${TARGET_HOST}${TARGET_PATH}`,provider:'Playtech',publicMinStakeEUR:0.10,publicMaxStakeEUR:190,publicRtpPct:94.56},
    exactTargetPageObserved,targetMarkers,imsCodeCandidate:IMS_CODE_CANDIDATE,imsMarkers,
    tickerEndpoints:[...tickerEndpoints],aognjpRows:rows,eurGlobalRowCount:eurGlobalRows.length,timedRows,amountRows,dualBoundaryRows,
    exactTickerSessionCandidate,dailySemanticBindingCandidate,amountMhbFamilyBindingCandidate,
    dailyFollowingPeriodRuleAvailableFromCodeOwnedOperatorEvidence:true,
    exactExtraVsInstantIdentityVerified:false,
    numericAognjpSuffixMappingRequiredForDailySemanticBinding:false,
    numericAognjpSuffixMappingRequiredForAmountFamilyBinding:false,
    reason:dailySemanticBindingCandidate?'DAILY_GHT_SEMANTIC_BINDING_REVIEW_CANDIDATE':amountMhbFamilyBindingCandidate?'AMOUNT_MHB_FAMILY_BINDING_REVIEW_CANDIDATE':'NO_EXACT_AOTGN_BOUNDARY_BINDING_CANDIDATE',
    nextRequiredEvidence:[
      exactTargetPageObserved?null:'exact Casino777 target page/session marker',
      eurGlobalRows.length?null:'fresh GLOBAL EUR aognjp family row',
      timedRows.length?null:'fresh guaranteedHitTime row for Daily semantic binding',
      amountRows.length?null:'fresh guaranteedHitAmount row for Extra/Instant MHB family binding',
      'independent review of exact Casino777 ticker/IMS binding',
      'served eligible stake menu and jackpot accounting',
      'cross-GHT/cross-boundary survival plus race and latency evidence',
      'conservative positive-EV screen'
    ].filter(Boolean),
    execution:execution(),
    hardGuards:{
      exactCasino777TargetSessionRequired:true,crossSpanishImsCodeCannotSelfBindRuntime:true,
      aognjpFamilyCodeIsDiscoveryCandidateUntilServed:true,numericAognjpSuffixMappingsNotAssumed:true,
      dailyMayBeIdentifiedByUniqueTimeBoundaryOnlyAfterExactTickerSessionReview:true,
      amountBoundaryCannotDistinguishExtraFromInstantWithoutAdditionalServedIdentity:true,
      publicMinimumStakeDoesNotProveJackpotEligibility:true,guaranteedBoundaryDoesNotAuthorizePlay:true,
      rawHarNeverEmitted:true,requestQueriesNeverEmitted:true,authorizationCookiePostDataNeverEmitted:true,
      noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false
    }
  };
}
export function analyzeCasino777AotgnHarText(raw,options={}){let har;try{har=JSON.parse(raw);}catch(error){return fail('HAR_PARSE_FAILED',{error:String(error?.message||error)});}return analyzeCasino777AotgnHarObject(har,options);}
export function main(argv=process.argv.slice(2)){
  const file=argv[0];if(!file||file==='--help'||file==='-h'){process.stdout.write('Usage: node loterias-ai/scripts/analyze-casino777-aotgn-har.mjs <capture.har>\n');return file?0:2;}
  try{const out=analyzeCasino777AotgnHarText(fs.readFileSync(file,'utf8'),{sourceName:path.basename(file)});process.stdout.write(`${JSON.stringify(out,null,2)}\n`);return out.ok?0:1;}catch(error){process.stdout.write(`${JSON.stringify(fail('HAR_READ_FAILED',{sourceName:path.basename(file),error:String(error?.message||error)}),null,2)}\n`);return 1;}
}
if(import.meta.url===`file://${process.argv[1]}`)process.exitCode=main();
