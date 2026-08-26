const KEY_RE=/(new_jackpotxml\.php|webtickers|initialResources|sljp-1|tonymc|jackpotsCasino|jackpotsCasinoUrl|liveEndpointUrl|guaranteedHitTime|instanceCode|\bcurrency\b|\blocal\b|\bwinc\b)/i;
const URL_RE=/https?:\/\/[^\s"'<>]+/gi;
const EXACT_GAME_ID='ap-mccoy-sporting-legends-cptn';

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

function exactApMcCoyRealLauncher(url){
  try{
    const u=new URL(maybeDecode(url));
    if(u.protocol!=='https:'||u.hostname.toLowerCase()!=='launcher.betfair.es')return null;
    const gameId=u.searchParams.get('gameId');
    const rp=u.searchParams.get('RPBucket');
    const dataChannel=u.searchParams.get('dataChannel');
    const launchProduct=u.searchParams.get('launchProduct');
    const mode=u.searchParams.get('mode');
    if(gameId!==EXACT_GAME_ID||rp!=='casino'||dataChannel!=='casino'||launchProduct!=='casino'||mode!=='real')return null;
    return {launcherOrigin:u.origin,launcherPath:u.pathname,gameId,rpBucket:rp,dataChannel,launchProduct,mode};
  }catch{return null;}
}

function sameEndpoint(a,b){
  try{const x=new URL(maybeDecode(a)),y=new URL(maybeDecode(b));return x.protocol==='https:'&&y.protocol==='https:'&&x.origin===y.origin&&x.pathname===y.pathname;}catch{return false;}
}

export function analyzeBetfairSportingHar(har,{sourceName='capture.har'}={}){
  const obj=typeof har==='string'?JSON.parse(har):har;
  const entries=Array.isArray(obj?.log?.entries)?obj.log.entries:[];
  const relevant=[];
  const allFields={};
  const allUrls=[];
  const exactApMcCoyRealLauncherBindings=[];

  entries.forEach((entry,index)=>{
    const rawRequestUrl=String(entry?.request?.url||'');
    const exactLauncher=exactApMcCoyRealLauncher(rawRequestUrl);
    if(exactLauncher)exactApMcCoyRealLauncherBindings.push({index,startedDateTime:entry?.startedDateTime||null,...exactLauncher});

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
    relevant.push({
      index,
      startedDateTime:entry?.startedDateTime||null,
      request:{method:entry?.request?.method||null,url:requestUrl||null},
      response:{status:Number.isFinite(entry?.response?.status)?entry.response.status:null,mimeType:entry?.response?.content?.mimeType||null,contentEncoding:entry?.response?.content?.encoding||null,text:responseText||null},
      markers:{
        newJackpotXml:/new_jackpotxml\.php/i.test(decoded),
        webtickers:/webtickers/i.test(decoded),
        sljp1:/\bsljp-1\b/i.test(decoded),
        tonymc:/\btonymc\b/i.test(decoded),
        guaranteedHitTime:/\bguaranteedHitTime\b/i.test(decoded),
        initialResources:/initialResources/i.test(decoded),
        webSocketMessage:parts.some(([where])=>where.startsWith('_webSocketMessages[')),
      },
      fields,
      urls,
      provenance:parts.filter(([,v])=>KEY_RE.test(maybeDecode(v))).map(([where])=>where),
    });
  });

  const exactTickerEntryCandidates=relevant.filter(r=>
    r.markers.newJackpotXml && r.markers.sljp1 &&
    ((r.fields.game||[]).some(v=>/\bsljp-1\b/i.test(v)) || /(?:[?&]|%26)game(?:=|%3D)(?:sljp-1|sljp%2D1)/i.test(maybeDecode(r.request.url||'')))
  );
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
  const pairedServerEvidence=[];
  for(const b of configBindingCandidates){
    for(const t of exactTickerEntryCandidates){
      if(!sameEndpoint(b.tickerUrl,t.request.url||''))continue;
      const echoedCasino=(t.fields.casino||[]).map(x=>x.toLowerCase());
      if(echoedCasino.length&&!echoedCasino.includes(String(b.jackpotsCasino).toLowerCase()))continue;
      pairedServerEvidence.push({configBinding:b,tickerEntryIndex:t.index,responseUrl:t.request.url,tickerXml:t.response.text||null,startedDateTime:t.startedDateTime||null});
    }
  }
  const imsCandidates=uniq([
    ...(allFields.casino||[]),
    ...(allFields.jackpotsCasino||[]),
    ...(allFields.instanceCode||[]),
    ...(allFields.instancecode||[]),
  ]);
  const tickerUrlCandidates=uniq(allUrls.filter(u=>/new_jackpotxml\.php|webtickers/i.test(maybeDecode(u))));

  return {
    version:'betfair-sporting-har-discovery-v1.5-exact-game-session-attestation',
    mode:'OFFLINE_PASSIVE_HAR_DISCOVERY_NO_PLAY',
    sourceName,
    entryCount:entries.length,
    relevantEntryCount:relevant.length,
    discovery:{
      exactApMcCoyRealLauncherBindings,
      exactApMcCoyRealLauncherBindingObserved:exactApMcCoyRealLauncherBindings.length>0,
      imsCandidates,
      tickerUrlCandidates,
      fields:allFields,
      configBindingCandidates,
      exactTickerEntryCandidates,
      pairedServerEvidence,
      relevantEntries:relevant,
      exactBetfairSpainTickerImsBindingVerified:false,
      currentSljp1RowRecovered:exactTickerEntryCandidates.length>0,
      currentDailyAmountExactVerified:false,
      currentGuaranteedHitTimeExactVerified:false,
    },
    scientificUse:'Offline HAR discovery only. In addition to passive ticker/config recovery, the HAR now records whether the exact Betfair Spain real-money launcher for gameId ap-mccoy-sporting-legends-cptn was actually observed in the same capture. This closes a provenance gap: a generic Betfair or different-game HAR must not be sufficient for the AP McCoy overdue lane. Base64 bodies, escaped JSON URLs, unquoted keys and Chrome DevTools WebSocket frames remain supported. pairedServerEvidence still requires a Betfair-owned initialResources response co-locating jackpotsCasino with its configured ticker endpoint plus an exact endpoint-matching sljp-1 response. Execution remains blocked until exact-game attestation, server validation, freshness, same-cycle continuity, deadline, unawarded state and race gates all pass.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,offlineOnly:true,noNetwork:true,noCredentials:true,noCookiesEmitted:true,noWagerProbe:true,noAutomaticBetting:true,harEvidenceCannotAuthorizeGreen:true,coLocatedBetfairInitialResourcesRequired:true,configuredEndpointMatchRequired:true,exactApMcCoyRealLauncherMustBeObservedBeforeOverdueValidation:true},
  };
}
