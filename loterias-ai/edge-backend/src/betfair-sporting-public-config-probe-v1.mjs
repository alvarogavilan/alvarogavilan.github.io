const MAX_TEXT_CHARS=2_000_000;
const MAX_ASSETS=6;
const MAX_CONFIG_DOCS=10;
const KEYWORDS=['jackpotsCasino','jackpotsCasinoUrl','liveEndpointUrl','useServicesCasinoJackpots','initialResources','new_jackpotxml.php','webtickers','sljp-1','tonymc','guaranteedHitTime','instanceCode'];
const GAME_PAGE_URL='https://casino.betfair.es/juego/ap-mccoy-sporting-legends-cptn';
const LAUNCHER_URL='https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real&returnURL=https%3A%2F%2Fcasino.betfair.es%2Fjuego%2Fap-mccoy-sporting-legends-cptn&switchedToPopup=true';
const STATIC_PUBLIC_CONFIG_CANDIDATES=[
  'https://launcher.betfair.es/initialResources/es_ES_desktop',
  'https://casino.betfair.es/initialResources/es_ES_desktop',
];

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const unescapeUrl=s=>String(s||'').replace(/\\\//g,'/').replace(/\\u0026/gi,'&').replace(/&amp;/gi,'&');

function indexToken(body,key,from){
  const lower=body.toLowerCase(),needle=key.toLowerCase();
  let i=lower.indexOf(needle,from);
  while(i>=0){
    const before=i?lower[i-1]:'';
    const after=lower[i+needle.length]||'';
    if(!/[a-z0-9_]/i.test(before)&&!/[a-z0-9_]/i.test(after))return i;
    i=lower.indexOf(needle,i+needle.length);
  }
  return -1;
}

export function extractSportingPublicConfigSignals(text,{sourceUrl='unknown'}={}){
  const body=String(text||'').slice(0,MAX_TEXT_CHARS);
  const normalized=unescapeUrl(body);
  const hits=[];
  for(const key of KEYWORDS){
    let from=0,count=0;
    while(count<6){
      const i=indexToken(body,key,from);
      if(i<0)break;
      hits.push({key,sourceUrl,snippet:clean(body.slice(Math.max(0,i-100),Math.min(body.length,i+key.length+180))).slice(0,360)});
      from=i+key.length;count++;
    }
  }

  const assignments={};
  for(const key of ['jackpotsCasino','jackpotsCasinoUrl','liveEndpointUrl','instanceCode']){
    const re=new RegExp(`(?:["']${key}["']|\\b${key}\\b)\\s*[:=]\\s*["']([^"'<>\\s,;]+)["']`,'i');
    const m=body.match(re);if(m)assignments[key]=unescapeUrl(m[1]);
  }

  const urls=[...normalized.matchAll(/https?:\/\/[^\s"'<>]+/gi)]
    .map(m=>m[0].replace(/[),;]+$/,''))
    .filter(u=>/jackpot|ticker|sljp|playtech|initialresources/i.test(u)).slice(0,30);

  return {sourceUrl,assignments,urls:[...new Set(urls)],hits,sljp1Observed:/\bsljp-1\b/i.test(body),tonymcObserved:/\btonymc\b/i.test(body),guaranteedHitTimeObserved:/\bguaranteedHitTime\b/i.test(body),useServicesCasinoJackpotsObserved:/\buseServicesCasinoJackpots\b/i.test(body)};
}

function allowedAssetHost(hostname){
  const h=String(hostname||'').toLowerCase();
  return h==='launcher.betfair.es'||h.endsWith('.betfair.es')||h.endsWith('.betfair.com')||h.endsWith('.cdnppb.net')||h.includes('playtech');
}
function allowedConfigHost(hostname){
  const h=String(hostname||'').toLowerCase();
  return allowedAssetHost(h)||h==='webtickers.malmegas.com';
}
function betfairOwnedConfigSource(sourceUrl){
  try{
    const u=new URL(sourceUrl);
    const h=u.hostname.toLowerCase();
    return u.protocol==='https:'&&(h==='betfair.es'||h.endsWith('.betfair.es'))&&/\/initialresources(?:\/|$)/i.test(u.pathname);
  }catch{return false;}
}

export function deriveCoLocatedBetfairConfigBindings(scans=[]){
  const out=[];
  for(const scan of Array.isArray(scans)?scans:[]){
    if(!scan||!betfairOwnedConfigSource(scan.sourceUrl))continue;
    const casino=clean(scan.assignments?.jackpotsCasino);
    if(!casino)continue;
    const tickerUrls=[scan.assignments?.jackpotsCasinoUrl,scan.assignments?.liveEndpointUrl].filter(Boolean);
    for(const rawUrl of tickerUrls){
      try{
        const u=new URL(rawUrl);
        if(u.protocol!=='https:'||!allowedConfigHost(u.hostname))continue;
        const candidate={sourceUrl:scan.sourceUrl,jackpotsCasino:casino,tickerUrl:u.href,instanceCode:clean(scan.assignments?.instanceCode)||null,sameDocument:true,sourceBetfairOwned:true,sourceInitialResources:true};
        if(!out.some(x=>x.sourceUrl===candidate.sourceUrl&&x.jackpotsCasino===candidate.jackpotsCasino&&x.tickerUrl===candidate.tickerUrl))out.push(candidate);
      }catch{}
    }
  }
  return out;
}

export function discoverPublicAssetUrls(html,baseUrl){
  const out=[];const re=/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  for(const m of String(html||'').matchAll(re)){
    try{const u=new URL(unescapeUrl(m[1]),baseUrl);if(u.protocol!=='https:'||!allowedAssetHost(u.hostname))continue;if(!out.includes(u.href))out.push(u.href);if(out.length>=MAX_ASSETS)break;}catch{}
  }
  return out;
}

export function discoverPublicConfigUrls(text,baseUrl){
  const normalized=unescapeUrl(String(text||'').slice(0,MAX_TEXT_CHARS));
  const raw=[];const quoted=/["']([^"'\n\r]{1,1200})["']/g;
  for(const m of normalized.matchAll(quoted)){const v=m[1].trim();if(/(?:initialResources|new_jackpotxml\.php|webtickers)/i.test(v))raw.push(v);}
  const assignment=extractSportingPublicConfigSignals(normalized,{sourceUrl:baseUrl}).assignments;
  for(const v of [assignment.jackpotsCasinoUrl,assignment.liveEndpointUrl])if(v)raw.push(v);
  const out=[];
  for(const v of raw){
    try{const u=new URL(v,baseUrl);if(u.protocol!=='https:'||!allowedConfigHost(u.hostname))continue;if(!/(?:initialResources|new_jackpotxml\.php|webtickers)/i.test(u.href))continue;if(!out.includes(u.href))out.push(u.href);if(out.length>=MAX_CONFIG_DOCS)break;}catch{}
  }
  return out;
}

export function staticPublicConfigCandidates(){return [...STATIC_PUBLIC_CONFIG_CANDIDATES];}

async function fetchPublicText(url){
  try{
    const r=await fetch(url,{method:'GET',redirect:'follow',headers:{accept:'text/html,application/javascript,text/javascript,application/json,application/xml,text/xml;q=0.9,*/*;q=0.2','accept-language':'es-ES,es;q=0.9,en;q=0.5'}});
    const raw=await r.text();
    return {ok:r.ok,status:r.status,requestedUrl:url,finalUrl:r.url||url,contentType:r.headers.get('content-type')||null,text:raw.slice(0,MAX_TEXT_CHARS),truncated:raw.length>MAX_TEXT_CHARS};
  }catch(e){return {ok:false,status:null,requestedUrl:url,finalUrl:null,contentType:null,text:'',truncated:false,error:String(e?.message||e)};}
}
function unique(values){return [...new Set(values.filter(Boolean))];}

export async function runBetfairSportingPublicConfigProbe(){
  const observedAt=new Date().toISOString();
  const gamePage=await fetchPublicText(GAME_PAGE_URL);
  const launcher=await fetchPublicText(LAUNCHER_URL);
  const documents=[gamePage,launcher].filter(x=>x.text);

  const assetUrls=unique([...discoverPublicAssetUrls(gamePage.text,gamePage.finalUrl||GAME_PAGE_URL),...discoverPublicAssetUrls(launcher.text,launcher.finalUrl||LAUNCHER_URL)]).slice(0,MAX_ASSETS);
  const assets=[];for(const url of assetUrls)assets.push(await fetchPublicText(url));documents.push(...assets.filter(x=>x.text));

  const discoveredConfigUrls=unique(documents.flatMap(x=>discoverPublicConfigUrls(x.text,x.finalUrl||x.requestedUrl)));
  const configUrls=unique([...STATIC_PUBLIC_CONFIG_CANDIDATES,...discoveredConfigUrls]).slice(0,MAX_CONFIG_DOCS);
  const configDocs=[];for(const url of configUrls)configDocs.push(await fetchPublicText(url));documents.push(...configDocs.filter(x=>x.text));

  const scans=documents.map(x=>extractSportingPublicConfigSignals(x.text,{sourceUrl:x.finalUrl||x.requestedUrl}));
  const jackpotsCasinoCandidates=unique(scans.map(x=>x.assignments.jackpotsCasino));
  const jackpotTickerUrlCandidates=unique(scans.flatMap(x=>[x.assignments.jackpotsCasinoUrl,x.assignments.liveEndpointUrl,...x.urls]));
  const coLocatedBetfairConfigBindings=deriveCoLocatedBetfairConfigBindings(scans);
  const instanceCodeCandidates=unique(scans.map(x=>x.assignments.instanceCode));
  const sljp1Sources=unique(scans.filter(x=>x.sljp1Observed).map(x=>x.sourceUrl));
  const tonymcSources=unique(scans.filter(x=>x.tonymcObserved).map(x=>x.sourceUrl));
  const guaranteedHitTimeSources=unique(scans.filter(x=>x.guaranteedHitTimeObserved).map(x=>x.sourceUrl));
  const hubJackpotServiceSources=unique(scans.filter(x=>x.useServicesCasinoJackpotsObserved).map(x=>x.sourceUrl));
  const hits=scans.flatMap(x=>x.hits).slice(0,120);

  return {
    version:'betfair-sporting-public-config-probe-v1.3-colocated-binding',observedAt,mode:'PUBLIC_PASSIVE_CONFIG_DISCOVERY_NO_PLAY',
    target:{market:'ES',operator:'Betfair Spain',provider:'Playtech',game:'AP McCoy Sporting Legends™',gameId:'ap-mccoy-sporting-legends-cptn'},
    fetches:{gamePage:{ok:gamePage.ok,status:gamePage.status,requestedUrl:gamePage.requestedUrl,finalUrl:gamePage.finalUrl,contentType:gamePage.contentType,truncated:gamePage.truncated,error:gamePage.error||null},launcher:{ok:launcher.ok,status:launcher.status,requestedUrl:launcher.requestedUrl,finalUrl:launcher.finalUrl,contentType:launcher.contentType,truncated:launcher.truncated,error:launcher.error||null},assets:assets.map(x=>({ok:x.ok,status:x.status,requestedUrl:x.requestedUrl,finalUrl:x.finalUrl,contentType:x.contentType,truncated:x.truncated,error:x.error||null})),configDocuments:configDocs.map(x=>({ok:x.ok,status:x.status,requestedUrl:x.requestedUrl,finalUrl:x.finalUrl,contentType:x.contentType,truncated:x.truncated,error:x.error||null}))},
    discovery:{scannedDocumentCount:scans.length,publicAssetCount:assetUrls.length,staticPublicConfigCandidates:[...STATIC_PUBLIC_CONFIG_CANDIDATES],discoveredPublicConfigUrls:discoveredConfigUrls,publicConfigDocumentCount:configUrls.length,publicConfigUrls:configUrls,jackpotsCasinoCandidates,jackpotTickerUrlCandidates,coLocatedBetfairConfigBindings,instanceCodeCandidates,sljp1Sources,tonymcSources,guaranteedHitTimeSources,hubJackpotServiceSources,hits,bindingCandidateObserved:coLocatedBetfairConfigBindings.length>0,exactBetfairSpainTickerImsBindingVerified:false,currentSljp1RowRecovered:false,currentDailyAmountExactVerified:false,currentGuaranteedHitTimeExactVerified:false},
    scientificUse:'Public passive discovery only. A binding candidate now requires jackpotsCasino and the ticker endpoint to be co-located in the same Betfair-owned initialResources document; cross-document pairing is forbidden. Even a co-located candidate cannot authorize execution and must be independently validated against the exact Betfair Spain sljp-1 EUR local=0 response before it may enter the overdue GREEN route.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{onlineOnly:true,nonPromoOnly:true,noLoginProbe:true,noCookies:true,noCredentials:true,noPost:true,noWagerProbe:true,noAutomaticBetting:true,hardcodedPublicTargetsOnly:true,arbitraryUrlInputDisabled:true,configCandidateCannotAuthorizeGreen:true,staticConfigCandidatesBetfairOwnedHostsOnly:true,discoveredConfigUrlsKeywordBounded:true,discoveredConfigHostsAllowlisted:true,foreignHubArchitectureCannotPopulateBetfairState:true,crossDocumentBindingPairingDisabled:true,bindingCandidateRequiresSameBetfairInitialResourcesDocument:true},
  };
}
