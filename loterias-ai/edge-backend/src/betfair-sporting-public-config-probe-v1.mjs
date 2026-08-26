const MAX_TEXT_CHARS=2_000_000;
const MAX_ASSETS=6;
const KEYWORDS=['jackpotsCasino','jackpotsCasinoUrl','initialResources','new_jackpotxml.php','sljp-1','tonymc','guaranteedHitTime','instanceCode'];
const GAME_PAGE_URL='https://casino.betfair.es/juego/ap-mccoy-sporting-legends-cptn';
const LAUNCHER_URL='https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real&returnURL=https%3A%2F%2Fcasino.betfair.es%2Fjuego%2Fap-mccoy-sporting-legends-cptn&switchedToPopup=true';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const unescapeUrl=s=>String(s||'').replace(/\\\//g,'/').replace(/\\u0026/gi,'&');

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
      hits.push({
        key,sourceUrl,
        snippet:clean(body.slice(Math.max(0,i-100),Math.min(body.length,i+key.length+180))).slice(0,360),
      });
      from=i+key.length;
      count++;
    }
  }

  const assignments={};
  for(const key of ['jackpotsCasino','jackpotsCasinoUrl','instanceCode']){
    const re=new RegExp(`(?:["']${key}["']|\\b${key}\\b)\\s*[:=]\\s*["']([^"'<>\\s,;]+)["']`,'i');
    const m=body.match(re);
    if(m)assignments[key]=unescapeUrl(m[1]);
  }

  const urls=[...normalized.matchAll(/https?:\/\/[^\s"'<>]+/gi)]
    .map(m=>m[0].replace(/[),;]+$/,''))
    .filter(u=>/jackpot|ticker|sljp|playtech/i.test(u))
    .slice(0,20);

  return {
    sourceUrl,
    assignments,
    urls:[...new Set(urls)],
    hits,
    sljp1Observed:/\bsljp-1\b/i.test(body),
    tonymcObserved:/\btonymc\b/i.test(body),
    guaranteedHitTimeObserved:/\bguaranteedHitTime\b/i.test(body),
  };
}

function allowedAssetHost(hostname){
  const h=String(hostname||'').toLowerCase();
  return h==='launcher.betfair.es'||h.endsWith('.betfair.es')||h.endsWith('.betfair.com')||h.endsWith('.cdnppb.net')||h.includes('playtech');
}

export function discoverPublicAssetUrls(html,baseUrl){
  const out=[];
  const re=/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  for(const m of String(html||'').matchAll(re)){
    try{
      const u=new URL(unescapeUrl(m[1]),baseUrl);
      if(u.protocol!=='https:'||!allowedAssetHost(u.hostname))continue;
      if(!out.includes(u.href))out.push(u.href);
      if(out.length>=MAX_ASSETS)break;
    }catch{}
  }
  return out;
}

async function fetchPublicText(url){
  try{
    const r=await fetch(url,{
      method:'GET',
      redirect:'follow',
      headers:{
        accept:'text/html,application/javascript,text/javascript,application/json;q=0.9,*/*;q=0.2',
        'accept-language':'es-ES,es;q=0.9,en;q=0.5',
      },
    });
    const raw=await r.text();
    return {
      ok:r.ok,status:r.status,requestedUrl:url,finalUrl:r.url||url,
      contentType:r.headers.get('content-type')||null,
      text:raw.slice(0,MAX_TEXT_CHARS),
      truncated:raw.length>MAX_TEXT_CHARS,
    };
  }catch(e){
    return {ok:false,status:null,requestedUrl:url,finalUrl:null,contentType:null,text:'',truncated:false,error:String(e?.message||e)};
  }
}

function unique(values){return [...new Set(values.filter(Boolean))];}

export async function runBetfairSportingPublicConfigProbe(){
  const observedAt=new Date().toISOString();
  const gamePage=await fetchPublicText(GAME_PAGE_URL);
  const launcher=await fetchPublicText(LAUNCHER_URL);
  const documents=[gamePage,launcher].filter(x=>x.text);

  const assetUrls=unique([
    ...discoverPublicAssetUrls(gamePage.text,gamePage.finalUrl||GAME_PAGE_URL),
    ...discoverPublicAssetUrls(launcher.text,launcher.finalUrl||LAUNCHER_URL),
  ]).slice(0,MAX_ASSETS);
  const assets=[];
  for(const url of assetUrls)assets.push(await fetchPublicText(url));
  documents.push(...assets.filter(x=>x.text));

  const scans=documents.map(x=>extractSportingPublicConfigSignals(x.text,{sourceUrl:x.finalUrl||x.requestedUrl}));
  const jackpotsCasinoCandidates=unique(scans.map(x=>x.assignments.jackpotsCasino));
  const jackpotTickerUrlCandidates=unique(scans.flatMap(x=>[
    x.assignments.jackpotsCasinoUrl,
    ...x.urls,
  ]));
  const instanceCodeCandidates=unique(scans.map(x=>x.assignments.instanceCode));
  const sljp1Sources=unique(scans.filter(x=>x.sljp1Observed).map(x=>x.sourceUrl));
  const tonymcSources=unique(scans.filter(x=>x.tonymcObserved).map(x=>x.sourceUrl));
  const guaranteedHitTimeSources=unique(scans.filter(x=>x.guaranteedHitTimeObserved).map(x=>x.sourceUrl));
  const hits=scans.flatMap(x=>x.hits).slice(0,80);

  return {
    version:'betfair-sporting-public-config-probe-v1',
    observedAt,
    mode:'PUBLIC_PASSIVE_CONFIG_DISCOVERY_NO_PLAY',
    target:{market:'ES',operator:'Betfair Spain',provider:'Playtech',game:'AP McCoy Sporting Legends™',gameId:'ap-mccoy-sporting-legends-cptn'},
    fetches:{
      gamePage:{ok:gamePage.ok,status:gamePage.status,requestedUrl:gamePage.requestedUrl,finalUrl:gamePage.finalUrl,contentType:gamePage.contentType,truncated:gamePage.truncated,error:gamePage.error||null},
      launcher:{ok:launcher.ok,status:launcher.status,requestedUrl:launcher.requestedUrl,finalUrl:launcher.finalUrl,contentType:launcher.contentType,truncated:launcher.truncated,error:launcher.error||null},
      assets:assets.map(x=>({ok:x.ok,status:x.status,requestedUrl:x.requestedUrl,finalUrl:x.finalUrl,contentType:x.contentType,truncated:x.truncated,error:x.error||null})),
    },
    discovery:{
      scannedDocumentCount:scans.length,
      publicAssetCount:assetUrls.length,
      jackpotsCasinoCandidates,
      jackpotTickerUrlCandidates,
      instanceCodeCandidates,
      sljp1Sources,
      tonymcSources,
      guaranteedHitTimeSources,
      hits,
      bindingCandidateObserved:jackpotsCasinoCandidates.length>0&&jackpotTickerUrlCandidates.length>0,
      exactBetfairSpainTickerImsBindingVerified:false,
      currentSljp1RowRecovered:false,
      currentDailyAmountExactVerified:false,
      currentGuaranteedHitTimeExactVerified:false,
    },
    scientificUse:'Public passive discovery only. Any candidate must be independently validated against the exact Betfair Spain sljp-1 EUR local=0 row before it may enter the overdue GREEN route.',
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{
      onlineOnly:true,nonPromoOnly:true,noLoginProbe:true,noCookies:true,noCredentials:true,noPost:true,noWagerProbe:true,noAutomaticBetting:true,
      hardcodedPublicTargetsOnly:true,arbitraryUrlInputDisabled:true,configCandidateCannotAuthorizeGreen:true,
    },
  };
}
