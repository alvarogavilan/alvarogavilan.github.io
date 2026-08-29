const KEY_RE=/(new_jackpotxml\.php|webtickers|initialResources|sljp-[12]|tonymc|jackpotsCasino|jackpotsCasinoUrl|liveEndpointUrl|guaranteedHitTime|instanceCode|\bcurrency\b|\blocal\b|\bwinc\b)/i;
const URL_RE=/https?:\/\/[^\s"'<>]+/gi;
const EXACT_GAME_ID='ap-mccoy-sporting-legends-cptn';
const TIMED_SPORTING_CODES=new Set(['sljp-1','sljp-2']);

const uniq=a=>[...new Set(a.filter(Boolean))];
const clean=s=>String(s??'').replace(/\u0000/g,'').trim();

function maybeDecode(s){
  let v=clean(s).replace(/\\u0026/gi,'&').replace(/\\\//g,'/');
  for(let i=0;i<2;i++){
    try{
      const d=decodeURIComponent(v.replace(/\+/g,' '));
      if(d===v)break;
      v=d.replace(/\\u0026/gi,'&').replace(/\\\//g,'/');
    }catch{break;}
  }
  return v;
}

function decodeHarContent(content){
  const raw=String(content?.text||'');
  if(!raw)return '';
  if(String(content?.encoding||'').toLowerCase()!=='base64')return raw;
  try{
    if(typeof Buffer!=='undefined')return Buffer.from(raw,'base64').toString('utf8');
    if(typeof atob==='function'){
      const bin=atob(raw);let pct='';
      for(let i=0;i<bin.length;i++)pct+=`%${bin.charCodeAt(i).toString(16).padStart(2,'0')}`;
      return decodeURIComponent(pct);
    }
  }catch{}
  return raw;
}

function textParts(entry){
  const req=entry?.request||{};
  const res=entry?.response||{};
  const out=[];
  if(req.url)out.push(['request.url',String(req.url)]);
  if(req.postData?.text)out.push(['request.postData.text',String(req.postData.text)]);
  for(const h of req.headers||[]) if(h?.name||h?.value) out.push([`request.header.${h.name||''}`,`${h.name||''}: ${h.value||''}`]);
  const responseText=decodeHarContent(res.content);
  if(responseText)out.push(['response.content.text',responseText]);
  for(const h of res.headers||[]) if(h?.name||h?.value) out.push([`response.header.${h.name||''}`,`${h.name||''}: ${h.value||''}`]);
  const wsMessages=Array.isArray(entry?._webSocketMessages)?entry._webSocketMessages:[];
  wsMessages.forEach((msg,i)=>{
    if(msg?.data)out.push([`_webSocketMessages[${i}].${msg?.type==='send'?'send':'receive'}`,String(msg.data)]);
  });
  return out;
}

function paramsFromUrl(url){
  const out={};
  try{
    const u=new URL(maybeDecode(url));
    for(const [k,v] of u.searchParams){
      if(!out[k])out[k]=[];
      out[k].push(maybeDecode(v));
    }
  }catch{}
  return out;
}

function fieldCandidates(text){
  const s=maybeDecode(text);
  const fields={};
  const names=['casino','currency','local','winc','game','instanceCode','instancecode','guaranteedHitTime','jackpotsCasino','jackpotsCasinoUrl','liveEndpointUrl'];
  for(const name of names){
    const vals=[];
    const attr=new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`,'ig');
    const quotedKey=new RegExp(`["']${name}["']\\s*[:=]\\s*["']?([^"'\\s,;}<>&]+)`,'ig');
    const bareKey=new RegExp(`\\b${name}\\b\\s*[:=]\\s*["']([^"']+)["']`,'ig');
    for(const re of [attr,quotedKey,bareKey]) for(const m of s.matchAll(re)) vals.push(maybeDecode(m[1]));
    if(vals.length)fields[name]=uniq(vals);
  }
  return fields;
}

function mergeFields(dst,src){
  for(const [k,vals] of Object.entries(src||{})) dst[k]=uniq([...(dst[k]||[]),...vals]);
  return dst;
}

function betfairInitialResourcesUrl(url){
  try{
    const u=new URL(maybeDecode(url)),h=u.hostname.toLowerCase();
    return u.protocol==='https:'&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(u.pathname);
  }catch{return false;}
}

function betfairRealCasinoLauncher(url){
  try{
    const u=new URL(maybeDecode(url));
    if(u.protocol!=='https:'||u.hostname.toLowerCase()!=='launcher.betfair.es')return null;
    const gameId=clean(u.searchParams.get('gameId'));
    const rp=u.searchParams.get('RPBucket');
    const dataChannel=u.searchParams.get('dataChannel');
    const launchProduct=u.searchParams.get('launchProduct');
    const mode=u.searchParams.get('mode');
    if(!gameId||rp!=='casino'||dataChannel!=='casino'||launchProduct!=='casino'||mode!=='real')return null;
    return {launcherOrigin:u.origin,launcherPath:u.pathname,gameId,rpBucket:rp,dataChannel,launchProduct,mode,exactApMcCoy:gameId===EXACT_GAME_ID};
  }catch{return null;}
}

function sameEndpoint(a,b){
  try{const x=new URL(maybeDecode(a)),y=new URL(maybeDecode(b));return x.protocol==='https:'&&y.protocol==='https:'&&x.origin===y.origin&&x.pathname===y.pathname;}catch{return false;}
}
function requestedTimedCode(r){
  const fieldCodes=uniq((r?.fields?.game||[]).map(v=>String(v).toLowerCase()).filter(v=>TIMED_SPORTING_CODES.has(v)));
  if(fieldCodes.length===1)return fieldCodes[0];
  try{
    const u=new URL(maybeDecode(r?.request?.url||''));
    const q=String(u.searchParams.get('game')||'').toLowerCase();
    if(TIMED_SPORTING_CODES.has(q))return q;
  }catch{}
  return null;
}
function pairEvidence(configs,tickers){
  const out=[];
  for(const b of configs){
    for(const t of tickers){
      if(!sameEndpoint(b.tickerUrl,t.request.url||''))continue;
      const echoedCasino=(t.fields.casino||[]).map(x=>x.toLowerCase());
      if(echoedCasino.length&&!echoedCasino.includes(String(b.jackpotsCasino).toLowerCase()))continue;
      out.push({configBinding:b,tickerEntryIndex:t.index,responseUrl:t.request.url,tickerXml:t.response.text||null,startedDateTime:t.startedDateTime||null,requestedCode:t.requestedCode||requestedTimedCode(t)});
    }
  }
  return out;
}

export function analyzeBetfairSportingHar(har,{sourceName='capture.har'}={}){
  const obj=typeof har==='string'?JSON.parse(har):har;
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];
  const relevant=[];
  const allFields={};
  const allUrls=[];
  const betfairRealCasinoLauncherBindings=[];
  const exactApMcCoyRealLauncherBindings=[];

  entries.forEach((entry,index)=>{
    const rawRequestUrl=String(entry?.request?.url||'');
    const launcher=betfairRealCasinoLauncher(rawRequestUrl);
    if(launcher){
      const binding={index,startedDateTime:entry?.startedDateTime||null,...launcher};
      betfairRealCasinoLauncherBindings.push(binding);
      if(launcher.exactApMcCoy)exactApMcCoyRealLauncherBindings.push(binding);
    }

    const parts=textParts(entry);
    const joined=parts.map(([,v])=>v).join('\n');
    if(!KEY_RE.test(maybeDecode(joined)))return;
    const requestUrl=maybeDecode(rawRequestUrl);
    const responseText=decodeHarContent(entry?.response?.content);
    const decoded=maybeDecode(joined);
    const fields={};
    mergeFields(fields,fieldCandidates(decoded));
    const qp=paramsFromUrl(requestUrl);
    for(const [k,vals] of Object.entries(qp)){
      if(['casino','currency','local','winc','game','instanceCode','instancecode','guaranteedHitTime'].includes(k)) fields[k]=uniq([...(fields[k]||[]),...vals]);
      for(const v of vals) mergeFields(fields,fieldCandidates(v));
    }
    mergeFields(allFields,fields);
    const urls=uniq([requestUrl,...(decoded.match(URL_RE)||[])]).map(maybeDecode).filter(u=>KEY_RE.test(u)||/playtech|betfair|malmegas/i.test(u));
    allUrls.push(...urls);
    const relevantEntry={
      index,
      startedDateTime:entry?.startedDateTime||null,
      request:{method:entry?.request?.method||null,url:requestUrl||null},
      response:{status:Number.isFinite(entry?.response?.status)?entry.response.status:null,mimeType:entry?.response?.content?.mimeType||null,contentEncoding:entry?.response?.content?.encoding||null,text:responseText||null},
      markers:{
        newJackpotXml:/new_jackpotxml\.php/i.test(decoded),
        webtickers:/webtickers/i.test(decoded),
        sljp1:/\bsljp-1\b/i.test(decoded),
        sljp2:/\bsljp-2\b/i.test(decoded),
        tonymc:/\btonymc\b/i.test(decoded),
        guaranteedHitTime:/\bguaranteedHitTime\b/i.test(decoded),
        initialResources:/initialResources/i.test(decoded),
        webSocketMessage:parts.some(([where])=>where.startsWith('_webSocketMessages[')),
      },
      fields,
      urls,
      provenance:parts.filter(([,v])=>KEY_RE.test(maybeDecode(v))).map(([where])=>where),
    };
    relevantEntry.requestedCode=requestedTimedCode(relevantEntry);
    relevant.push(relevantEntry);
  });

  const timedTickerEntryCandidates=relevant.filter(r=>r.markers.newJackpotXml&&TIMED_SPORTING_CODES.has(r.requestedCode));
  const exactTickerEntryCandidates=timedTickerEntryCandidates.filter(r=>r.requestedCode==='sljp-1');
  const weeklyTickerEntryCandidates=timedTickerEntryCandidates.filter(r=>r.requestedCode==='sljp-2');
  const configBindingCandidates=[];
  for(const r of relevant){
    const sourceUrl=r.request.url||'';
    if(!betfairInitialResourcesUrl(sourceUrl))continue;
    const responseFields=fieldCandidates(r.response.text||'');
    const casinos=uniq([...(responseFields.jackpotsCasino||[]),...(responseFields.casino||[])]);
    const tickerUrls=uniq([...(responseFields.jackpotsCasinoUrl||[]),...(responseFields.liveEndpointUrl||[])]).filter(u=>/^https:\/\//i.test(u));
    const instanceCodes=uniq([...(responseFields.instanceCode||[]),...(responseFields.instancecode||[])]);
    for(const jackpotsCasino of casinos)for(const tickerUrl of tickerUrls)configBindingCandidates.push({
      sourceEntryIndex:r.index,sourceUrl,jackpotsCasino,tickerUrl,instanceCode:instanceCodes.length===1?instanceCodes[0]:null,
      sameDocument:true,sourceBetfairOwned:true,sourceInitialResources:true,
    });
  }
  const pairedTimedServerEvidence=pairEvidence(configBindingCandidates,timedTickerEntryCandidates);
  const pairedServerEvidence=pairedTimedServerEvidence.filter(p=>p.requestedCode==='sljp-1');
  const pairedWeeklyServerEvidence=pairedTimedServerEvidence.filter(p=>p.requestedCode==='sljp-2');
  const imsCandidates=uniq([
    ...(allFields.casino||[]),
    ...(allFields.jackpotsCasino||[]),
    ...(allFields.instanceCode||[]),
    ...(allFields.instancecode||[]),
  ]);
  const tickerUrlCandidates=uniq(allUrls.filter(u=>/new_jackpotxml\.php|webtickers/i.test(maybeDecode(u))));

  return {
    version:'betfair-sporting-har-discovery-v1.6-timed-tier-discovery',
    mode:'OFFLINE_PASSIVE_HAR_DISCOVERY_NO_PLAY',
    sourceName,
    entryCount:entries.length,
    relevantEntryCount:relevant.length,
    discovery:{
      betfairRealCasinoLauncherBindings,
      exactApMcCoyRealLauncherBindings,
      exactApMcCoyRealLauncherBindingObserved:exactApMcCoyRealLauncherBindings.length>0,
      imsCandidates,
      tickerUrlCandidates,
      fields:allFields,
      configBindingCandidates,
      exactTickerEntryCandidates,
      weeklyTickerEntryCandidates,
      timedTickerEntryCandidates,
      pairedServerEvidence,
      pairedWeeklyServerEvidence,
      pairedTimedServerEvidence,
      relevantEntries:relevant,
      exactBetfairSpainTickerImsBindingVerified:false,
      currentSljp1RowRecovered:exactTickerEntryCandidates.length>0,
      currentSljp2RowRecovered:weeklyTickerEntryCandidates.length>0,
      currentDailyAmountExactVerified:false,
      currentWeeklyAmountExactVerified:false,
      currentGuaranteedHitTimeExactVerified:false,
    },
    scientificUse:'Offline HAR discovery only. Daily sljp-1 remains the legacy/default execution research lane while Weekly sljp-2 is now retained as a parallel timed-tier research candidate. Both require a Betfair-owned initialResources response co-locating jackpotsCasino with its configured ticker endpoint and an exact endpoint-matching request. The HAR records every Betfair real-money casino launcher gameId plus the exact AP McCoy launcher so downstream validation can require that the latest real casino launcher preceding a ticker entry is AP McCoy. Weekly discovery cannot authorize GREEN or inherit Daily prospective evidence.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,noCredentials:true,noCookiesEmitted:true,noWagerProbe:true,noAutomaticBetting:true,harEvidenceCannotAuthorizeGreen:true,coLocatedBetfairInitialResourcesRequired:true,configuredEndpointMatchRequired:true,allRealCasinoLauncherGameIdsRetainedForSessionOrdering:true,latestPrecedingLauncherMustBeExactApMcCoyDownstream:true,exactApMcCoyRealLauncherMustBeObservedBeforeOverdueValidation:true,dailyLegacyPairShapePreserved:true,weeklyResearchCannotSelfPromote:true},
  };
}
